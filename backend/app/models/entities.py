import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum as SqlEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PriorityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ComplexityLevel(str, enum.Enum):
    SIMPLE = "SIMPLE"
    MODERATE = "MODERATE"
    COMPLEX = "COMPLEX"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    ANALYZED = "ANALYZED"
    FAILED = "FAILED"


def gen_uuid():
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(SqlEnum(DocumentStatus), default=DocumentStatus.UPLOADED, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    requirements = relationship(
        "Requirement", back_populates="document", cascade="all, delete-orphan"
    )


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    document_id = Column(UUID(as_uuid=False), ForeignKey("documents.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SqlEnum(PriorityLevel), default=PriorityLevel.MEDIUM, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="requirements")
    tasks = relationship("Task", back_populates="requirement", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    requirement_id = Column(UUID(as_uuid=False), ForeignKey("requirements.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SqlEnum(PriorityLevel), default=PriorityLevel.MEDIUM, nullable=False)
    complexity = Column(SqlEnum(ComplexityLevel), default=ComplexityLevel.MODERATE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    requirement = relationship("Requirement", back_populates="tasks")
    test_scenarios = relationship(
        "TestScenario", back_populates="task", cascade="all, delete-orphan"
    )


class TestScenario(Base):
    __tablename__ = "test_scenarios"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="test_scenarios")
