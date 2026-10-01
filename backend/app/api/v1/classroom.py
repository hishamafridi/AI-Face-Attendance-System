from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AttendanceSession, User
from app.repositories.face_repository import get_all_face_profiles
from app.security.dependencies import get_current_user
from app.services.attendance_service import attendance_service
from app.services.face_service import face_service


router = APIRouter(
    prefix="/classroom",
    tags=["Classroom Attendance"],
)


@router.post("/recognize")
async def recognize_classroom(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze one classroom image.

    The system:
    1. Detects all faces.
    2. Generates embeddings.
    3. Compares faces with enrolled students.
    4. Recognizes enrolled students.
    5. Marks recognized students present.
    6. Automatically uses the latest open attendance session.
    7. Leaves unknown faces for teacher review.
    """

    # ========================================================
    # 1. FIND LATEST OPEN ATTENDANCE SESSION
    # ========================================================

    attendance_session = (
        db.query(AttendanceSession)
        .filter(
            AttendanceSession.status == "open"
        )
        .order_by(
            AttendanceSession.id.desc()
        )
        .first()
    )

    if attendance_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No open attendance session found. "
                "Please open an attendance session first."
            ),
        )

    session_id = attendance_session.id

    # ========================================================
    # 2. VALIDATE IMAGE
    # ========================================================

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an image file.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )

    # ========================================================
    # 3. DECODE IMAGE AND DETECT FACES
    # ========================================================

    try:
        image = face_service.decode_image(
            image_bytes
        )

        if image is None:
            raise ValueError(
                "Could not read the uploaded image."
            )

        detected_faces = face_service.detect_faces(
            image
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face detection failed: {str(exc)}",
        )

    # ========================================================
    # 4. NO FACES
    # ========================================================

    if not detected_faces:
        return {
            "success": True,
            "message": (
                "No faces detected in the classroom photo."
            ),
            "session_id": session_id,
            "total_faces": 0,
            "recognized_count": 0,
            "unrecognized_count": 0,
            "attendance_marked_count": 0,
            "students": [],
        }

    # ========================================================
    # 5. GET ENROLLED FACE PROFILES
    # ========================================================

    profiles = get_all_face_profiles(db)

    if not profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No enrolled student faces found.",
        )

    # ========================================================
    # 6. FACE RECOGNITION SETTINGS
    # ========================================================

    threshold = 0.40

    students = []

    recognized_count = 0
    unrecognized_count = 0
    attendance_marked_count = 0

    recognized_user_ids = set()

    # ========================================================
    # 7. PROCESS EVERY DETECTED FACE
    # ========================================================

    for index, detected_face in enumerate(
        detected_faces,
        start=1,
    ):

        embedding = getattr(
            detected_face,
            "embedding",
            None,
        )

        if embedding is None:
            unrecognized_count += 1

            students.append(
                {
                    "face_number": index,
                    "recognized": False,
                    "similarity": None,
                    "message": (
                        "Face embedding could not be generated."
                    ),
                }
            )

            continue

        # ====================================================
        # FIND BEST MATCH
        # ====================================================

        best_profile = None
        best_similarity = -1.0

        for profile in profiles:

            try:
                similarity = (
                    face_service.compare_embeddings(
                        embedding,
                        profile.embedding,
                    )
                )
            except Exception:
                continue

            if similarity > best_similarity:
                best_similarity = similarity
                best_profile = profile

        # ====================================================
        # UNKNOWN FACE
        # ====================================================

        if (
            best_profile is None
            or best_similarity < threshold
        ):
            unrecognized_count += 1

            students.append(
                {
                    "face_number": index,
                    "recognized": False,
                    "similarity": round(
                        float(best_similarity),
                        4,
                    ),
                    "message": "Unknown Student",
                }
            )

            continue

        # ====================================================
        # FIND USER
        # ====================================================

        user = db.get(
            User,
            best_profile.user_id,
        )

        if user is None:
            unrecognized_count += 1

            students.append(
                {
                    "face_number": index,
                    "recognized": False,
                    "similarity": round(
                        float(best_similarity),
                        4,
                    ),
                    "message": (
                        "Recognized face belongs "
                        "to a missing user."
                    ),
                }
            )

            continue

        # ====================================================
        # RECOGNIZED STUDENT
        # ====================================================

        recognized_count += 1

        attendance_result = None

        if user.id not in recognized_user_ids:

            recognized_user_ids.add(user.id)

            try:
                attendance_result = (
                    attendance_service.check_in(
                        db=db,
                        user_id=user.id,
                        session_id=session_id,
                        confidence=float(
                            best_similarity
                        ),
                    )
                )

                if attendance_result["success"]:
                    attendance_marked_count += 1

            except Exception as exc:

                students.append(
                    {
                        "face_number": index,
                        "recognized": True,
                        "similarity": round(
                            float(best_similarity),
                            4,
                        ),
                        "user": {
                            "id": user.id,
                            "full_name": user.full_name,
                            "email": user.email,
                        },
                        "attendance": {
                            "success": False,
                            "message": (
                                "Attendance could not be saved."
                            ),
                            "error": str(exc),
                        },
                    }
                )

                continue

        else:

            attendance_result = {
                "success": False,
                "already_marked": True,
                "message": (
                    "Student already processed "
                    "in this photo."
                ),
            }

        # ====================================================
        # ATTENDANCE INFORMATION
        # ====================================================

        attendance_data = None

        if attendance_result:

            attendance = attendance_result.get(
                "attendance"
            )

            if attendance:

                attendance_data = {
                    "id": attendance.id,
                    "session_id": attendance.session_id,
                    "date": attendance.date,
                    "check_in_time": (
                        attendance.check_in_time
                    ),
                    "check_out_time": (
                        attendance.check_out_time
                    ),
                    "status": attendance.status,
                    "confidence": attendance.confidence,
                    "success": (
                        attendance_result["success"]
                    ),
                    "already_marked": (
                        attendance_result[
                            "already_marked"
                        ]
                    ),
                    "message": (
                        attendance_result["message"]
                    ),
                }

        # ====================================================
        # ADD STUDENT RESULT
        # ====================================================

        students.append(
            {
                "face_number": index,
                "recognized": True,
                "similarity": round(
                    float(best_similarity),
                    4,
                ),
                "matched_pose": getattr(
                    best_profile,
                    "pose",
                    None,
                ),
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                },
                "attendance": attendance_data,
            }
        )

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "success": True,
        "message": (
            "Classroom photo analyzed successfully."
        ),
        "session_id": session_id,
        "total_faces": len(detected_faces),
        "recognized_count": recognized_count,
        "unrecognized_count": unrecognized_count,
        "attendance_marked_count": (
            attendance_marked_count
        ),
        "students": students,
    }