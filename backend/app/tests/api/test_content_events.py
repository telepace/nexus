import asyncio
import json
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
import threading
import time

from app.core.config import settings
from app.utils.events import content_event_manager


def test_sse_endpoint_requires_authentication(client: TestClient) -> None:
    """Test that SSE endpoint requires authentication."""
    response = client.get(f"{settings.API_V1_STR}/content/events")
    assert response.status_code == 401


def test_sse_endpoint_with_invalid_token(client: TestClient) -> None:
    """Test SSE endpoint with invalid token."""
    response = client.get(
        f"{settings.API_V1_STR}/content/events",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 403


def test_sse_endpoint_with_valid_authentication(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that SSE endpoint works with valid authentication."""
    # Test with timeout to avoid hanging
    def test_sse_connection():
        try:
            with client.stream(
                "GET",
                f"{settings.API_V1_STR}/content/events",
                headers=superuser_token_headers
            ) as response:
                assert response.status_code == 200
                assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
                
                # Read first event (connection established) with timeout
                line_iter = response.iter_lines()
                data_line = next(line_iter)
                
                # Should be in SSE format: "data: {...}"
                assert data_line.startswith("data: ")
                event_data = json.loads(data_line[6:])  # Remove "data: " prefix
                assert event_data["type"] == "connection_established"
                return True
        except Exception as e:
            print(f"SSE test error: {e}")
            return False
    
    # Run test with timeout
    result = [False]
    def run_test():
        result[0] = test_sse_connection()
    
    thread = threading.Thread(target=run_test)
    thread.start()
    thread.join(timeout=5.0)  # 5 second timeout
    
    assert result[0], "SSE endpoint test failed or timed out"


@pytest.mark.asyncio
async def test_content_event_manager_add_remove_connection():
    """Test ContentEventManager connection management."""
    manager = content_event_manager
    user_id = "test_user_123"
    
    # Add connection
    queue = await manager.add_connection(user_id)
    assert user_id in manager._connections
    assert len(manager._connections[user_id]) == 1
    
    # Remove connection
    await manager.remove_connection(user_id, queue)
    assert user_id not in manager._connections


@pytest.mark.asyncio
async def test_content_event_manager_broadcast():
    """Test ContentEventManager broadcasting to user."""
    manager = content_event_manager
    user_id = "test_user_456"
    
    # Add connection
    queue = await manager.add_connection(user_id)
    
    # Broadcast event
    event_data = {
        "type": "content_status_update",
        "content_id": "test_content_123",
        "status": "completed",
        "title": "Test Content"
    }
    
    await manager.broadcast_to_user(user_id, event_data)
    
    # Check that event was received
    received_event = await asyncio.wait_for(queue.get(), timeout=1.0)
    assert received_event["type"] == "content_status_update"
    assert received_event["content_id"] == "test_content_123"
    assert received_event["status"] == "completed"
    assert "id" in received_event
    assert "timestamp" in received_event
    
    # Cleanup
    await manager.remove_connection(user_id, queue)


@pytest.mark.asyncio
async def test_content_event_manager_notify_content_status():
    """Test ContentEventManager notify_content_status method."""
    manager = content_event_manager
    user_id = "test_user_789"
    
    # Add connection
    queue = await manager.add_connection(user_id)
    
    # Notify content status
    await manager.notify_content_status(
        user_id=user_id,
        content_id="test_content_456",
        status="processing",
        title="Processing Content",
        progress=50
    )
    
    # Check that event was received
    received_event = await asyncio.wait_for(queue.get(), timeout=1.0)
    assert received_event["type"] == "content_status_update"
    assert received_event["content_id"] == "test_content_456"
    assert received_event["status"] == "processing"
    assert received_event["title"] == "Processing Content"
    assert received_event["progress"] == 50
    
    # Cleanup
    await manager.remove_connection(user_id, queue)


@pytest.mark.asyncio
async def test_content_event_manager_cleanup_disconnected_connections():
    """Test that disconnected connections are cleaned up."""
    manager = content_event_manager
    user_id = "test_user_cleanup"
    
    # Add connection and close the queue to simulate disconnection
    queue = await manager.add_connection(user_id)
    
    # Create a queue that will raise an exception when put() is called
    class FailingQueue:
        async def put(self, item):
            raise Exception("Connection closed")
    
    failing_queue = FailingQueue()
    manager._connections[user_id].append(failing_queue)
    
    # Try to broadcast - should handle the failing connection gracefully
    event_data = {"type": "test", "message": "test"}
    await manager.broadcast_to_user(user_id, event_data)
    
    # The failing queue should be removed, but the good queue should remain
    assert len(manager._connections[user_id]) == 1
    assert queue in manager._connections[user_id]
    assert failing_queue not in manager._connections[user_id]
    
    # Cleanup
    await manager.remove_connection(user_id, queue)


@pytest.mark.asyncio
async def test_sse_with_multiple_users():
    """Test SSE with multiple users receiving different events."""
    manager = content_event_manager
    
    user1_id = "user_1"
    user2_id = "user_2"
    
    # Add connections for both users
    queue1 = await manager.add_connection(user1_id)
    queue2 = await manager.add_connection(user2_id)
    
    # Send event to user 1
    await manager.notify_content_status(
        user_id=user1_id,
        content_id="content_1",
        status="completed",
        title="User 1 Content"
    )
    
    # Send event to user 2
    await manager.notify_content_status(
        user_id=user2_id,
        content_id="content_2",
        status="processing",
        title="User 2 Content"
    )
    
    # Check user 1 received only their event
    event1 = await asyncio.wait_for(queue1.get(), timeout=1.0)
    assert event1["content_id"] == "content_1"
    assert event1["title"] == "User 1 Content"
    
    # Check user 2 received only their event
    event2 = await asyncio.wait_for(queue2.get(), timeout=1.0)
    assert event2["content_id"] == "content_2"
    assert event2["title"] == "User 2 Content"
    
    # Verify queues are empty (no cross-user leakage)
    assert queue1.empty()
    assert queue2.empty()
    
    # Cleanup
    await manager.remove_connection(user1_id, queue1)
    await manager.remove_connection(user2_id, queue2) 