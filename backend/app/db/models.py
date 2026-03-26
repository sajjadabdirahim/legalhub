import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Statute(Base):
    __tablename__ = "statutes"

    statute_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    statute_type = Column(String(50), nullable=True)
    cap_number = Column(String(50), nullable=True)
    frbr_uri = Column(String(255), nullable=True)
    latest_version_date = Column(Date, nullable=True)

    amendments = relationship("Amendment", back_populates="statute")
    structural_divisions = relationship("StructuralDivision", back_populates="statute")


class Amendment(Base):
    __tablename__ = "amendments"

    amendment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statute_id = Column(UUID(as_uuid=True), ForeignKey("statutes.statute_id"), nullable=False)
    amending_law_title = Column(String(255), nullable=True)
    amendment_date = Column(Date, nullable=True)

    statute = relationship("Statute", back_populates="amendments")


class StructuralDivision(Base):
    __tablename__ = "structural_divisions"

    division_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statute_id = Column(UUID(as_uuid=True), ForeignKey("statutes.statute_id"), nullable=False)
    parent_division_id = Column(
        UUID(as_uuid=True), ForeignKey("structural_divisions.division_id"), nullable=True
    )
    division_type = Column(String(50), nullable=True)
    division_number = Column(String(20), nullable=True)
    heading = Column(String(255), nullable=True)

    statute = relationship("Statute", back_populates="structural_divisions")
    provisions = relationship("Provision", back_populates="division")


class Provision(Base):
    __tablename__ = "provisions"

    provision_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    division_id = Column(UUID(as_uuid=True), ForeignKey("structural_divisions.division_id"), nullable=False)
    provision_number = Column(String(20), nullable=True)
    heading = Column(String(255), nullable=True)
    akn_eid = Column(String(100), nullable=True)
    clean_text = Column(Text, nullable=False)
    status = Column(String(50), nullable=True)

    division = relationship("StructuralDivision", back_populates="provisions")


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    rlhf_entries = relationship("RlhfFeedback", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    topic_id = Column(Integer, primary_key=True, autoincrement=True)
    topic_name = Column(Text, nullable=True)
    topic_keywords = Column(ARRAY(Text), nullable=True)
    topic_summary = Column(Text, nullable=True)
    topic_size = Column(Integer, nullable=True)

    document_links = relationship("DocumentTopic", back_populates="topic")


class RlhfFeedback(Base):
    __tablename__ = "rlhf_feedback"

    feedback_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    retrieved_provision_id = Column(UUID(as_uuid=True), ForeignKey("provisions.provision_id"), nullable=False)
    user_prompt = Column(Text, nullable=True)
    ai_response = Column(Text, nullable=True)
    is_helpful = Column(Boolean, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="rlhf_entries")


class DocumentTopic(Base):
    __tablename__ = "document_topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provision_id = Column(UUID(as_uuid=True), ForeignKey("provisions.provision_id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=False)
    probability = Column(Float, nullable=False)

    topic = relationship("Topic", back_populates="document_links")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
