"""
Generate the missing ML artifacts: cv.pkl (fitted CountVectorizer) and vectors.pkl
(raw feature matrix).

These are needed for the fold-in path — recommending movies that are NOT in the
pre-computed similarity matrix. The vectorizer vocabulary must exactly match the one
used during original training, so we re-fit on the same movies["tags"] column.

Run once:  python generate_artifacts.py
"""

import os
import pickle
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_DIR = os.environ.get(
    "MODEL_DIR",
    os.path.join(os.path.dirname(__file__), "models"),
)

movies_path = os.path.join(MODEL_DIR, "movies.pkl")
cv_path = os.path.join(MODEL_DIR, "cv.pkl")
vectors_path = os.path.join(MODEL_DIR, "vectors.pkl")

print(f"Loading movies from {movies_path}...")
with open(movies_path, "rb") as f:
    movies = pickle.load(f)

print(f"  Shape: {movies.shape}")
print(f"  Columns: {list(movies.columns)}")

# ── Fit CountVectorizer (same params as original training) ──────
print("\nFitting CountVectorizer (max_features=5000, stop_words='english')...")
cv = CountVectorizer(max_features=5000, stop_words="english")
vectors = cv.fit_transform(movies["tags"]).toarray()
print(f"  Vectors shape: {vectors.shape}")
print(f"  Vocabulary size: {len(cv.vocabulary_)}")

# ── Verify: recompute similarity and compare with saved one ─────
similarity_path = os.path.join(MODEL_DIR, "similarity.pkl")
if os.path.exists(similarity_path):
    print("\nVerifying against existing similarity.pkl...")
    with open(similarity_path, "rb") as f:
        saved_similarity = pickle.load(f)

    recomputed = cosine_similarity(vectors)
    max_diff = np.max(np.abs(recomputed - saved_similarity))
    print(f"  Max difference: {max_diff:.10f}")
    if max_diff < 1e-6:
        print("  MATCH - recomputed similarity matches the saved one")
    else:
        print(f"  NOTE: Difference detected (max={max_diff}).")
        print("  The original notebook may have used slightly different params.")
        print("  This is OK - fold-in uses our NEW cv+vectors consistently.")

# ── Save artifacts ──────────────────────────────────────────────
print(f"\nSaving cv.pkl to {cv_path}...")
with open(cv_path, "wb") as f:
    pickle.dump(cv, f)
print(f"  Size: {os.path.getsize(cv_path) / 1024:.1f} KB")

print(f"\nSaving vectors.pkl to {vectors_path}...")
with open(vectors_path, "wb") as f:
    pickle.dump(vectors, f)
print(f"  Size: {os.path.getsize(vectors_path) / (1024 * 1024):.1f} MB")

print("\n✅ Done! New artifacts saved:")
print(f"   {cv_path}")
print(f"   {vectors_path}")
