import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.llm_service import router as llm_router

# Schemas are not strictly needed for requests if using dicts, but good for reference
# from app.schemas.llm import CompletionRequest, LLMMessage, EmbeddingRequest
from app.core.config import settings
from app.tests.utils.utils import get_error_detail

# Override LITELLM_PROXY_URL for tests if necessary, though patching client is primary
# For example: settings.LITELLM_PROXY_URL = "http://mock-litellm:4000"

# Create a minimal FastAPI app for testing this router
app = FastAPI()
app.include_router(llm_router, prefix="/llm")

client = TestClient(app)

# --- Test /completions (non-streaming) ---


def test_create_completion_successful():
    mock_response_data = {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "gpt-3.5-turbo",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Hello there!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21},
    }

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json = MagicMock(return_value=mock_response_data)
        mock_response.text = json.dumps(mock_response_data)
        mock_response.raise_for_status = (
            MagicMock()
        )  # Ensure this doesn't raise for 200

        mock_async_client_instance.request = AsyncMock(return_value=mock_response)

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == 200
        json_response = response.json()
        assert json_response["id"] == mock_response_data["id"]
        assert json_response["choices"][0]["message"]["content"] == "Hello there!"
        mock_async_client_instance.request.assert_called_once()
        called_args, called_kwargs = mock_async_client_instance.request.call_args
        # The first positional argument should be the method, second should be the URL
        assert called_args[0] == "POST"  # method
        # Check that the URL contains the expected components (allowing for double slash issue)
        expected_url = f"{str(settings.LITELLM_PROXY_URL).rstrip('/')}/v1/chat/completions"
        assert called_args[1] == expected_url  # url
        assert called_kwargs["json"]["model"] == "gpt-3.5-turbo"


def test_create_completion_different_model():
    mock_response_data = {
        "id": "chatcmpl-456",
        "object": "chat.completion",
        "created": 1677652289,
        "model": "claude-2",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "Hi from Claude!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
    }
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_client_instance = mock_async_client.return_value.__aenter__.return_value
        mock_response = MagicMock(
            status_code=200,
            json=lambda: mock_response_data,
            text=json.dumps(mock_response_data),
        )
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.request = AsyncMock(return_value=mock_response)

        request_payload = {
            "model": "claude-2",
            "messages": [{"role": "user", "content": "Ping"}],
        }
        response = client.post("/llm/completions", json=request_payload)
        assert response.status_code == 200
        assert response.json()["model"] == "claude-2"
        assert response.json()["choices"][0]["message"]["content"] == "Hi from Claude!"
        mock_client_instance.request.assert_called_once()
        _, called_kwargs = mock_client_instance.request.call_args
        assert called_kwargs["json"]["model"] == "claude-2"


def test_create_completion_with_api_key():
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_client_instance = mock_async_client.return_value.__aenter__.return_value
        # Provide complete response data for validation
        complete_response_data = {
            "id": "res1",
            "object": "chat.completion",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello there!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21},
        }
        mock_response = MagicMock(
            status_code=200,
            json=lambda: complete_response_data,
            text=json.dumps(complete_response_data),
        )
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.request = AsyncMock(return_value=mock_response)

        api_key_to_test = "test-key-123"
        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
            "api_key": api_key_to_test,
        }
        response = client.post("/llm/completions", json=request_payload)
        assert response.status_code == 200
        mock_client_instance.request.assert_called_once()
        _, called_kwargs = mock_client_instance.request.call_args
        assert called_kwargs["headers"]["Authorization"] == f"Bearer {api_key_to_test}"


def test_create_completion_litellm_http_error():
    error_detail = "LiteLLM API error"
    error_status_code = 401  # Unauthorized for example

    mock_error_response = MagicMock(spec=httpx.Response)
    mock_error_response.status_code = error_status_code
    mock_error_response.json = MagicMock(
        return_value={"error": {"message": error_detail}}
    )
    mock_error_response.text = json.dumps({"error": {"message": error_detail}})
    mock_error_response.request = MagicMock()  # Needed for HTTPStatusError

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                message="Client Error",
                request=mock_error_response.request,
                response=mock_error_response,
            )
        )

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == error_status_code
        error_detail_response = get_error_detail(response.json())
        assert error_detail in error_detail_response


