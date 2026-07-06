from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.entities import PriorityLevel, ComplexityLevel, DocumentStatus


# ---------- Test Scenario ----------
class TestScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    expected_result: str
    created_at: datetime


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

