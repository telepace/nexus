import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint

from app.api.middlewares.response import ApiResponseMiddleware
from app.utils.response import ApiResponse


@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    request.url = MagicMock()
    request.method = "GET"
    request.state = MagicMock()
    request.state.user = None # Default to no user
    return request

@pytest.fixture
def mock_call_next():
    return AsyncMock(spec=RequestResponseEndpoint)

@pytest.mark.asyncio
async def test_api_response_middleware_success_json_response(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/test"
    original_content = {"key": "value"}
    original_response = JSONResponse(content=original_content, status_code=200, headers={"X-Test": "TestValue"})
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    mock_call_next.assert_called_once_with(mock_request)
    assert isinstance(response, JSONResponse)
    assert response.status_code == 200
    assert response.headers["X-Test"] == "TestValue"

    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=original_content, meta={}, error=None).model_dump()
    assert response_body == expected_api_response

@pytest.mark.asyncio
async def test_api_response_middleware_error_json_response_with_detail(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/error"
    original_content = {"detail": "Something went wrong"}
    original_response = JSONResponse(content=original_content, status_code=400)
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert isinstance(response, JSONResponse)
    assert response.status_code == 400
    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=None, meta={}, error="Something went wrong").model_dump()
    assert response_body == expected_api_response

@pytest.mark.asyncio
async def test_api_response_middleware_error_json_response_no_detail(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/error"
    original_content = {"error_key": "Some error"}
    original_response = JSONResponse(content=original_content, status_code=500)
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert isinstance(response, JSONResponse)
    assert response.status_code == 500
    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=None, meta={}, error=str(original_content)).model_dump()
    assert response_body == expected_api_response


@pytest.mark.asyncio
async def test_api_response_middleware_non_json_response(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/test"
    original_response = Response(content="Not JSON", status_code=200)
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert response == original_response # Should return original response unchanged

@pytest.mark.asyncio
async def test_api_response_middleware_non_api_path(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/non-api/test" # Not an API path
    original_content = {"key": "value"}
    original_response = JSONResponse(content=original_content, status_code=200)
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert response == original_response # Should return original response unchanged


@pytest.mark.asyncio
async def test_api_response_middleware_already_formatted_response(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/test"
    original_content = ApiResponse[Any](data={"key": "value"}, meta={}, error=None).model_dump()
    original_response = JSONResponse(content=original_content, status_code=200)
    mock_call_next.return_value = original_response

    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert response == original_response # Should return original response unchanged

@pytest.mark.asyncio
async def test_api_response_middleware_bytes_body_success(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/bytes"
    original_data = {"message": "hello from bytes"}
    bytes_content = json.dumps(original_data).encode('utf-8')

    # For JSONResponse, content should be a serializable type, not bytes directly.
    # The middleware handles when response.body is bytes (which happens after render)
    # So we mock the response.body attribute after call_next
    async def call_next_effect(request):
        # Simulate what Starlette/FastAPI does: JSONResponse will have its body rendered to bytes.
        resp = JSONResponse(content=original_data, status_code=201)
        # To simulate the state where middleware receives it, its body would have been rendered
        # We need to mock this internal state of the response object
        resp.body = bytes_content # Simulate rendered body
        resp.headers['content-length'] = str(len(bytes_content)) # FastAPI/Starlette would set this
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert isinstance(response, JSONResponse)
    assert response.status_code == 201
    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=original_data, meta={}, error=None).model_dump()
    assert response_body == expected_api_response

@pytest.mark.asyncio
async def test_api_response_middleware_memoryview_body_success(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/memoryview"
    original_data = {"message": "hello from memoryview"}
    bytes_content = json.dumps(original_data).encode('utf-8')
    memoryview_content = memoryview(bytes_content)

    async def call_next_effect(request):
        resp = JSONResponse(content=original_data, status_code=202)
        resp.body = memoryview_content # Simulate rendered body as memoryview
        resp.headers['content-length'] = str(len(memoryview_content))
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert isinstance(response, JSONResponse)
    assert response.status_code == 202
    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=original_data, meta={}, error=None).model_dump()
    assert response_body == expected_api_response

@pytest.mark.asyncio
async def test_api_response_middleware_bytes_body_decode_error(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/bytes_error"
    # Non-JSON bytes
    bytes_content = b"\x80\xbd\xc3\x28" # invalid utf-8

    async def call_next_effect(request):
        # This is tricky. JSONResponse expects serializable content.
        # The middleware checks `isinstance(response, JSONResponse)` first.
        # Then it tries to decode `response.body`.
        # We need to construct a JSONResponse but then replace its body with invalid bytes.
        resp = JSONResponse(content={}, status_code=200) # Dummy content
        resp.body = bytes_content # Simulate rendered body as invalid bytes
        resp.headers['content-length'] = str(len(bytes_content))
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    # Should return the original response because decoding fails
    assert response.body == bytes_content
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_api_response_middleware_memoryview_body_decode_error(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/memoryview_error"
    bytes_content = b"\xfa\xfb\xfc" # invalid utf-8
    memoryview_content = memoryview(bytes_content)

    async def call_next_effect(request):
        resp = JSONResponse(content={}, status_code=200)
        resp.body = memoryview_content
        resp.headers['content-length'] = str(len(memoryview_content))
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert response.body == memoryview_content
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_api_response_middleware_error_json_response_string_content(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/error_string"
    original_content = "Just a string error" # Simulate an error that's just a string

    async def call_next_effect(request):
        # To simulate this, the JSONResponse content would be a string
        resp = JSONResponse(content=original_content, status_code=403)
        # The body would be the JSON representation of that string
        resp.body = json.dumps(original_content).encode('utf-8')
        resp.headers['content-length'] = str(len(resp.body))
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    assert isinstance(response, JSONResponse)
    assert response.status_code == 403
    response_body = json.loads(response.body.decode())
    expected_api_response = ApiResponse[Any](data=None, meta={}, error=original_content).model_dump()
    assert response_body == expected_api_response

@pytest.mark.asyncio
async def test_api_response_middleware_non_decodable_body_type(
    mock_request, mock_call_next
):
    # Arrange
    mock_request.url.path = "/api/v1/other_type"

    class NonDecodable:
        pass

    async def call_next_effect(request):
        resp = JSONResponse(content={}, status_code=200) # Dummy
        resp.body = NonDecodable() # Simulate a body type that isn't bytes or memoryview
        return resp

    mock_call_next.side_effect = call_next_effect
    middleware = ApiResponseMiddleware(app=AsyncMock())

    # Act
    response = await middleware.dispatch(mock_request, mock_call_next)

    # Assert
    # Should return the original response because the body type is not handled for decoding
    assert isinstance(response.body, NonDecodable)
    assert response.status_code == 200

# Helper for Any type in ApiResponse
from typing import Any
