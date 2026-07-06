import os
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.config import settings
from app.models.entities import Document, DocumentStatus, Requirement, Task
from app.schemas.schemas import DocumentSummaryOut, DocumentDetailOut
from app.services.analysis_service import run_analysis

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentSummaryOut, status_code=201)
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Step 1 & 2: upload a TXT requirement document and read its content."""
    if not file.filename.lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are supported in v1.")

    raw_bytes = file.file.read()
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text.")

    # Persist a copy on disk too (handy for audit/debugging), keyed by a UUID.
    stored_name = f"{uuid.uuid4()}_{file.filename}"
    stored_path = os.path.join(settings.UPLOAD_DIR, stored_name)
    with open(stored_path, "w", encoding="utf-8") as f:
        f.write(text)

    document = Document(
        filename=file.filename,
        content=text,
        status=DocumentStatus.UPLOADED,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/{document_id}/analyze", response_model=DocumentDetailOut)
def analyze_document(document_id: str, db: Session = Depends(get_db)):
    """Step 3 & 4: send the document to the AI service and store the results."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    document = run_analysis(db, document)

    # Reload with the full nested tree for the response
    document = (
        db.query(Document)
        .options(
            joinedload(Document.requirements)
            .joinedload(Requirement.tasks)
            .joinedload(Task.test_scenarios)
        )
        .filter(Document.id == document_id)
        .first()
    )
    return document


@router.get("", response_model=list[DocumentSummaryOut])
def list_documents(db: Session = Depends(get_db)):
    """Step 5: list previously uploaded/analyzed documents."""
    return db.query(Document).order_by(Document.uploaded_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Step 5: view a single document's full requirement/task/test breakdown."""
    document = (
        db.query(Document)
        .options(
            joinedload(Document.requirements)
            .joinedload(Requirement.tasks)
            .joinedload(Task.test_scenarios)
        )
        .filter(Document.id == document_id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document
