from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.deps import get_current_user_id
from app.validation import validate_and_sanitize_chat_input

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    mode: Literal["citizen", "professional"]


class ChatResponse(BaseModel):
    sanitized_query: str
    user_id: str
    mode: Literal["citizen", "professional"]


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    user_id: str = Depends(get_current_user_id),
) -> ChatResponse:
    """
    Step 1: authenticate (JWT), validate and sanitize input, return text ready for embedding.
    """
    result = validate_and_sanitize_chat_input(body.query)
    if not result.ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.error)
    assert result.sanitized is not None
    return ChatResponse(
        sanitized_query=result.sanitized,
        user_id=user_id,
        mode=body.mode,
    )
