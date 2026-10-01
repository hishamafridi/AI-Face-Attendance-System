import secrets

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.repositories.face_repository import (
    create_face_profile,
    get_all_face_profiles,
    get_face_profiles_by_user_id,
)
from app.repositories.user_repository import get_user_by_email
from app.security.dependencies import get_current_user
from app.security.password import hash_password
from app.services.face_service import face_service
from app.services.liveness_service import liveness_service


router = APIRouter(
    prefix="/face",
    tags=["Face Enrollment"],
)


# ============================================================
# STUDENT ENROLLMENT
# ============================================================

@router.post("/enroll-student")
async def enroll_student(
    full_name: str = Form(...),
    student_id: str = Form(...),
    email: str = Form(...),
    department: str = Form(...),
    class_name: str = Form(...),
    phone: str | None = Form(None),
    straight_frame: UploadFile = File(...),
    left_frame: UploadFile = File(...),
    right_frame: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enroll a new student using:

    Student information:
        - Full name
        - Student ID
        - Email
        - Department
        - Class
        - Phone

    Face information:
        - Straight pose
        - Left pose
        - Right pose

    Liveness is checked using movement between:
        Straight -> Left
        Left -> Right

    Three face embeddings are saved for the student.
    """

    # ========================================================
    # CLEAN INPUT
    # ========================================================

    full_name = full_name.strip()
    student_id = student_id.strip()
    email = email.strip().lower()
    department = department.strip()
    class_name = class_name.strip()

    if phone:
        phone = phone.strip()

    # ========================================================
    # VALIDATE STUDENT INFORMATION
    # ========================================================

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name is required.",
        )

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student ID is required.",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student email is required.",
        )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department is required.",
        )

    if not class_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Class name is required.",
        )

    # ========================================================
    # VALIDATE UPLOADED FILES
    # ========================================================

    frames = {
        "straight": straight_frame,
        "left": left_frame,
        "right": right_frame,
    }

    for pose, frame in frames.items():
        if (
            not frame.content_type
            or not frame.content_type.startswith("image/")
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{pose.capitalize()} frame must be an image.",
            )

    # ========================================================
    # CHECK DUPLICATE EMAIL
    # ========================================================

    existing_user = get_user_by_email(
        db,
        email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this email already exists.",
        )

    # ========================================================
    # CHECK DUPLICATE STUDENT ID
    # ========================================================

    existing_student = (
        db.query(User)
        .filter(User.student_id == student_id)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this Student ID already exists.",
        )

    # ========================================================
    # READ ALL IMAGES
    # ========================================================

    try:
        straight_bytes = await straight_frame.read()
        left_bytes = await left_frame.read()
        right_bytes = await right_frame.read()

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read enrollment images: {str(exc)}",
        )

    if not straight_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Straight face image is empty.",
        )

    if not left_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Left face image is empty.",
        )

    if not right_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Right face image is empty.",
        )

    # ========================================================
    # DECODE IMAGES
    # ========================================================

    straight_image = liveness_service.decode_image(
        straight_bytes
    )

    left_image = liveness_service.decode_image(
        left_bytes
    )

    right_image = liveness_service.decode_image(
        right_bytes
    )

    if straight_image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read the straight face image.",
        )

    if left_image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read the left face image.",
        )

    if right_image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read the right face image.",
        )

    # ========================================================
    # DETECT FACES
    # ========================================================

    try:
        straight_faces = face_service.detect_faces(
            straight_image
        )

        left_faces = face_service.detect_faces(
            left_image
        )

        right_faces = face_service.detect_faces(
            right_image
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Face detection failed: {str(exc)}",
        )

    # ========================================================
    # EXACTLY ONE FACE MUST EXIST
    # ========================================================

    if len(straight_faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the straight position.",
        )

    if len(left_faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the left position.",
        )

    if len(right_faces) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the right position.",
        )

    if len(straight_faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only one student should be visible "
                "in the straight position."
            ),
        )

    if len(left_faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only one student should be visible "
                "in the left position."
            ),
        )

    if len(right_faces) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only one student should be visible "
                "in the right position."
            ),
        )

    straight_face = straight_faces[0]
    left_face = left_faces[0]
    right_face = right_faces[0]

    # ========================================================
    # CHECK LANDMARKS
    # ========================================================

    if (
        not hasattr(straight_face, "kps")
        or not hasattr(left_face, "kps")
        or not hasattr(right_face, "kps")
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face landmark data is unavailable.",
        )

    # ========================================================
    # LIVENESS CHECK 1
    #
    # STRAIGHT -> LEFT
    # ========================================================

    try:
        live_left, movement_left = (
            liveness_service.check_motion(
                straight_face.kps,
                left_face.kps,
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Left movement liveness check failed: "
                f"{str(exc)}"
            ),
        )

    if not live_left:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Left movement was not detected. "
                "Please start from a straight position "
                "and slowly move your face to the left."
            ),
        )

    # ========================================================
    # LIVENESS CHECK 2
    #
    # LEFT -> RIGHT
    # ========================================================

    try:
        live_right, movement_right = (
            liveness_service.check_motion(
                left_face.kps,
                right_face.kps,
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Right movement liveness check failed: "
                f"{str(exc)}"
            ),
        )

    if not live_right:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Right movement was not detected. "
                "Please move your face from left to right."
            ),
        )

    # ========================================================
    # GENERATE FACE EMBEDDINGS
    # ========================================================

    try:
        straight_embedding = face_service.get_embedding(
            straight_bytes
        )

        left_embedding = face_service.get_embedding(
            left_bytes
        )

        right_embedding = face_service.get_embedding(
            right_bytes
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not generate face embeddings: "
                f"{str(exc)}"
            ),
        )

    if (
        straight_embedding is None
        or left_embedding is None
        or right_embedding is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not generate all required "
                "face embeddings."
            ),
        )

    # ========================================================
    # CHECK DUPLICATE FACE
    #
    # Compare all three new embeddings against
    # all existing face profiles.
    # ========================================================

    profiles = get_all_face_profiles(db)

    similarity_threshold = 0.40

    new_embeddings = [
        straight_embedding,
        left_embedding,
        right_embedding,
    ]

    for new_embedding in new_embeddings:

        for profile in profiles:

            try:
                similarity = face_service.compare_embeddings(
                    new_embedding,
                    profile.embedding,
                )

            except Exception:
                continue

            if similarity >= similarity_threshold:

                existing_face_user = db.get(
                    User,
                    profile.user_id,
                )

                if existing_face_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "This face already appears to be "
                            "enrolled for "
                            f"{existing_face_user.full_name}."
                        ),
                    )

    # ========================================================
    # CREATE STUDENT
    # ========================================================

    generated_password = secrets.token_urlsafe(32)

    student = User(
        full_name=full_name,
        student_id=student_id,
        email=email,
        department=department,
        class_name=class_name,
        phone=phone,
        password_hash=hash_password(
            generated_password
        ),
        is_active=True,
    )

    # ========================================================
    # SAVE STUDENT + THREE FACE PROFILES
    # ========================================================

    try:
        db.add(student)

        # Generate student.id before creating face profiles
        db.flush()

        straight_profile = create_face_profile(
            db=db,
            user_id=student.id,
            embedding=straight_embedding,
            pose="straight",
        )

        left_profile = create_face_profile(
            db=db,
            user_id=student.id,
            embedding=left_embedding,
            pose="left",
        )

        right_profile = create_face_profile(
            db=db,
            user_id=student.id,
            embedding=right_embedding,
            pose="right",
        )

        db.commit()

        db.refresh(student)
        db.refresh(straight_profile)
        db.refresh(left_profile)
        db.refresh(right_profile)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Could not save the student enrollment: "
                f"{str(exc)}"
            ),
        )

    # ========================================================
    # SUCCESS RESPONSE
    # ========================================================

    return {
        "success": True,
        "message": "Student enrolled successfully.",

        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "student_id": student.student_id,
            "email": student.email,
            "department": student.department,
            "class_name": student.class_name,
            "phone": student.phone,
        },

        "face_profiles": [
            {
                "id": straight_profile.id,
                "pose": straight_profile.pose,
            },
            {
                "id": left_profile.id,
                "pose": left_profile.pose,
            },
            {
                "id": right_profile.id,
                "pose": right_profile.pose,
            },
        ],

        "liveness": {
            "complete": True,
            "straight_to_left_movement": round(
                float(movement_left),
                4,
            ),
            "left_to_right_movement": round(
                float(movement_right),
                4,
            ),
            "threshold": liveness_service.movement_threshold,
        },
    }


# ============================================================
# OLD SINGLE FACE ENROLLMENT
# ============================================================

@router.post("/enroll")
async def enroll_face(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Single-image face enrollment.

    Kept for compatibility with the older system.

    The main student enrollment should use:
        POST /face/enroll-student
    """

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

    try:
        embedding = face_service.get_embedding(
            image_bytes
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not generate face embedding: "
                f"{str(exc)}"
            ),
        )

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate a face embedding.",
        )

    try:
        face_profile = create_face_profile(
            db=db,
            user_id=current_user.id,
            embedding=embedding,
            pose="straight",
        )

        db.commit()
        db.refresh(face_profile)

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Could not save face profile: "
                f"{str(exc)}"
            ),
        )

    return {
        "success": True,
        "message": "Face enrolled successfully.",
        "user_id": current_user.id,
        "face_profile_id": face_profile.id,
        "pose": face_profile.pose,
    }


