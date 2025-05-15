import inspect
from typing import Any

from app.utils.posthog_types import capture, identify


def test_capture_function_exists():
    """Test that the capture function exists."""
    assert callable(capture)


def test_capture_signature():
    """Test that the capture function has the correct signature."""
    sig = inspect.signature(capture)
    parameters = sig.parameters
    
    # Check parameter names
    assert "distinct_id" in parameters
    assert "event" in parameters
    assert "properties" in parameters
    assert "context" in parameters
    
    # Check parameter types
    assert parameters["distinct_id"].annotation == str
    assert parameters["event"].annotation == str
    assert parameters["properties"].annotation == dict[str, Any] | None
    assert parameters["context"].annotation == dict[str, Any] | None
    
    # Check return type
    assert sig.return_annotation == None


def test_identify_function_exists():
    """Test that the identify function exists."""
    assert callable(identify)


def test_identify_signature():
    """Test that the identify function has the correct signature."""
    sig = inspect.signature(identify)
    parameters = sig.parameters
    
    # Check parameter names
    assert "distinct_id" in parameters
    assert "properties" in parameters
    
    # Check parameter types
    assert parameters["distinct_id"].annotation == str
    assert parameters["properties"].annotation == dict[str, Any] | None
    
    # Check return type
    assert sig.return_annotation == None


def test_capture_functionality():
    """Test the capture function can be called without errors."""
    result = capture(
        distinct_id="test_id", 
        event="test_event", 
        properties={"prop": "value"}, 
        context={"ctx": "value"}
    )
    assert result is None


def test_identify_functionality():
    """Test the identify function can be called without errors."""
    result = identify(
        distinct_id="test_id", 
        properties={"prop": "value"}
    )
    assert result is None 