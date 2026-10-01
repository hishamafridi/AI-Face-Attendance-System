from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_email(
    db: Session,
    email: str,
):
    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def get_user_by_student_id(
    db: Session,
    student_id: str,
):
    return (
        db.query(User)
        .filter(User.student_id == student_id)
        .first()
    )


def create_user(
    db: Session,
    full_name: str,
    student_id: str,
    email: str,
    department: str,
    class_name: str,
    password_hash: str,
    phone: str | None = None,
):
    user = User(
        full_name=full_name,
        student_id=student_id,
        email=email,
        department=department,
        class_name=class_name,
        phone=phone,
        password_hash=password_hash,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user