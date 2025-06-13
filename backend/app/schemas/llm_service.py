"""
LLM Service schemas for request and response models.
"""

from typing import Any

from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    """LLM message model compatible with OpenAI format."""

    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")
    name: str | None = Field(None, description="Optional name for the message")


class CompletionRequest(BaseModel):
    """Request model for LLM completions."""

    model: str = Field(..., description="Model to use for completion")
    messages: list[LLMMessage] = Field(..., description="List of messages")
    stream: bool = Field(default=True, description="Whether to stream the response")
    temperature: float = Field(
        default=0.7, ge=0.0, le=2.0, description="Sampling temperature"
    )
    max_tokens: int = Field(
        default=2000, gt=0, description="Maximum tokens to generate"
    )
    top_p: float | None = Field(
        default=None, ge=0.0, le=1.0, description="Top-p sampling"
    )
    frequency_penalty: float | None = Field(
        default=None, ge=-2.0, le=2.0, description="Frequency penalty"
    )
    presence_penalty: float | None = Field(
        default=None, ge=-2.0, le=2.0, description="Presence penalty"
    )
    stop: list[str] | None = Field(default=None, description="Stop sequences")
    user: str | None = Field(default=None, description="User identifier")


class CompletionChoice(BaseModel):
    """Choice in completion response."""

    index: int = Field(..., description="Choice index")
    message: LLMMessage | None = Field(
        None, description="Complete message (non-streaming)"
    )
    delta: dict[str, Any] | None = Field(None, description="Message delta (streaming)")
    finish_reason: str | None = Field(None, description="Reason for completion finish")


class CompletionUsage(BaseModel):
    """Token usage information."""

    prompt_tokens: int = Field(..., description="Number of tokens in the prompt")
    completion_tokens: int = Field(
        ..., description="Number of tokens in the completion"
    )
    total_tokens: int = Field(..., description="Total number of tokens")


class CompletionResponse(BaseModel):
    """Response model for LLM completions."""

    id: str = Field(..., description="Completion ID")
    object: str = Field(default="chat.completion", description="Object type")
    created: int = Field(..., description="Creation timestamp")
    model: str = Field(..., description="Model used")
    choices: list[CompletionChoice] = Field(
        ..., description="List of completion choices"
    )
    usage: CompletionUsage | None = Field(None, description="Token usage information")


class EmbeddingRequest(BaseModel):
    """Request model for embeddings."""

    input: str = Field(..., description="Text to embed")
    model: str = Field(default="text-embedding-ada-002", description="Embedding model")
    user: str | None = Field(default=None, description="User identifier")


class EmbeddingData(BaseModel):
    """Embedding data."""

    object: str = Field(default="embedding", description="Object type")
    embedding: list[float] = Field(..., description="Embedding vector")
    index: int = Field(..., description="Index in the input list")


class EmbeddingResponse(BaseModel):
    """Response model for embeddings."""

    object: str = Field(default="list", description="Object type")
    data: list[EmbeddingData] = Field(..., description="List of embeddings")
    model: str = Field(..., description="Model used")
    usage: CompletionUsage | None = Field(None, description="Token usage information")


class ModelInfo(BaseModel):
    """Model information."""

    id: str = Field(..., description="Model ID")
    name: str = Field(..., description="Model display name")
    description: str | None = Field(None, description="Model description")
    max_tokens: int | None = Field(None, description="Maximum context length")
    supports_streaming: bool = Field(
        default=True, description="Whether model supports streaming"
    )


class ModelsResponse(BaseModel):
    """Response model for available models."""

    models: list[ModelInfo] = Field(..., description="List of available models")