def test_create_completion_network_error():
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.RequestError("Network issue", request=MagicMock())
        )

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == 503  # Service Unavailable
        error_detail_response = get_error_detail(response.json())
        assert "Error connecting to LLM service: Network issue" in error_detail_response


# --- Test /completions (streaming) ---


@pytest.mark.asyncio
async def test_create_completion_streaming_successful():
    sse_chunks_data = [
        {
            "id": "chatcmpl-123",
            "object": "chat.completion.chunk",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "choices": [
                {"delta": {"role": "assistant"}, "index": 0, "finish_reason": None}
            ],
        },
        {
            "id": "chatcmpl-123",
            "object": "chat.completion.chunk",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "choices": [
                {"delta": {"content": "Hello"}, "index": 0, "finish_reason": None}
            ],
        },
        {
            "id": "chatcmpl-123",
            "object": "chat.completion.chunk",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "choices": [
                {"delta": {"content": " there!"}, "index": 0, "finish_reason": "stop"}
            ],
        },
    ]
    # SSE formatted chunks as bytes, assuming LiteLLM sends them this way
    sse_byte_chunks = [
        f"data: {json.dumps(chunk)}\n\n".encode() for chunk in sse_chunks_data
    ]
    sse_byte_chunks.append(b"data: [DONE]\n\n")

    mock_stream_response = MagicMock(spec=httpx.Response)
    mock_stream_response.status_code = 200
    mock_stream_response.headers = {"content-type": "text/event-stream"}
    mock_stream_response.raise_for_status = MagicMock()  # Important for the happy path
    mock_stream_response.aclose = AsyncMock()
    mock_stream_response.is_closed = False

    async def async_bytes_generator():
        for chunk in sse_byte_chunks:
            yield chunk

    mock_stream_response.aiter_bytes = lambda chunk_size=None: async_bytes_generator()

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.build_request = MagicMock()
        mock_async_client_instance.send = AsyncMock(return_value=mock_stream_response)

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello stream"}],
            "stream": True,
        }

        # Use the test client instead of real httpx.AsyncClient to avoid mock conflicts
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")

        content_parts = []
        raw_content = ""
        # For streaming response, we need to iterate over the content
        for line in response.iter_lines():
            raw_content += line + "\n"  # For debugging
            if line.startswith("data:"):
                data_content = line[len("data:") :].strip()
                if data_content != "[DONE]":
                    try:
                        json_data = json.loads(data_content)
                        if json_data["choices"][0]["delta"].get("content"):
                            content_parts.append(
                                json_data["choices"][0]["delta"]["content"]
                            )
                    except json.JSONDecodeError:
                        pytest.fail(
                            f"Failed to decode JSON from stream: {data_content}"
                        )

        full_response_content = "".join(content_parts)
        assert full_response_content == "Hello there!"
        mock_async_client_instance.send.assert_called_once()


@pytest.mark.asyncio
async def test_create_completion_streaming_litellm_error_before_stream():
    error_detail = "LiteLLM stream init error"
    error_status_code = 401  # Unauthorized for example

    mock_error_response = MagicMock(spec=httpx.Response)
    mock_error_response.status_code = error_status_code
    mock_error_response.json = MagicMock(
        return_value={"error": {"message": error_detail}}
    )
    mock_error_response.text = json.dumps({"error": {"message": error_detail}})
    mock_error_response.request = MagicMock()  # Needed for HTTPStatusError
    # This raise_for_status will be called by _forward_request_to_litellm
    mock_error_response.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError(
            message="Client Error",
            request=mock_error_response.request,
            response=mock_error_response,
        )
    )
    mock_error_response.aclose = AsyncMock()  # Ensure aclose is available

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.build_request = MagicMock()
        # .send() is called for streaming, it returns the response object that then has raise_for_status() called on it
        mock_async_client_instance.send = AsyncMock(return_value=mock_error_response)

        request_payload = {
            "model": "gpt-x",
            "messages": [{"role": "user", "content": "Test"}],
            "stream": True,
        }

        # Use the test client instead of real httpx.AsyncClient
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == error_status_code
        response_json = response.json()
        error_detail_response = get_error_detail(response_json)
        assert error_detail in error_detail_response


