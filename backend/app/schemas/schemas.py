from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.entities import PriorityLevel, ComplexityLevel, DocumentStatus, TestStatus


# ---------- Test Scenario ----------
class TestScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    expected_result: str
    status: TestStatus = TestStatus.PENDING
    comment: Optional[str] = None
    evidence_file: Optional[str] = None
    created_at: datetime


class TestScenarioUpdate(BaseModel):
    status: Optional[TestStatus] = None
    comment: Optional[str] = None
    evidence_file: Optional[str] = None



# ---------- Task ----------
class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    priority: PriorityLevel
    complexity: ComplexityLevel
    created_at: datetime
    test_scenarios: list[TestScenarioOut] = []


# ---------- Requirement ----------
class RequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    priority: PriorityLevel
    created_at: datetime
    tasks: list[TaskOut] = []


# ---------- Document ----------
class DocumentSummaryOut(BaseModel):
    """Lightweight view used for list endpoints."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    status: DocumentStatus
    uploaded_at: datetime


class DocumentDetailOut(DocumentSummaryOut):
    """Full view including the generated analysis tree."""
    content: str
    requirements: list[RequirementOut] = []


# ---------- Requirement Update Input Schema ----------
class RequirementUpdate(BaseModel):
    title: str
    description: str
    priority: PriorityLevel


class DocumentUpdate(BaseModel):
    filename: str


class PaginatedDocumentsOut(BaseModel):
    items: list[DocumentSummaryOut]
    total: int
    total_requirements: int
    total_critical_requirements: int
    total_tasks: int


class AnalyticsOut(BaseModel):
    total_documents: int
    total_requirements: int
    total_tasks: int
    total_test_scenarios: int
    requirements_by_priority: dict[str, int]
    tasks_by_complexity: dict[str, int]

