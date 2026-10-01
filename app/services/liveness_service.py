
import cv2
import numpy as np


class LivenessService:
    """
    Basic multi-frame liveness service.

    This version checks:
    1. A face exists in both frames.
    2. The face bounding boxes are reasonably consistent.
    3. Facial landmarks show controlled movement.

    This is a prototype liveness mechanism.
    It is not a production-grade anti-spoofing model.
    """

    def __init__(
        self,
        movement_threshold: float = 3.0,
        max_face_position_change: float = 0.35,
    ):
        self.movement_threshold = movement_threshold
        self.max_face_position_change = max_face_position_change

    def decode_image(self, image_bytes: bytes):
        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise ValueError("Invalid image")

        return image

    def calculate_landmark_movement(
        self,
        previous_points: np.ndarray,
        current_points: np.ndarray,
    ) -> float:

        if previous_points is None or current_points is None:
            return 0.0

        if previous_points.shape != current_points.shape:
            return 0.0

        distances = np.linalg.norm(
            current_points - previous_points,
            axis=1,
        )

        return float(np.mean(distances))

    def calculate_face_position_change(
        self,
        previous_bbox,
        current_bbox,
    ) -> float:

        previous_x1, previous_y1, previous_x2, previous_y2 = previous_bbox
        current_x1, current_y1, current_x2, current_y2 = current_bbox

        previous_width = max(previous_x2 - previous_x1, 1)
        previous_height = max(previous_y2 - previous_y1, 1)

        current_width = max(current_x2 - current_x1, 1)
        current_height = max(current_y2 - current_y1, 1)

        previous_center_x = (
            previous_x1 + previous_x2
        ) / 2

        previous_center_y = (
            previous_y1 + previous_y2
        ) / 2

        current_center_x = (
            current_x1 + current_x2
        ) / 2

        current_center_y = (
            current_y1 + current_y2
        ) / 2

        center_distance = np.sqrt(
            (
                current_center_x
                - previous_center_x
            ) ** 2
            +
            (
                current_center_y
                - previous_center_y
            ) ** 2
        )

        reference_size = max(
            previous_width,
            previous_height,
            1,
        )

        position_change = (
            center_distance / reference_size
        )

        return float(position_change)

    def check_motion(
        self,
        previous_face,
        current_face,
    ) -> tuple[bool, float, float]:

        previous_points = previous_face.kps
        current_points = current_face.kps

        previous_bbox = previous_face.bbox
        current_bbox = current_face.bbox

        movement = self.calculate_landmark_movement(
            previous_points,
            current_points,
        )

        position_change = (
            self.calculate_face_position_change(
                previous_bbox,
                current_bbox,
            )
        )

        movement_detected = (
            movement >= self.movement_threshold
        )

        face_consistent = (
            position_change
            <= self.max_face_position_change
        )

        is_live = (
            movement_detected
            and face_consistent
        )

        return (
            is_live,
            movement,
            position_change,
        )


liveness_service = LivenessService()
