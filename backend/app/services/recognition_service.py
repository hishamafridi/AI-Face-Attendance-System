import numpy as np


class RecognitionService:
    def __init__(self, threshold: float = 0.45):
        self.threshold = threshold

    def cosine_similarity(self, embedding1: bytes, embedding2: bytes) -> float:
        vector1 = np.frombuffer(embedding1, dtype=np.float32)
        vector2 = np.frombuffer(embedding2, dtype=np.float32)

        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(np.dot(vector1, vector2) / (norm1 * norm2))

    def is_match(
        self,
        input_embedding: bytes,
        stored_embedding: bytes,
    ) -> tuple[bool, float]:

        similarity = self.cosine_similarity(
            input_embedding,
            stored_embedding,
        )

        return similarity >= self.threshold, similarity


recognition_service = RecognitionService()