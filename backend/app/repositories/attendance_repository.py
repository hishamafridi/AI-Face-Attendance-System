from datetime import date

from sqlalchemy.orm import Session

from app.models.attendance import Attendance


def get_attendance_by_user_and_date(
    db: Session,
    user_id: int,
    attendance_date: date,
):
    return (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user_id,
            Attendance.date == attendance_date,
        )
        .first()
    )


def create_attendance(
    db: Session,
    attendance: Attendance,
):
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance


def get_attendance_by_user(
    db: Session,
    user_id: int,
):
    return (
        db.query(Attendance)
        .filter(Attendance.user_id == user_id)
        .order_by(Attendance.date.desc())
        .all()
    )


def get_today_attendance(
    db: Session,
    attendance_date: date,
):
    return (
        db.query(Attendance)
        .filter(Attendance.date == attendance_date)
        .order_by(Attendance.check_in_time.asc())
        .all()
    )