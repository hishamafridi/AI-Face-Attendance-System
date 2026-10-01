from sqlalchemy.orm import Session

from app.models import User
from app.repositories.face_repository import get_all_face_profiles
from app.services.attendance_service import attendance_service
from app.services.face_service import face_service
from app.services.liveness_service import liveness_service
from app.services.recognition_service import recognition_service


class FaceAttendanceService:

    def process_attendance(
        self,
        db: Session,
        previous_frame: bytes,
        current_frame: bytes,
        session_id: int,
    ):
        # ================================================
        # 1. DECODE BOTH IMAGES
        # ================================================

        previous_image = liveness_service.decode_image(
            previous_frame
        )

        current_image = liveness_service.decode_image(
            current_frame
        )

        if previous_image is None:
            return {
                "success": False,
                "stage": "image",
                "message": "Could not decode previous frame",
            }

        if current_image is None:
            return {
                "success": False,
                "stage": "image",
                "message": "Could not decode current frame",
            }

        # ================================================
        # 2. LIVENESS DETECTION
        # ================================================

        try:
            previous_faces = face_service.detect_faces(
                previous_image
            )

            current_faces = face_service.detect_faces(
                current_image
            )

        except Exception as e:
            return {
                "success": False,
                "stage": "liveness",
                "message": f"Face detection failed: {str(e)}",
            }

        if len(previous_faces) == 0:
            return {
                "success": False,
                "stage": "liveness",
                "message": "No face detected in previous frame",
            }

        if len(current_faces) == 0:
            return {
                "success": False,
                "stage": "liveness",
                "message": "No face detected in current frame",
            }

        previous_face = previous_faces[0]
        current_face = current_faces[0]

        previous_points = previous_face.kps
        current_points = current_face.kps

        is_live, movement = liveness_service.check_motion(
            previous_points,
            current_points,
        )

        liveness_result = {
            "live": is_live,
            "movement": round(movement, 4),
            "threshold": liveness_service.movement_threshold,
        }

        if not is_live:
            return {
                "success": False,
                "stage": "liveness",
                "message": "Liveness check failed",
                "liveness": liveness_result,
            }

        # ================================================
        # 3. FACE EMBEDDING
        # ================================================

        try:
            input_embedding = face_service.get_embedding(
                current_frame
            )

        except ValueError as e:
            return {
                "success": False,
                "stage": "recognition",
                "message": str(e),
            }

        # ================================================
        # 4. GET ENROLLED FACES
        # ================================================

        profiles = get_all_face_profiles(db)

        if not profiles:
            return {
                "success": False,
                "stage": "recognition",
                "message": "No enrolled faces found",
            }

        # ================================================
        # 5. FIND BEST FACE MATCH
        # ================================================

        best_match = None
        best_similarity = -1.0

        for profile in profiles:

            is_match, similarity = (
                recognition_service.is_match(
                    input_embedding,
                    profile.embedding,
                )
            )

            if similarity > best_similarity:
                best_similarity = similarity
                best_match = profile

        # ================================================
        # 6. VERIFY RECOGNITION
        # ================================================

        if (
            best_match is None
            or best_similarity
            < recognition_service.threshold
        ):
            return {
                "success": False,
                "stage": "recognition",
                "message": "Face not recognized",
                "similarity": round(
                    best_similarity,
                    4,
                ),
                "liveness": liveness_result,
            }

        # ================================================
        # 7. GET USER
        # ================================================

        user = db.get(
            User,
            best_match.user_id,
        )

        if user is None:
            return {
                "success": False,
                "stage": "user",
                "message": "Recognized user not found",
            }

        # ================================================
        # 8. MARK ATTENDANCE
        # ================================================

        attendance_result = attendance_service.check_in(
            db=db,
            user_id=user.id,
            session_id=session_id,
            confidence=best_similarity,
        )

        attendance = attendance_result["attendance"]

        # ================================================
        # 9. ATTENDANCE FAILED / ALREADY MARKED
        # ================================================

        if attendance is None:
            return {
                "success": attendance_result["success"],
                "already_marked": attendance_result[
                    "already_marked"
                ],
                "message": attendance_result["message"],
                "liveness": liveness_result,
                "recognition": {
                    "recognized": True,
                    "user_id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "similarity": round(
                        best_similarity,
                        4,
                    ),
                },
                "attendance": None,
            }

        # ================================================
        # 10. FINAL RESPONSE
        # ================================================

        return {
            "success": attendance_result["success"],
            "already_marked": attendance_result[
                "already_marked"
            ],
            "message": attendance_result["message"],
            "liveness": liveness_result,
            "recognition": {
                "recognized": True,
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "similarity": round(
                    best_similarity,
                    4,
                ),
            },
            "attendance": {
                "id": attendance.id,
                "session_id": attendance.session_id,
                "date": attendance.date,
                "check_in_time": attendance.check_in_time,
                "check_out_time": attendance.check_out_time,
                "status": attendance.status,
                "confidence": attendance.confidence,
            },
        }


face_attendance_service = FaceAttendanceService()