import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class AgentPlan(Base):
    __tablename__ = "agent_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # JSON array representing the plan steps
    steps = Column(JSON, nullable=False, default=list)
    
    status = Column(String, nullable=False, default="pending") # pending, approved, cancelled, complete
    
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationship to conversation (optional depending on your exact setup, but good to have)
    conversation = relationship("ChatConversation", backref="agent_plans")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("agent_plans.id", ondelete="CASCADE"), nullable=False)
    
    mode = Column(String, nullable=False, default="agentic")
    duration_ms = Column(Integer, nullable=True)
    final_status = Column(String, nullable=False, default="pending") # pending, running, completed, failed, cancelled
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    plan = relationship("AgentPlan", backref="runs")
