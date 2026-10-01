from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models import Attendance, AttendanceSession, User


class AttendanceService:

    def check_in(
        self,
        db: Session,
        user_id: int,
        session_id: int,
        confidence: float | None = None,
    ):
        # ====================================================
        # 1. CHECK STUDENT
        # ====================================================

        user = db.get(User, user_id)

        if user is None:
            return {
                "success": False,
                "already_marked": False,
                "message": "Student not found.",
                "attendance": None,
            }

        # ====================================================
        # 2. CHECK ATTENDANCE SESSION
        # ====================================================

        session = db.get(
            AttendanceSession,
            session_id,
        )

        if session is None:
            return {
                "success": False,
                "already_marked": False,
                "message": "Attendance session not found.",
                "attendance": None,
            }

        # ====================================================
        # 3. CHECK SESSION STATUS
        # ====================================================

        if session.status != "open":
            return {
                "success": False,
                "already_marked": False,
                "message": "Attendance session is closed.",
                "attendance": None,
            }

        # ====================================================
        # 4. CHECK DUPLICATE
        # ====================================================

        existing = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.session_id == session_id,
            )
            .first()
        )

        if existing:
            return {
                "success": False,
                "already_marked": True,
                "message": "Attendance already marked for this session.",
                "attendance": existing,
            }

        # ====================================================
        # 5. CREATE ATTENDANCE
        # ====================================================

        now = datetime.utcnow()

        attendance = Attendance(
            user_id=user_id,
            session_id=session_id,
            date=date.today(),
            check_in_time=now,
            status="present",
            confidence=confidence,
        )

        db.add(attendance)
        db.commit()
        db.refresh(attendance)

        return {
            "success": True,
            "already_marked": False,
            "message": "Attendance marked successfully.",
            "attendance": attendance,
        }


attendance_service = AttendanceService()