from sqlalchemy.orm import Session

from app.models import User


def create_student(
    db: Session,
    student: User,
):
    db.add(student)
    db.commit()
    db.refresh(student)

    return student


def get_all_students(
    db: Session,
):
    return (
        db.query(User)
        .order_by(User.id.desc())
        .all()
    )


def get_student_by_id(
    db: Session,
    student_id: int,
):
    return (
        db.query(User)
        .filter(User.id == student_id)
        .first()
    )


def get_student_by_student_id(
    db: Session,
    student_id: str,
):
    return (
        db.query(User)
        .filter(User.student_id == student_id)
        .first()
    )


def get_student_by_email(
    db: Session,
    email: str,
):
    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def search_students(
    db: Session,
    search: str,
):
    search_value = f"%{search.strip()}%"

    return (
        db.query(User)
        .filter(
            (User.full_name.ilike(search_value))
            | (User.student_id.ilike(search_value))
            | (User.email.ilike(search_value))
            | (User.department.ilike(search_value))
        )
        .order_by(User.id.desc())
        .all()
    )


def update_student(
    db: Session,
    student: User,
):
    db.commit()
    db.refresh(student)

    return student


def delete_student(
    db: Session,
    student: User,
):
    db.delete(student)
    db.commit()