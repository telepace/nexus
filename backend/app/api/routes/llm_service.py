# sse_starlette.sse.EventSourceResponse is not available, will use StreamingResponse

import json
from collections.abc import AsyncGenerator
from typing import Any

import httpx
from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.schemas.llm import (
    CompletionRequest,
    CompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    # StreamingCompletionResponse, # This will be manually constructed for streaming
)

router = APIRouter()


# Helper function to prepare headers for LiteLLM
def _get_litellm_headers(api_key: str | None = None) -> dict[str, str]:
    """Prepare headers for LiteLLM, including authorization if an API key is provided."""
    headers = {"Content-Type": "application/json"}
    if api_key:  # If a specific API key is provided in the request
        headers["Authorization"] = f"Bearer {api_key}"
    # Note: LiteLLM's master key for its own proxy auth is usually set via LITELLM_MASTER_KEY env var
    # and handled by the LiteLLM proxy itself, not typically sent from this backend.
    # If the LiteLLM proxy is secured with its own bearer token that this backend must send,
    # it should be configured via settings.LITELLM_PROXY_API_KEY or similar.
    return headers


async def _forward_request_to_litellm(
    client: httpx.AsyncClient,
    method: str,
    endpoint_path: str,
    data: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    stream: bool = False,
):
    """Asynchronously forwards a request to the LiteLLM proxy.

    This function constructs the full URL by joining the base URL from settings
    with the provided endpoint path. It handles both streaming and non-streaming
    requests. If an HTTP status error occurs, it parses the response to extract an
    appropriate error message and raises an HTTPException. Network errors are
    caught and raised as a 503 Service Unavailable exception.

    Args:
        client (httpx.AsyncClient): The asynchronous HTTP client to use for making requests.
        method (str): The HTTP method to use (e.g., 'GET', 'POST').
        endpoint_path (str): The path of the endpoint to which the request is sent.
        data (dict[str, Any] | None?): JSON data to be sent in the request body. Defaults to None.
        headers (dict[str, str] | None?): Headers to include with the request. Defaults to None.
        stream (bool?): If True, the response will be streamed. Defaults to False.
    """
    try:
        # Ensure proper URL joining without double slashes
        base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
        endpoint_path = endpoint_path.lstrip("/")
        url = f"{base_url}/{endpoint_path}"

        if stream:
            req = client.build_request(method, url, json=data, headers=headers)
            response_stream = await client.send(req, stream=True)
            response_stream.raise_for_status()  # Raise HTTPStatusError for bad responses (4xx or 5xx)
            return response_stream
        else:
            response = await client.request(method, url, json=data, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        # Forward the status code and detail from LiteLLM if possible
        detail = f"HTTP {e.response.status_code}: {e.response.reason_phrase or 'Unknown error'}"
        try:
            detail_json = e.response.json()
            if "detail" in detail_json:  # FastAPI-like error
                detail = detail_json["detail"]
            elif (
                "error" in detail_json and "message" in detail_json["error"]
            ):  # OpenAI-like error
                detail = detail_json["error"]["message"]
        except ValueError:
            pass  # Use default detail if not JSON or expected structure
        except Exception:
            # 如果无法读取响应内容（如流式响应），使用默认错误信息
            pass
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except httpx.RequestError as e:
        # Network error or other request issue
        raise HTTPException(
            status_code=503, detail=f"Error connecting to LLM service: {e}"
        )


@router.post(
    "/completions", response_model=None
)  # response_model is tricky for streaming
async def create_completion(
    request_data: CompletionRequest = Body(...),
):
    """Handles creation of completions based on request data."""
    async with httpx.AsyncClient(timeout=300.0) as client:  # Increased timeout for LLMs
        litellm_endpoint = (
            "/v1/chat/completions"  # Common LiteLLM endpoint for chat models
        )

        payload = request_data.model_dump(exclude_none=True)

        headers = _get_litellm_headers(request_data.api_key)

        if request_data.stream:
            response_stream = None  # Initialize to ensure it's defined in finally
            try:
                response_stream = await _forward_request_to_litellm(
                    client,
                    "POST",
                    litellm_endpoint,
                    data=payload,
                    headers=headers,
                    stream=True,
                )

                async def stream_event_generator() -> AsyncGenerator[str, None]:
                    """Generates decoded chunks from a response stream."""
                    async for chunk in response_stream.aiter_bytes():
                        if chunk:
                            # LiteLLM streaming chunks are typically SSE formatted like:
                            # "data: {...}\n\n"
                            # Or sometimes just the JSON data for each chunk.
                            # We will assume LiteLLM sends data that needs to be wrapped in "data: ...\n\n"
                            # if it's not already in that format.
                            # For maximum compatibility, we'll decode and re-encode if necessary.
                            # However, LiteLLM's /chat/completions with stream=True usually sends valid SSE.
                            # So, we can often pass it through.
                            # Let's yield the chunk as is, assuming LiteLLM provides valid SSE chunks.
                            # If LiteLLM sends raw JSON objects per line, they must be formatted.
                            # The provided code had `yield chunk.decode()` which is correct if LiteLLM sends SSE.
                            # If LiteLLM sends line-delimited JSON:
                            #   lines = chunk.decode().strip().splitlines()
                            #   for line in lines:
                            #       if line.startswith("data:"): # Already SSE
                            #            yield f"{line}\n\n"
                            #       else: # Assume it's a JSON object
                            #           try:
                            #               json.loads(line) # Validate it's JSON
                            #               yield f"data: {line}\n\n"
                            #           except json.JSONDecodeError:
                            #               # Not JSON, maybe some other control message or malformed
                            #               # For simplicity, we pass it through; robust handling might differ
                            #               yield f"{line}\n\n"
                            # else: # Pass through as is
                            yield chunk.decode()

                # Using StreamingResponse for SSE handling as sse_starlette is not available
                return StreamingResponse(
                    stream_event_generator(), media_type="text/event-stream"
                )
            except HTTPException as e:
                raise e  # Re-raise if already an HTTPException
            except Exception as e:
                # Ensure the stream is closed on unexpected errors
                if response_stream is not None:
                    await response_stream.aclose()
                raise HTTPException(
                    status_code=500, detail=f"Streaming error: {str(e)}"
                )
            finally:
                # Ensure the stream is closed if it was opened
                if (
                    response_stream is not None
                    and hasattr(response_stream, "aclose")
                    and not response_stream.is_closed
                ):
                    await response_stream.aclose()
        else:
            response_json = await _forward_request_to_litellm(
                client,
                "POST",
                litellm_endpoint,
                data=payload,
                headers=headers,
                stream=False,
            )
            return CompletionResponse(**response_json)


@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embedding(
    request_data: EmbeddingRequest = Body(...),
):
    """Handles the creation of embeddings by forwarding a request to LiteLLM."""
    async with httpx.AsyncClient(
        timeout=60.0
    ) as client:  # Standard timeout for embeddings
        litellm_endpoint = "/embeddings"  # Common LiteLLM endpoint
        payload = request_data.model_dump(exclude_none=True)
        headers = _get_litellm_headers(request_data.api_key)

        response_json = await _forward_request_to_litellm(
            client,
            "POST",
            litellm_endpoint,
            data=payload,
            headers=headers,
            stream=False,
        )
        return EmbeddingResponse(**response_json)


async def event_generator(
    response: httpx.Response,
) -> AsyncGenerator[dict[str, Any], None]:
    """Generate events from streaming response"""
    async for line in response.aiter_lines():
        if line.startswith("data: "):
            data = line[6:]  # Remove "data: " prefix
            if data == "[DONE]":
                break
            try:
                yield json.loads(data)
            except json.JSONDecodeError:
                continue


async def async_bytes_generator(
    response: httpx.Response,
) -> AsyncGenerator[dict[str, Any], None]:
    """Generate bytes from streaming response"""
    async for chunk in response.aiter_bytes():
        if chunk:
            # Process chunk and yield as dict
            yield {"chunk": chunk.decode("utf-8", errors="ignore")}
