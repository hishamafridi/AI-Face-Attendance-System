
from sqlalchemy.orm import Session

from app.models import FaceProfile


def create_face_profile(
    db: Session,
    user_id: int,
    embedding: bytes,
    pose: str = "straight",
):
    face_profile = FaceProfile(
        user_id=user_id,
        embedding=embedding,
        pose=pose,
    )

    db.add(face_profile)
    db.flush()

    return face_profile


def get_face_profiles_by_user_id(
    db: Session,
    user_id: int,
):
    return (
        db.query(FaceProfile)
        .filter(
            FaceProfile.user_id == user_id
        )
        .order_by(FaceProfile.id.asc())
        .all()
    )


def get_face_profile_by_user_id(
    db: Session,
    user_id: int,
):
    return (
        db.query(FaceProfile)
        .filter(
            FaceProfile.user_id == user_id
        )
        .order_by(FaceProfile.id.asc())
        .first()
    )


def get_face_profile_by_user_and_pose(
    db: Session,
    user_id: int,
    pose: str,
):
    return (
        db.query(FaceProfile)
        .filter(
            FaceProfile.user_id == user_id,
            FaceProfile.pose == pose,
        )
        .first()
    )


def get_all_face_profiles(
    db: Session,
):
    return (
        db.query(FaceProfile)
        .order_by(FaceProfile.user_id.asc(), FaceProfile.id.asc())
        .all()
    )