@pytest.mark.asyncio
async def test_create_completion_streaming_network_error_before_stream():
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.build_request = MagicMock()
        mock_async_client_instance.send = AsyncMock(
            side_effect=httpx.RequestError(
                "Stream connection failed", request=MagicMock()
            )
        )

        request_payload = {
            "model": "gpt-x",
            "messages": [{"role": "user", "content": "Test"}],
            "stream": True,
        }

        # Use the test client instead of real httpx.AsyncClient
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == 503
        error_detail_response = get_error_detail(response.json())
        assert (
            "Error connecting to LLM service: Stream connection failed"
            in error_detail_response
        )


# Note: Testing error *during* an established stream is more complex.
# It would involve the `aiter_bytes` itself raising an exception or yielding malformed data.
# The current implementation's `event_generator` might pass through some errors or stop.
# For simplicity, focusing on errors before the stream fully establishes or network errors.
# A robust test for "error during stream" would require `aiter_bytes` to yield some valid chunks,
# then an error chunk or raise an exception. The client-side handling would then be key.
# The current server code's `event_generator` would yield whatever `response_stream.aiter_bytes()` gives.
# If `aiter_bytes` itself raises `httpx.StreamError`, that exception would propagate and
# should be caught by the `try...except Exception as e:` in the endpoint, returning a 500.

# --- Test /embeddings ---


def test_create_embedding_successful():
    mock_response_data = {
        "object": "list",
        "data": [{"object": "embedding", "embedding": [0.1, 0.2, 0.3], "index": 0}],
        "model": "text-embedding-ada-002",
        "usage": {"prompt_tokens": 8, "total_tokens": 8},
    }

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json = MagicMock(return_value=mock_response_data)
        mock_response.text = json.dumps(mock_response_data)
        mock_response.raise_for_status = MagicMock()

        mock_async_client_instance.request = AsyncMock(return_value=mock_response)

        request_payload = {"input": "Test string", "model": "text-embedding-ada-002"}
        response = client.post("/llm/embeddings", json=request_payload)

        assert response.status_code == 200
        json_response = response.json()
        assert json_response["data"][0]["embedding"] == [0.1, 0.2, 0.3]
        mock_async_client_instance.request.assert_called_once()
        called_args, called_kwargs = mock_async_client_instance.request.call_args
        # Check positional arguments for method and URL
        assert called_args[0] == "POST"  # method
        expected_url = f"{str(settings.LITELLM_PROXY_URL).rstrip('/')}/embeddings"
        assert called_args[1] == expected_url  # url


def test_create_embedding_with_api_key():
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_client_instance = mock_async_client.return_value.__aenter__.return_value
        # Provide complete response data for validation
        complete_response_data = {
            "object": "list",
            "data": [{"object": "embedding", "embedding": [0.1, 0.2, 0.3], "index": 0}],
            "model": "text-embedding-ada-002",
            "usage": {"prompt_tokens": 8, "total_tokens": 8},
        }
        mock_response = MagicMock(
            status_code=200,
            json=lambda: complete_response_data,
            text=json.dumps(complete_response_data),
        )
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.request = AsyncMock(return_value=mock_response)

        api_key_to_test = "emb-key-456"
        request_payload = {
            "input": "Test string",
            "model": "text-embedding-ada-002",
            "api_key": api_key_to_test,
        }
        response = client.post("/llm/embeddings", json=request_payload)
        assert response.status_code == 200
        mock_client_instance.request.assert_called_once()
        _, called_kwargs = mock_client_instance.request.call_args
        assert called_kwargs["headers"]["Authorization"] == f"Bearer {api_key_to_test}"


