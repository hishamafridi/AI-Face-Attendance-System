
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.face_service import face_service
from app.services.liveness_service import liveness_service


router = APIRouter(
    prefix="/liveness",
    tags=["Liveness Detection"],
)


@router.post("/check")
async def check_liveness(
    previous_frame: UploadFile = File(...),
    current_frame: UploadFile = File(...),
):
    previous_bytes = await previous_frame.read()
    current_bytes = await current_frame.read()

    try:
        previous_image = face_service.decode_image(
            previous_bytes
        )

        current_image = face_service.decode_image(
            current_bytes
        )

        previous_faces = face_service.detect_faces(
            previous_image
        )

        current_faces = face_service.detect_faces(
            current_image
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Face detection failed: {str(e)}",
        )

    if len(previous_faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="No face detected in previous frame",
        )

    if len(current_faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="No face detected in current frame",
        )

    if len(previous_faces) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple faces detected in previous frame",
        )

    if len(current_faces) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple faces detected in current frame",
        )

    previous_face = previous_faces[0]
    current_face = current_faces[0]

    (
        is_live,
        movement,
        position_change,
    ) = liveness_service.check_motion(
        previous_face,
        current_face,
    )

    return {
        "live": is_live,
        "movement": round(movement, 4),
        "position_change": round(
            position_change,
            4,
        ),
        "movement_threshold": (
            liveness_service.movement_threshold
        ),
        "max_position_change": (
            liveness_service.max_face_position_change
        ),
        "message": (
            "Live person detected"
            if is_live
            else "Liveness verification failed"
        ),
    }
