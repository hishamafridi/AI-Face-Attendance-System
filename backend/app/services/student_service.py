
from sqlalchemy.orm import Session

from app.models import User
from app.repositories.student_repository import (
    create_student,
    delete_student,
    get_all_students,
    get_student_by_email,
    get_student_by_id,
    get_student_by_student_id,
    search_students,
    update_student,
)
from app.security.password import hash_password


class StudentService:

    # ============================================================
    # CREATE STUDENT
    # ============================================================

    def create(
        self,
        db: Session,
        full_name: str,
        student_id: str,
        email: str,
        department: str,
        class_name: str,
        phone: str | None,
        password: str,
    ):
        full_name = full_name.strip()
        student_id = student_id.strip()
        email = email.strip().lower()
        department = department.strip()
        class_name = class_name.strip()

        if phone:
            phone = phone.strip()

        # Check duplicate Student ID
        if get_student_by_student_id(
            db,
            student_id,
        ):
            raise ValueError(
                "Student ID already exists."
            )

        # Check duplicate Email
        if get_student_by_email(
            db,
            email,
        ):
            raise ValueError(
                "Email already exists."
            )

        # Create student
        student = User(
            full_name=full_name,
            student_id=student_id,
            email=email,
            department=department,
            class_name=class_name,
            phone=phone,
            password_hash=hash_password(password),
            is_active=True,
        )

        return create_student(
            db,
            student,
        )

    # ============================================================
    # GET ALL STUDENTS
    # ============================================================

    def get_all(
        self,
        db: Session,
    ):
        return get_all_students(db)

    # ============================================================
    # GET STUDENT BY DATABASE ID
    # ============================================================

    def get_by_id(
        self,
        db: Session,
        student_id: int,
    ):
        return get_student_by_id(
            db,
            student_id,
        )

    # ============================================================
    # SEARCH STUDENTS
    # ============================================================

    def search(
        self,
        db: Session,
        search: str,
    ):
        return search_students(
            db,
            search,
        )

    # ============================================================
    # UPDATE STUDENT
    # ============================================================

    def update(
        self,
        db: Session,
        student: User,
        full_name: str | None = None,
        student_id: str | None = None,
        email: str | None = None,
        department: str | None = None,
        class_name: str | None = None,
        phone: str | None = None,
        is_active: bool | None = None,
    ):
        # Update Student ID
        if student_id is not None:
            student_id = student_id.strip()

            existing = get_student_by_student_id(
                db,
                student_id,
            )

            if existing and existing.id != student.id:
                raise ValueError(
                    "Student ID already exists."
                )

            student.student_id = student_id

        # Update Email
        if email is not None:
            email = email.strip().lower()

            existing = get_student_by_email(
                db,
                email,
            )

            if existing and existing.id != student.id:
                raise ValueError(
                    "Email already exists."
                )

            student.email = email

        # Update Full Name
        if full_name is not None:
            student.full_name = full_name.strip()

        # Update Department
        if department is not None:
            student.department = department.strip()

        # Update Class
        if class_name is not None:
            student.class_name = class_name.strip()

        # Update Phone
        if phone is not None:
            student.phone = phone.strip()

        # Update Active Status
        if is_active is not None:
            student.is_active = is_active

        return update_student(
            db,
            student,
        )

    # ============================================================
    # DELETE STUDENT
    # ============================================================

    def delete(
        self,
        db: Session,
        student: User,
    ):
        delete_student(
            db,
            student,
        )


# ============================================================
# SERVICE INSTANCE
# ============================================================

student_service = StudentService()