def test_create_embedding_litellm_http_error():
    error_detail = "LiteLLM embedding error"
    error_status_code = 400

    mock_error_response = MagicMock(spec=httpx.Response)
    mock_error_response.status_code = error_status_code
    mock_error_response.json = MagicMock(
        return_value={"error": {"message": error_detail}}
    )
    mock_error_response.text = json.dumps({"error": {"message": error_detail}})
    mock_error_response.request = MagicMock()

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                message="Client Error",
                request=mock_error_response.request,
                response=mock_error_response,
            )
        )

        request_payload = {"input": "Test string", "model": "text-embedding-ada-002"}
        response = client.post("/llm/embeddings", json=request_payload)

        assert response.status_code == error_status_code
        error_detail_response = get_error_detail(response.json())
        assert error_detail in error_detail_response


def test_create_embedding_network_error():
    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.RequestError(
                "Embedding network issue", request=MagicMock()
            )
        )

        request_payload = {"input": "Test string", "model": "text-embedding-ada-002"}
        response = client.post("/llm/embeddings", json=request_payload)

        assert response.status_code == 503
        error_detail_response = get_error_detail(response.json())
        assert (
            "Error connecting to LLM service: Embedding network issue"
            in error_detail_response
        )


# Ensure settings.LITELLM_PROXY_URL is used if not None
def test_litellm_proxy_url_is_used():
    # This test implicitly checks that settings.LITELLM_PROXY_URL (which has a default) is used.
    # No need to change settings.LITELLM_PROXY_URL if the default is "http://litellm:4000"
    # as the assertions in successful calls check the formation of the URL.
    # If we wanted to test a *different* URL, we could patch settings:
    # with patch('app.core.config.settings.LITELLM_PROXY_URL', "http://custom-litellm-url:1234"):
    #    ... then run a standard successful call test ...
    #    assert called_kwargs["url"] == "http://custom-litellm-url:1234/chat/completions"
    assert settings.LITELLM_PROXY_URL is not None
    # The actual check is done in test_create_completion_successful and test_create_embedding_successful
    # by asserting the `called_kwargs["url"]`
    pass


# Example of testing LiteLLM returning a different style of error (not OpenAI's {"error": {"message": ...}})
def test_create_completion_litellm_error_non_openai_format():
    """Test handling of LiteLLM errors that don't follow OpenAI format"""
    error_detail_text = "Custom LiteLLM error format"
    error_status_code = 422

    mock_error_response = MagicMock(spec=httpx.Response)
    mock_error_response.status_code = error_status_code
    mock_error_response.json = MagicMock(
        return_value={"message": error_detail_text}
    )  # Non-OpenAI format
    mock_error_response.text = json.dumps({"message": error_detail_text})
    mock_error_response.request = MagicMock()

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                message="Unprocessable Entity",
                request=mock_error_response.request,
                response=mock_error_response,
            )
        )

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == error_status_code
        error_detail_response = get_error_detail(response.json())
        assert error_detail_text in error_detail_response


def test_create_completion_litellm_error_with_fastapi_like_detail():
    """Test handling of LiteLLM errors that use FastAPI-like 'detail' field"""
    error_detail_text = "FastAPI-style error detail"
    error_status_code = 400

    mock_error_response = MagicMock(spec=httpx.Response)
    mock_error_response.status_code = error_status_code
    mock_error_response.json = MagicMock(
        return_value={"detail": error_detail_text}
    )  # FastAPI-like format
    mock_error_response.text = json.dumps({"detail": error_detail_text})
    mock_error_response.request = MagicMock()

    with patch("app.api.routes.llm_service.httpx.AsyncClient") as mock_async_client:
        mock_async_client_instance = (
            mock_async_client.return_value.__aenter__.return_value
        )
        mock_async_client_instance.request = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                message="Bad Request",
                request=mock_error_response.request,
                response=mock_error_response,
            )
        )

        request_payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello"}],
        }
        response = client.post("/llm/completions", json=request_payload)

        assert response.status_code == error_status_code
        error_detail_response = get_error_detail(response.json())
        assert error_detail_text in error_detail_response
