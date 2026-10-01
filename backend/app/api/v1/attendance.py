
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Attendance, AttendanceSession, User
from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class AttendanceCreate(BaseModel):
    user_id: int
    session_id: int
    status: str = "present"
    confidence: float | None = None


class AttendanceCheckout(BaseModel):
    attendance_id: int


# ============================================================
# RESPONSE HELPER
# ============================================================

def attendance_response(record: Attendance):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "student_id": (
            record.user.student_id
            if record.user
            else None
        ),
        "student_name": (
            record.user.full_name
            if record.user
            else None
        ),
        "session_id": record.session_id,
        "course_id": (
            record.session.course_id
            if record.session
            else None
        ),
        "date": record.date,
        "check_in_time": record.check_in_time,
        "check_out_time": record.check_out_time,
        "status": record.status,
        "confidence": record.confidence,
        "created_at": record.created_at,
    }


# ============================================================
# GET ALL ATTENDANCE RECORDS
# ============================================================

@router.get("")
def get_attendance_records(
    date_filter: date | None = Query(
        default=None,
        alias="date",
        description="Filter attendance by date.",
    ),
    student_id: int | None = Query(
        default=None,
        description="Filter attendance by database user ID.",
    ),
    session_id: int | None = Query(
        default=None,
        description="Filter attendance by session ID.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Attendance)
        .join(User)
        .join(AttendanceSession)
    )

    if date_filter is not None:
        query = query.filter(
            Attendance.date == date_filter
        )

    if student_id is not None:
        query = query.filter(
            Attendance.user_id == student_id
        )

    if session_id is not None:
        query = query.filter(
            Attendance.session_id == session_id
        )

    records = (
        query
        .order_by(
            Attendance.date.desc(),
            Attendance.check_in_time.desc(),
        )
        .all()
    )

    return {
        "success": True,
        "total_records": len(records),
        "attendance": [
            attendance_response(record)
            for record in records
        ],
    }


# ============================================================
# GET ONE ATTENDANCE RECORD
# ============================================================

@router.get("/{attendance_id}")
def get_attendance_record(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Attendance)
        .filter(
            Attendance.id == attendance_id
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    return {
        "success": True,
        "attendance": attendance_response(record),
    }


# ============================================================
# CREATE ATTENDANCE RECORD
# ============================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check student
    student = (
        db.query(User)
        .filter(User.id == data.user_id)
        .first()
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    # Check session
    session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.id == data.session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found.",
        )

    # Prevent duplicate attendance
    existing = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == data.user_id,
            Attendance.session_id == data.session_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already marked for this student in this session.",
        )

    now = datetime.utcnow()

    record = Attendance(
        user_id=data.user_id,
        session_id=data.session_id,
        date=now.date(),
        check_in_time=now,
        status=data.status,
        confidence=data.confidence,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": "Attendance marked successfully.",
        "attendance": attendance_response(record),
    }


# ============================================================
# CHECK OUT
# ============================================================

@router.post("/checkout")
def checkout_attendance(
    data: AttendanceCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Attendance)
        .filter(
            Attendance.id == data.attendance_id
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    if record.check_out_time is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student has already checked out.",
        )

    record.check_out_time = datetime.utcnow()

    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": "Student checked out successfully.",
        "attendance": attendance_response(record),
    }


# ============================================================
# DELETE ATTENDANCE RECORD
# ============================================================

@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Attendance)
        .filter(
            Attendance.id == attendance_id
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    db.delete(record)
    db.commit()

    return {
        "success": True,
        "message": "Attendance record deleted successfully.",
        "attendance_id": attendance_id,
    }
