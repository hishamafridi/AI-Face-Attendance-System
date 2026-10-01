
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

    previous_image = liveness_service.decode_image(
        previous_bytes
    )

    current_image = liveness_service.decode_image(
        current_bytes
    )

    if previous_image is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode previous frame",
        )

    if current_image is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode current frame",
        )

    try:
        previous_faces = face_service.detect_faces(
            previous_image
        )

        current_faces = face_service.detect_faces(
            current_image
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

    previous_face = previous_faces[0]
    current_face = current_faces[0]

    previous_points = previous_face.kps
    current_points = current_face.kps

    is_live, movement = liveness_service.check_motion(
        previous_points,
        current_points,
    )

    return {
        "live": is_live,
        "movement": round(movement, 4),
        "threshold": liveness_service.movement_threshold,
        "message": (
            "Live person detected"
            if is_live
            else "Possible static image or insufficient movement"
        ),
    }

