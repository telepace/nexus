"""Langfuse monitoring helpers.

This module is an *optional* dependency. If the `langfuse` SDK is not
installed or credentials are missing, the helper functions become no-ops so that
calling code does not need to worry about availability.
"""

from __future__ import annotations

import logging
import os
from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger(__name__)

try:
    import langfuse  # type: ignore

    _enabled = bool(
        os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")
    )
except ModuleNotFoundError:  # pragma: no cover
    langfuse = None  # type: ignore
    _enabled = False


@contextmanager
def span(
    name: str, input_text: str | None = None
) -> Generator[dict[str, Any], None, None]:
    """Context manager that creates a Langfuse span if SDK is available.

    Returns a `details` dict which caller can update with additional keys before
    exiting the context.
    """

    if not _enabled:
        yield {}
        return

    lf = langfuse.Langfuse()  # type: ignore[attr-defined]
    trace = lf.trace(name=name)
    span = trace.span(name=name, input=input_text or "")
    details: dict[str, Any] = {"_trace": trace, "_span": span}
    try:
        yield details
        span.end()
        trace.end()
    except Exception as e:  # pragma: no cover
        span.end(error=str(e))
        trace.end()
        raise
