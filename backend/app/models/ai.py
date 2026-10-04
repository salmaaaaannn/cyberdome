from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean, Float, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.core.database import Base
import uuid
from datetime import datetime

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=True)
    
    # Ownership (Either personal user OR enterprise company)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")
    user = relationship("User")
    company = relationship("Company")

class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("ai_conversations.id"), nullable=False)
    
    role = Column(String, nullable=False) # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    # Optional metadata (e.g., sources used, citations, security context provided)
    message_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Isolation: Must belong to a specific company, or NULL if global public intelligence
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    
    title = Column(String, nullable=False)
    source_type = Column(String, nullable=False) # 'vulnerability', 'incident', 'report', 'manual'
    source_id = Column(String, nullable=True) # ID linking to the original asset/finding
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("knowledge_documents.id"), nullable=False)
    
    # Isolation must be enforced here as well for quick filtering
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    
    # Store embedding as JSON array so it works natively on SQLite
    embedding = Column(JSON, nullable=False)
    
    # Relationships
    document = relationship("KnowledgeDocument", back_populates="chunks")
