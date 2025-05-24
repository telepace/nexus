import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request, Response
from starlette.middleware.base import RequestResponseEndpoint

from app.api.middlewares.posthog import PostHogMiddleware

# from app.core.config import settings # Will mock it where used


@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    request.url = MagicMock()
    request.state = MagicMock() # Create a general MagicMock for state first
    request.state.user = None # Explicitly set user to None by default for most tests
    request.method = "GET"
    return request

@pytest.fixture
def mock_call_next():
    return AsyncMock(spec=RequestResponseEndpoint)

@pytest.fixture
def mock_posthog_tracker():
    with patch("app.api.middlewares.posthog.PostHogTracker") as mock_tracker:
        yield mock_tracker

@pytest.mark.asyncio
async def test_posthog_middleware_api_request_posthog_enabled_with_user(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = True
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/api/v1/test"

        user_mock = MagicMock()
        user_mock.id = "test_user_id"
        mock_request.state.user = user_mock # Set user for this specific test

        response_mock = MagicMock(spec=Response)
        response_mock.status_code = 200
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        start_time = time.time()
        with patch("time.time", side_effect=[start_time, start_time + 0.1]):
            # Act
            await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_call_next.assert_called_once_with(mock_request)
        mock_posthog_tracker.capture_event.assert_called_once_with(
            event_name="api_request",
            user_id="test_user_id",
            properties={
                "path": "/api/v1/test",
                "method": "GET",
                "status_code": 200,
                "duration_ms": pytest.approx(100, abs=10),
            },
        )

@pytest.mark.asyncio
async def test_posthog_middleware_api_request_posthog_enabled_anonymous_user(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = True
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/api/v1/test"
        # mock_request.state.user is already None from fixture

        response_mock = MagicMock(spec=Response)
        response_mock.status_code = 200
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        start_time = time.time()
        with patch("time.time", side_effect=[start_time, start_time + 0.2]):
            # Act
            await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_call_next.assert_called_once_with(mock_request)
        mock_posthog_tracker.capture_event.assert_called_once_with(
            event_name="api_request",
            user_id="anonymous",
            properties={
                "path": "/api/v1/test",
                "method": "GET",
                "status_code": 200,
                "duration_ms": pytest.approx(200, abs=10),
            },
        )

@pytest.mark.asyncio
async def test_posthog_middleware_non_api_request_posthog_enabled(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = True
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/non_api/test"

        response_mock = MagicMock(spec=Response)
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        # Act
        await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_call_next.assert_called_once_with(mock_request)
        mock_posthog_tracker.capture_event.assert_not_called()

@pytest.mark.asyncio
async def test_posthog_middleware_api_request_posthog_disabled(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = False
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/api/v1/test"

        response_mock = MagicMock(spec=Response)
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        # Act
        await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_call_next.assert_called_once_with(mock_request)
        mock_posthog_tracker.capture_event.assert_not_called()

@pytest.mark.asyncio
async def test_posthog_middleware_user_id_extraction_no_user_id_attr(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = True
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/api/v1/test"

        user_mock = MagicMock(spec=object) # Use a spec that doesn't have 'id' by default
        # Ensure 'id' is not present
        if hasattr(user_mock, 'id'):
            del user_mock.id
        mock_request.state.user = user_mock


        response_mock = MagicMock(spec=Response)
        response_mock.status_code = 200
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        start_time = time.time()
        with patch("time.time", side_effect=[start_time, start_time + 0.1]):
            # Act
            await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_posthog_tracker.capture_event.assert_called_once_with(
            event_name="api_request",
            user_id="anonymous",
            properties={
                "path": "/api/v1/test",
                "method": "GET",
                "status_code": 200,
                "duration_ms": pytest.approx(100, abs=10),
            },
        )

@pytest.mark.asyncio
async def test_posthog_middleware_user_id_extraction_exception(
    mock_request, mock_call_next, mock_posthog_tracker
):
    # Arrange
    with patch("app.api.middlewares.posthog.settings") as mock_settings:
        mock_settings.posthog_enabled = True
        mock_settings.API_V1_STR = "/api/v1"
        mock_request.url.path = "/api/v1/test"

        # Configure request.state to raise an exception when .user is accessed
        # This is a bit tricky; we need to mock the 'state' object itself
        # to control how 'user' is accessed from it.
        class StateUserExceptionMock:
            @property
            def user(self):
                raise Exception("Test Exception accessing user")

        mock_request.state = StateUserExceptionMock()


        response_mock = MagicMock(spec=Response)
        response_mock.status_code = 200
        mock_call_next.return_value = response_mock

        middleware = PostHogMiddleware(app=AsyncMock())

        start_time = time.time()
        with patch("time.time", side_effect=[start_time, start_time + 0.1]):
            # Act
            await middleware.dispatch(mock_request, mock_call_next)

        # Assert
        mock_posthog_tracker.capture_event.assert_called_once_with(
            event_name="api_request",
            user_id="anonymous",
            properties={
                "path": "/api/v1/test",
                "method": "GET",
                "status_code": 200,
                "duration_ms": pytest.approx(100, abs=10),
            },
        )
