"""Vector Embedding Generation Service.

Wraps sentence-transformers (all-MiniLM-L6-v2) to generate 384-dimensional semantic embeddings
for natural language food search with graceful deterministic fallback.
"""

import hashlib
import logging
import math
from typing import List, Optional

from app.config import settings

logger = logging.getLogger("campuseats.embeddings")

_model_instance = None
_model_failed = False
DIMENSION = 384


def _get_embedding_model():
    """Lazy-load the sentence-transformers model instance on first request."""
    global _model_instance, _model_failed
    if _model_failed:
        return None

    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformers embedding model: %s", settings.EMBEDDING_MODEL_NAME)
            _model_instance = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Successfully loaded embedding model (%d-dim)", DIMENSION)
        except Exception as exc:
            logger.warning(
                "Could not load sentence-transformers model '%s' (%s). "
                "Switching to deterministic fallback vector synthesizer.",
                settings.EMBEDDING_MODEL_NAME,
                exc,
            )
            _model_failed = True
            _model_instance = None

    return _model_instance


def _deterministic_pseudo_embedding(text: str, dim: int = DIMENSION) -> List[float]:
    """Generate a deterministic normalized unit vector from MD5 hash of text."""
    seed_bytes = hashlib.md5(text.strip().lower().encode("utf-8")).digest()
    curr = int.from_bytes(seed_bytes, "big")

    values: List[float] = []
    for _ in range(dim):
        curr = (curr * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF
        unit = ((curr >> 32) & 0xFFFFFFFF) / 4294967295.0
        values.append(unit - 0.5)

    # Normalize vector to unit length
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [round(v / norm, 6) for v in values]


def generate_embedding(text: str) -> List[float]:
    """Generate a 384-dimensional semantic vector for input text.

    Returns deterministic fallback embedding if model is offline or uninstalled.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return [0.0] * DIMENSION

    model = _get_embedding_model()
    if model is not None:
        try:
            embedding = model.encode(cleaned, normalize_embeddings=True)
            return [float(x) for x in embedding]
        except Exception as exc:
            logger.warning("Embedding model encoding failed: %s. Using fallback.", exc)

    return _deterministic_pseudo_embedding(cleaned, dim=DIMENSION)


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate normalized semantic embeddings for a batch of text strings."""
    if not texts:
        return []

    model = _get_embedding_model()
    if model is not None:
        try:
            cleaned_texts = [t.strip() for t in texts]
            embeddings = model.encode(cleaned_texts, normalize_embeddings=True)
            return [[float(x) for x in row] for row in embeddings]
        except Exception as exc:
            logger.warning("Batch embedding encoding failed: %s. Using fallback.", exc)

    return [_deterministic_pseudo_embedding(t, dim=DIMENSION) for t in texts]
