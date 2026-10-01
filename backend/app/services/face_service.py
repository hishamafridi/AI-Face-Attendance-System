
import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceService:
    def __init__(self):
        self.model = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )

        self.model.prepare(
            ctx_id=0,
            det_size=(640, 640),
        )

    def decode_image(self, image_bytes: bytes):
        """
        Convert uploaded image bytes into an OpenCV image.
        """

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

    def detect_faces(self, image):
        """
        Detect all faces in an already decoded image.
        """

        if image is None:
            raise ValueError("Invalid image")

        return self.model.get(image)

    def get_embedding(self, image_bytes: bytes) -> bytes:
        """
        Get an embedding from an image containing exactly one face.

        Used for normal face enrollment and single-face recognition.
        """

        image = self.decode_image(image_bytes)

        faces = self.detect_faces(image)

        if len(faces) == 0:
            raise ValueError("No face detected")

        if len(faces) > 1:
            raise ValueError(
                "Multiple faces detected. "
                "Please upload an image with one face."
            )

        embedding = faces[0].embedding

        embedding = embedding.astype(np.float32)

        return embedding.tobytes()

    def compare_embeddings(
        self,
        embedding1,
        embedding2,
    ) -> float:
        """
        Compare two face embeddings using cosine similarity.

        Accepts either:
        - bytes
        - NumPy arrays
        """

        # Convert first embedding
        if isinstance(embedding1, bytes):
            vector1 = np.frombuffer(
                embedding1,
                dtype=np.float32,
            )
        else:
            vector1 = np.asarray(
                embedding1,
                dtype=np.float32,
            )

        # Convert second embedding
        if isinstance(embedding2, bytes):
            vector2 = np.frombuffer(
                embedding2,
                dtype=np.float32,
            )
        else:
            vector2 = np.asarray(
                embedding2,
                dtype=np.float32,
            )

        vector1 = vector1.flatten()
        vector2 = vector2.flatten()

        if vector1.shape != vector2.shape:
            raise ValueError(
                "Embedding dimensions do not match"
            )

        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)

        if norm1 == 0 or norm2 == 0:
            raise ValueError(
                "Invalid face embedding"
            )

        similarity = np.dot(
            vector1,
            vector2,
        ) / (norm1 * norm2)

        return float(similarity)


face_service = FaceService()
