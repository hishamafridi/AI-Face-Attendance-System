from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.security.dependencies import get_current_user
from app.services.student_service import student_service


router = APIRouter(
    prefix="/students",
    tags=["Student Management"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class StudentCreate(BaseModel):
    full_name: str
    student_id: str
    email: EmailStr
    department: str
    class_name: str
    phone: str | None = None
    password: str


class StudentUpdate(BaseModel):
    full_name: str | None = None
    student_id: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    class_name: str | None = None
    phone: str | None = None
    is_active: bool | None = None


# ============================================================
# RESPONSE HELPER
# ============================================================

def student_response(student: User):
    return {
        "id": student.id,
        "student_id": student.student_id,
        "full_name": student.full_name,
        "email": student.email,
        "department": student.department,
        "class_name": student.class_name,
        "phone": student.phone,
        "is_active": student.is_active,
        "created_at": student.created_at,
    }


# ============================================================
# CREATE STUDENT
# ============================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        student = student_service.create(
            db=db,
            full_name=data.full_name,
            student_id=data.student_id,
            email=data.email,
            department=data.department,
            class_name=data.class_name,
            phone=data.phone,
            password=data.password,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return {
        "success": True,
        "message": "Student created successfully.",
        "student": student_response(student),
    }


# ============================================================
# GET ALL STUDENTS
# ============================================================

@router.get("")
def get_students(
    search: str | None = Query(
        default=None,
        description="Search by name, student ID, email, or department.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if search and search.strip():
        students = student_service.search(
            db=db,
            search=search,
        )
    else:
        students = student_service.get_all(
            db=db,
        )

    return {
        "success": True,
        "total_students": len(students),
        "students": [
            student_response(student)
            for student in students
        ],
    }


# ============================================================
# GET STUDENT BY DATABASE ID
# ============================================================

@router.get("/{student_id}")
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = student_service.get_by_id(
        db=db,
        student_id=student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    return {
        "success": True,
        "student": student_response(student),
    }


# ============================================================
# UPDATE STUDENT
# ============================================================

@router.put("/{student_id}")
def update_student(
    student_id: int,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = student_service.get_by_id(
        db=db,
        student_id=student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    try:
        student = student_service.update(
            db=db,
            student=student,
            full_name=data.full_name,
            student_id=data.student_id,
            email=data.email,
            department=data.department,
            class_name=data.class_name,
            phone=data.phone,
            is_active=data.is_active,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return {
        "success": True,
        "message": "Student updated successfully.",
        "student": student_response(student),
    }


# ============================================================
# DELETE STUDENT
# ============================================================

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = student_service.get_by_id(
        db=db,
        student_id=student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    student_service.delete(
        db=db,
        student=student,
    )

    return {
        "success": True,
        "message": "Student deleted successfully.",
        "student_id": student_id,
    }