# ============================================================
# GET CURRENT USER FACE PROFILES
# ============================================================

@router.get("/profile")
def get_face_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profiles = get_face_profiles_by_user_id(
        db,
        current_user.id,
    )

    if not profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Face profiles not found.",
        )

    return {
        "success": True,
        "user_id": current_user.id,
        "profiles": [
            {
                "id": profile.id,
                "pose": profile.pose,
                "created_at": profile.created_at,
            }
            for profile in profiles
        ],
    }


# ============================================================
# FACE RECOGNITION
# ============================================================

@router.post("/recognize")
async def recognize_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Recognize a face by comparing it against ALL
    enrolled face profiles.

    Each student can have:

        - straight
        - left
        - right

    The highest similarity is used.
    """

    # ========================================================
    # VALIDATE IMAGE
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
    # GENERATE QUERY EMBEDDING
    # ========================================================

    try:
        query_embedding = face_service.get_embedding(
            image_bytes
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not generate face embedding: "
                f"{str(exc)}"
            ),
        )

    if query_embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate a face embedding.",
        )

    # ========================================================
    # GET ALL ENROLLED FACE PROFILES
    # ========================================================

    profiles = get_all_face_profiles(db)

    if not profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No enrolled faces found.",
        )

    # ========================================================
    # FIND BEST MATCH
    # ========================================================

    best_profile = None
    best_similarity = -1.0

    for profile in profiles:

        try:
            similarity = face_service.compare_embeddings(
                query_embedding,
                profile.embedding,
            )

        except Exception:
            continue

        if similarity > best_similarity:
            best_similarity = similarity
            best_profile = profile

    # ========================================================
    # RECOGNITION THRESHOLD
    # ========================================================

    threshold = 0.40

    if (
        best_profile is None
        or best_similarity < threshold
    ):
        return {
            "success": True,
            "recognized": False,
            "message": "Face not recognized.",
            "similarity": round(
                float(best_similarity),
                4,
            ),
        }

    # ========================================================
    # FIND STUDENT
    # ========================================================

    user = db.get(
        User,
        best_profile.user_id,
    )

    if not user:
        return {
            "success": True,
            "recognized": False,
            "message": (
                "User associated with face "
                "was not found."
            ),
            "similarity": round(
                float(best_similarity),
                4,
            ),
        }

    # ========================================================
    # SUCCESSFUL RECOGNITION
    # ========================================================

    return {
        "success": True,
        "recognized": True,
        "message": "Face recognized successfully.",
        "similarity": round(
            float(best_similarity),
            4,
        ),
        "matched_pose": best_profile.pose,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "student_id": user.student_id,
            "email": user.email,
            "department": user.department,
            "class_name": user.class_name,
            "phone": user.phone,
        },
    }