from pydantic import BaseModel
from typing import List, Optional, Dict, Union

class LLMMessage(BaseModel):
    role: str
    content: str

class CompletionRequest(BaseModel):
    model: str | None = "gpt-3.5-turbo"
    messages: List[LLMMessage]
    temperature: float | None = 1.0
    max_tokens: int | None = None
    stream: bool | None = False
    top_p: float | None = None
    stop: Union[str, List[str], None] = None
    presence_penalty: float | None = None
    frequency_penalty: float | None = None
    logit_bias: Dict | None = None
    user: str | None = None
    metadata: Dict | None = None
    api_key: str | None = None

class CompletionChoiceDelta(BaseModel):
    content: str | None = None
    role: str | None = None

class CompletionStreamChoice(BaseModel):
    delta: CompletionChoiceDelta
    finish_reason: str | None = None
    index: int

class StreamingCompletionResponse(BaseModel):
    id: str
    choices: List[CompletionStreamChoice]
    created: int
    model: str
    object: str  # Usually "chat.completion.chunk"
    system_fingerprint: str | None = None

class CompletionChoice(BaseModel):
    finish_reason: str | None = None
    index: int
    message: LLMMessage

class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class CompletionResponse(BaseModel):
    id: str
    choices: List[CompletionChoice]
    created: int  # timestamp
    model: str
    object: str  # Usually "chat.completion"
    system_fingerprint: str | None = None
    usage: Usage

class EmbeddingRequest(BaseModel):
    input: Union[str, List[str]]
    model: str
    user: str | None = None
    api_key: str | None = None

class EmbeddingData(BaseModel):
    object: str  # Usually "embedding"
    embedding: List[float]
    index: int

class EmbeddingUsage(BaseModel):
    prompt_tokens: int
    total_tokens: int

class EmbeddingResponse(BaseModel):
    object: str  # Usually "list"
    data: List[EmbeddingData]
    model: str
    usage: EmbeddingUsage
