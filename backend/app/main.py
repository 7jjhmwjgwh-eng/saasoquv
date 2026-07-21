from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    attendance,
    auth,
    courses,
    groups,
    homework,
    payments,
    rooms,
    schedule_overview,
    staff,
    student_auth,
    students,
    superadmin,
    uploads,
)

app = FastAPI(title="Edu CRM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(courses.router)
app.include_router(groups.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(homework.router)
app.include_router(payments.router)
app.include_router(schedule_overview.router)
app.include_router(student_auth.router)
app.include_router(uploads.router)
app.include_router(staff.router)
app.include_router(superadmin.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
