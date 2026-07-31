"""
Content-based movie recommendation using a pre-computed cosine-similarity matrix.

The similarity matrix is built offline (see ml/notebooks/model_dev.ipynb) and
loaded once at service start, so requests are pure lookups rather than model
fits. Resolution of an incoming movie to a dataset row is deliberately
forgiving: callers pass TMDB ids and titles that may not match the dataset's
spelling exactly.
"""

import os
import pickle
import re
from difflib import get_close_matches

# Titles below this similarity ratio are not considered a match
FUZZY_CUTOFF = 0.6


def _normalise(title: str) -> str:
    """
    Lowercase and strip punctuation/spacing so cosmetic differences between
    TMDB and the local dataset don't prevent a match.

    "Spider-Man: No Way Home" and "spiderman no way home" both become
    "spiderman no way home".
    """
    text = str(title).lower().strip()
    text = re.sub(r"[^\w\s]", "", text)   # drop punctuation
    text = re.sub(r"\s+", " ", text)      # collapse whitespace
    return text


def load_artifacts(model_dir: str) -> dict:
    """
    Load the movies dataframe and similarity matrix, and build lookup indexes.

    Returns a dict holding the dataframe, the matrix, and two indexes used to
    resolve requests: one keyed by TMDB movie id, one by normalised title.

    :raises FileNotFoundError: if either pickle is missing
    """
    movies_path = os.path.join(model_dir, "movies.pkl")
    similarity_path = os.path.join(model_dir, "similarity.pkl")

    missing = [p for p in (movies_path, similarity_path) if not os.path.exists(p)]
    if missing:
        raise FileNotFoundError(
            f"Model files not found: {', '.join(missing)}. "
            "Run ml/notebooks/model_dev.ipynb to generate them."
        )

    with open(movies_path, "rb") as f:
        movies = pickle.load(f)

    with open(similarity_path, "rb") as f:
        similarity = pickle.load(f)

    # movie_id → row position. Built once so lookups are O(1) per request.
    id_index = {}
    if "movie_id" in movies.columns:
        for position, raw_id in enumerate(movies["movie_id"].values):
            try:
                id_index[int(raw_id)] = position
            except (TypeError, ValueError):
                continue

    # normalised title → row position (first occurrence wins on duplicates)
    title_index = {}
    for position, raw_title in enumerate(movies["title"].values):
        key = _normalise(raw_title)
        if key and key not in title_index:
            title_index[key] = position

    return {
        "movies": movies,
        "similarity": similarity,
        "id_index": id_index,
        "title_index": title_index,
    }


def resolve_index(artifacts: dict, title: str = None, movie_id=None):
    """
    Find the dataset row for a requested movie.

    Resolution order, most to least reliable:
      1. TMDB movie id — exact, and the same id space the search API returns
      2. Exact normalised title
      3. Closest fuzzy title above FUZZY_CUTOFF

    :returns: (row_position, matched_title, strategy) or (None, None, None)
    """
    # 1. By TMDB id
    if movie_id is not None:
        try:
            position = artifacts["id_index"].get(int(movie_id))
        except (TypeError, ValueError):
            position = None

        if position is not None:
            return position, artifacts["movies"].iloc[position]["title"], "movie_id"

    if not title:
        return None, None, None

    # 2. Exact match after normalisation
    key = _normalise(title)
    position = artifacts["title_index"].get(key)
    if position is not None:
        return position, artifacts["movies"].iloc[position]["title"], "exact_title"

    # 3. Fuzzy match against normalised keys
    candidates = get_close_matches(key, artifacts["title_index"].keys(), n=1, cutoff=FUZZY_CUTOFF)
    if candidates:
        position = artifacts["title_index"][candidates[0]]
        return position, artifacts["movies"].iloc[position]["title"], "fuzzy_title"

    return None, None, None


def recommend(artifacts: dict, title: str = None, movie_id=None, top_n: int = 5) -> dict:
    """
    Return the `top_n` most similar movies to the requested one.

    :returns: dict with `matched_title`, `strategy`, and `recommendations`
              (each having title, movie_id, similarity_score).
              `recommendations` is empty and `matched_title` is None when the
              movie can't be resolved.
    """
    position, matched_title, strategy = resolve_index(artifacts, title, movie_id)

    if position is None:
        return {"matched_title": None, "strategy": None, "recommendations": []}

    movies = artifacts["movies"]
    scores = list(enumerate(artifacts["similarity"][position]))

    # Sort by score, then drop the movie itself (always rank 1 against itself)
    ranked = sorted(scores, key=lambda pair: pair[1], reverse=True)
    ranked = [pair for pair in ranked if pair[0] != position][: max(1, int(top_n))]

    recommendations = []
    for row, score in ranked:
        entry = movies.iloc[row]
        recommendations.append({
            "title": str(entry["title"]),
            "movie_id": int(entry["movie_id"]) if "movie_id" in movies.columns else None,
            "similarity_score": round(float(score), 4),
        })

    return {
        "matched_title": str(matched_title),
        "strategy": strategy,
        "recommendations": recommendations,
    }


def search_titles(artifacts: dict, query: str, limit: int = 10) -> list:
    """Return dataset titles containing `query`, for autocomplete or debugging."""
    key = _normalise(query)
    if not key:
        return []

    matches = [
        str(artifacts["movies"].iloc[position]["title"])
        for normalised, position in artifacts["title_index"].items()
        if key in normalised
    ]
    return matches[:limit]
