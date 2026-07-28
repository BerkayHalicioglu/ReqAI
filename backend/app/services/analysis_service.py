from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.entities import Document, Requirement, Task, TestScenario, DocumentStatus
from app.services.ai_service import get_ai_service


def run_analysis_background(document_id: str):
    """
    Background worker function for asynchronous AI requirement analysis.
    Uses an isolated DB session so it can run safely inside FastAPI BackgroundTasks.
    """
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return

        document.status = DocumentStatus.PROCESSING
        db.commit()

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
            db.flush()

            for task_data in req_data.get("tasks", []):
                task = Task(
                    requirement_id=requirement.id,
                    title=task_data["title"],
                    description=task_data["description"],
                    priority=task_data.get("priority", "MEDIUM"),
                    complexity=task_data.get("complexity", "MODERATE"),
                    role=task_data.get("role", "DEVELOPER"),
                )
                db.add(task)
                db.flush()

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

    except Exception as e:
        print(f"Background AI analysis error for document {document_id}: {e}")
        db.rollback()
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = DocumentStatus.FAILED
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def run_analysis(db: Session, document: Document) -> Document:
    """Synchronous fallback for analysis."""
    run_analysis_background(document.id)
    db.refresh(document)
    return document
