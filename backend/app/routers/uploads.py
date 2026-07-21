import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.deps import get_current_student, get_current_user
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt", ".zip", ".mp3", ".mp4"}


def _validate_and_save(file: UploadFile, contents: bytes) -> str:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    stored_name = f"{uuid.uuid4()}{ext}"
    (UPLOAD_DIR / stored_name).write_bytes(contents)
    return stored_name


@router.post("/homework-file")
async def upload_homework_file(file: UploadFile, user: User = Depends(get_current_user)):
    """Teacher uploads a homework attachment (assignment materials)."""
    contents = await file.read()
    stored_name = _validate_and_save(file, contents)
    return {"file_url": f"/api/uploads/{stored_name}"}


@router.post("/submission-file")
async def upload_submission_file(file: UploadFile, student: Student = Depends(get_current_student)):
    """Student uploads their homework submission attachment."""
    contents = await file.read()
    stored_name = _validate_and_save(file, contents)
    return {"file_url": f"/api/uploads/{stored_name}"}


@router.get("/{filename}")
async def get_uploaded_file(filename: str):
    # filename is always our own generated uuid+ext, never user-controlled path segments,
    # so there's no traversal risk here — but double-check it resolves inside UPLOAD_DIR.
    file_path = (UPLOAD_DIR / filename).resolve()
    if not str(file_path).startswith(str(UPLOAD_DIR.resolve())) or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
