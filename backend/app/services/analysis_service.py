from sqlalchemy.orm import Session

from app.models.entities import Document, Requirement, Task, TestScenario, DocumentStatus
from app.services.ai_service import get_ai_service


def run_analysis(db: Session, document: Document) -> Document:
    """
    Sends the document content to the AI service, then persists the
    resulting Requirement -> Task -> TestScenario tree, linked to the document.
    """
    document.status = DocumentStatus.PROCESSING
    db.commit()

    try:
        ai_service = get_ai_service()
        result = ai_service.analyze(document.content)

        for req_data in result.get("requirements", []):
            requirement = Requirement(
                document_id=document.id,
                title=req_data["title"],
                description=req_data["description"],
                priority=req_data.get("priority", "MEDIUM"),
            )
            db.add(requirement)
            db.flush()  # get requirement.id before adding tasks

            for task_data in req_data.get("tasks", []):
                task = Task(
                    requirement_id=requirement.id,
                    title=task_data["title"],
                    description=task_data["description"],
                    priority=task_data.get("priority", "MEDIUM"),
                    complexity=task_data.get("complexity", "MODERATE"),
                )
                db.add(task)
                db.flush()  # get task.id before adding test scenarios

                for ts_data in task_data.get("test_scenarios", []):
                    test_scenario = TestScenario(
                        task_id=task.id,
                        title=ts_data["title"],
                        description=ts_data["description"],
                        expected_result=ts_data["expected_result"],
                    )
                    db.add(test_scenario)

        document.status = DocumentStatus.ANALYZED
        db.commit()
        db.refresh(document)
        return document

    except Exception:
        document.status = DocumentStatus.FAILED
        db.commit()
        raise
