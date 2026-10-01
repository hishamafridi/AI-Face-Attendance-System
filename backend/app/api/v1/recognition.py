from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.security.dependencies import get_current_user
from app.services.face_service import face_service
from app.services.recognition_service import recognition_service
from app.repositories.face_repository import get_all_face_profiles


router = APIRouter(
    prefix="/recognition",
    tags=["Face Recognition"],
)


@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await file.read()

    try:
        input_embedding = face_service.get_embedding(image_bytes)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    profiles = get_all_face_profiles(db)

    if not profiles:
        raise HTTPException(
            status_code=404,
            detail="No enrolled faces found",
        )

    best_match = None
    best_similarity = -1.0

    for profile in profiles:
        is_match, similarity = recognition_service.is_match(
            input_embedding,
            profile.embedding,
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = profile

    if best_match is None or best_similarity < recognition_service.threshold:
        return {
            "recognized": False,
            "message": "Face not recognized",
            "similarity": round(best_similarity, 4),
        }

    user = db.get(User, best_match.user_id)

    return {
        "recognized": True,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "similarity": round(best_similarity, 4),
    }