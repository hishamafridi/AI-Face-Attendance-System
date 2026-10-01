
import cv2
import numpy as np


class LivenessService:
    """
    Liveness and image utility service for the AI Face Attendance System.

    The enrollment process uses three poses:

    1. Straight
    2. Left
    3. Right

    This service provides:
    - Image decoding
    - Landmark movement calculation
    - Motion/liveness checking
    - Left/right movement validation
    """

    def __init__(
        self,
        movement_threshold: float = 5.0,
    ):
        self.movement_threshold = movement_threshold

    # ============================================================
    # IMAGE DECODING
    # ============================================================

    def decode_image(self, image_bytes: bytes):
        """
        Convert uploaded image bytes into an OpenCV image.
        """

        if not image_bytes:
            return None

        try:
            image_array = np.frombuffer(
                image_bytes,
                dtype=np.uint8,
            )

            image = cv2.imdecode(
                image_array,
                cv2.IMREAD_COLOR,
            )

            return image

        except Exception:
            return None

    # ============================================================
    # LANDMARK MOVEMENT
    # ============================================================

    def calculate_movement(
        self,
        previous_points: np.ndarray,
        current_points: np.ndarray,
    ) -> float:
        """
        Calculate the average movement between two sets
        of facial landmarks.
        """

        if previous_points is None:
            return 0.0

        if current_points is None:
            return 0.0

        try:
            previous_points = np.asarray(
                previous_points,
                dtype=np.float32,
            )

            current_points = np.asarray(
                current_points,
                dtype=np.float32,
            )

        except Exception:
            return 0.0

        if previous_points.shape != current_points.shape:
            return 0.0

        if previous_points.size == 0:
            return 0.0

        distances = np.linalg.norm(
            current_points - previous_points,
            axis=1,
        )

        return float(np.mean(distances))

    # ============================================================
    # GENERIC MOTION CHECK
    # ============================================================

    def check_motion(
        self,
        previous_points: np.ndarray,
        current_points: np.ndarray,
    ) -> tuple[bool, float]:
        """
        Check whether enough facial movement occurred.

        Returns:

            (True, movement)
                when movement is above the threshold.

            (False, movement)
                when movement is too small.
        """

        movement = self.calculate_movement(
            previous_points,
            current_points,
        )

        is_live = (
            movement >= self.movement_threshold
        )

        return is_live, movement

    # ============================================================
    # LEFT / RIGHT MOVEMENT CHECK
    # ============================================================

    def check_head_movement(
        self,
        previous_points: np.ndarray,
        current_points: np.ndarray,
        minimum_movement: float | None = None,
    ) -> tuple[bool, float]:
        """
        Check whether the face moved enough between two poses.

        This is used during:

            Straight -> Left
            Left -> Right
        """

        threshold = (
            minimum_movement
            if minimum_movement is not None
            else self.movement_threshold
        )

        movement = self.calculate_movement(
            previous_points,
            current_points,
        )

        return movement >= threshold, movement

    # ============================================================
    # VALIDATE LANDMARKS
    # ============================================================

    def valid_landmarks(
        self,
        points: np.ndarray,
    ) -> bool:
        """
        Check whether InsightFace returned usable landmarks.
        """

        if points is None:
            return False

        try:
            points = np.asarray(
                points,
                dtype=np.float32,
            )
        except Exception:
            return False

        if points.size == 0:
            return False

        if len(points.shape) != 2:
            return False

        if points.shape[1] != 2:
            return False

        if not np.isfinite(points).all():
            return False

        return True


# ================================================================
# SINGLE SERVICE INSTANCE
# ================================================================

liveness_service = LivenessService(
    movement_threshold=5.0,
)
