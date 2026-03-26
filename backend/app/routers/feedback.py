import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.models import Provision, RlhfFeedback, User
from app.db.session import get_db
from app.deps import get_current_user_id

router = APIRouter(tags=["feedback"])


class RlhfFeedbackRequest(BaseModel):
    retrieved_provision_id: str = Field(..., min_length=1)
    user_prompt: str | None = None
    ai_response: str | None = None
    is_helpful: bool | None = None


class RlhfFeedbackResponse(BaseModel):
    feedback_id: str
    user_id: str
    retrieved_provision_id: str
    message: str


@router.post("/feedback/rlhf", response_model=RlhfFeedbackResponse)
def create_rlhf_feedback(
    body: RlhfFeedbackRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> RlhfFeedbackResponse:
    """
    Store RLHF feedback for the authenticated user.
    `user_id` is always derived from JWT `sub`, never accepted from frontend input.
    """
    try:
        user_uuid = uuid.UUID(current_user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated token subject is not a valid user UUID.",
        ) from exc

    try:
        provision_uuid = uuid.UUID(body.retrieved_provision_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="retrieved_provision_id must be a valid UUID.",
        ) from exc

    user = db.query(User).filter(User.user_id == user_uuid).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user does not exist.",
        )

    provision = db.query(Provision).filter(Provision.provision_id == provision_uuid).first()
    if provision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Retrieved provision was not found.",
        )

    row = RlhfFeedback(
        feedback_id=uuid.uuid4(),
        user_id=user_uuid,
        retrieved_provision_id=provision_uuid,
        user_prompt=body.user_prompt,
        ai_response=body.ai_response,
        is_helpful=body.is_helpful,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return RlhfFeedbackResponse(
        feedback_id=str(row.feedback_id),
        user_id=str(row.user_id),
        retrieved_provision_id=str(row.retrieved_provision_id),
        message="RLHF feedback saved.",
    )
