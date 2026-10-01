from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.face import router as face_router
from app.api.v1.recognition import router as recognition_router
from app.api.v1.liveness import router as liveness_router
from app.api.v1.attendance import router as attendance_router
from app.api.v1.classroom import router as classroom_router


app = FastAPI(
    title="AI Face Attendance System",
    version="0.1.0",
    description="AI-based face recognition attendance system with liveness detection.",
)


# --------------------------------------------------
# CORS Configuration
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# API Routes
# --------------------------------------------------

# Authentication
app.include_router(auth_router)

# Face enrollment
app.include_router(face_router)

# Face recognition
app.include_router(recognition_router)

# Liveness detection
app.include_router(liveness_router)

# Normal attendance
app.include_router(attendance_router)

# Classroom multi-face attendance
app.include_router(classroom_router)


# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "AI Face Attendance System API is running",
        "version": "0.1.0",
    }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }