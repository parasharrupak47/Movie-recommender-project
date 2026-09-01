"""
Content-based movie recommendation using a pre-computed cosine-similarity matrix.

The similarity matrix is built offline (see ml/notebooks/model_dev.ipynb) and
loaded once at service start, so requests are pure lookups rather than model
fits. Resolution of an incoming movie to a dataset row is deliberately
forgiving: callers pass TMDB ids and titles that may not match the dataset's
spelling exactly.

For movies NOT in the dataset (newer releases), a "fold-in" path is available:
the movie's features are fetched from TMDB, converted to a tags vector using the
saved CountVectorizer, and compared against all existing movie vectors.
"""

import logging
import os
import pickle
import re
from difflib import get_close_matches

from sklearn.metrics.pairwise import cosine_similarity

log = logging.getLogger("ml-service")

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
        # Fold-in artifacts (optional — loaded below)
        "cv": None,
        "vectors": None,
    }


def load_foldin_artifacts(artifacts: dict, model_dir: str) -> None:
    """
    Load the CountVectorizer and raw feature vectors needed for fold-in.

    These are optional: if they are missing the service still works for movies
    in the dataset, but new movies will get no recommendations.

    Mutates ``artifacts`` in place — sets the ``cv`` and ``vectors`` keys.
    """
    cv_path = os.path.join(model_dir, "cv.pkl")
    vectors_path = os.path.join(model_dir, "vectors.pkl")

    if not os.path.exists(cv_path) or not os.path.exists(vectors_path):
        log.warning(
            "Fold-in artifacts not found (cv.pkl / vectors.pkl). "
            "New movies outside the dataset will not get recommendations."
        )
        return

    with open(cv_path, "rb") as f:
        artifacts["cv"] = pickle.load(f)

    with open(vectors_path, "rb") as f:
        artifacts["vectors"] = pickle.load(f)

    log.info("Fold-in artifacts loaded (cv + vectors)")


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


# ---------------------------------------------------------------------------
# Fold-in: recommend movies for titles NOT in the pre-computed dataset
# ---------------------------------------------------------------------------

def _stem(word: str) -> str:
    """
    Apply a simple suffix-stripping stemmer to approximate what the original
    training notebook used (likely nltk.stem.PorterStemmer).

    We import PorterStemmer lazily so the module still works if nltk is not
    installed (fold-in just won't be available).
    """
    try:
        from nltk.stem.porter import PorterStemmer
    except ImportError:
        # Fallback: return the word lowercased without stemming.  The
        # CountVectorizer will still match many words even without perfect
        # stemming, so recommendations will be reasonable (just not optimal).
        return word.lower()

    # Cache the stemmer instance on the function object
    if not hasattr(_stem, "_stemmer"):
        _stem._stemmer = PorterStemmer()
    return _stem._stemmer.stem(word)


def build_tags_from_tmdb(tmdb_data: dict) -> str:
    """
    Build a tags string from TMDB feature data, matching the format used during
    training.

    The training tags are structured as::

        <stemmed overview> <genres no-spaces> <keywords no-spaces>
        <cast-names-no-spaces> <director-name-no-spaces>

    Example output::

        "a listless wade wilson toil away in civilian life..."
        "action comedi sciencefict superhero marvel..."
        "ryanreynold hughjackman emmacorrin shawnlevi"

    :param tmdb_data: dict from ``tmdb_client.fetch_movie_features()``
    :returns: single space-separated tags string
    """
    parts = []

    # 1. Overview — stem each word
    overview = tmdb_data.get("overview", "")
    if overview:
        words = re.sub(r"[^\w\s]", "", overview.lower()).split()
        parts.extend(_stem(w) for w in words)

    # 2. Genres — lowercase, remove spaces within each genre name
    for genre in tmdb_data.get("genres", []):
        parts.append(genre.lower().replace(" ", ""))

    # 3. Keywords — lowercase, remove spaces
    for kw in tmdb_data.get("keywords", []):
        parts.append(kw.lower().replace(" ", ""))

    # 4. Cast (top 3) — concatenate first+last name, lowercase, no spaces
    for name in tmdb_data.get("cast", [])[:3]:
        parts.append(name.lower().replace(" ", ""))

    # 5. Director — concatenate name, lowercase, no spaces
    director = tmdb_data.get("director", "")
    if director:
        parts.append(director.lower().replace(" ", ""))

    return " ".join(parts)


def recommend_new_movie(artifacts: dict, tmdb_data: dict, top_n: int = 5) -> dict:
    """
    Fold-in recommendation for a movie not in the pre-computed dataset.

    Builds a tags vector using the saved CountVectorizer, computes cosine
    similarity against all existing movie vectors, and returns the top N.

    :param artifacts: the loaded model artifacts (must include ``cv`` and ``vectors``)
    :param tmdb_data: dict from ``tmdb_client.fetch_movie_features()``
    :param top_n: number of recommendations to return
    :returns: same shape as ``recommend()`` output
    """
    cv = artifacts.get("cv")
    vectors = artifacts.get("vectors")

    if cv is None or vectors is None:
        log.warning("Fold-in artifacts (cv/vectors) not loaded — cannot recommend new movie")
        return {"matched_title": None, "strategy": None, "recommendations": []}

    tags = build_tags_from_tmdb(tmdb_data)
    if not tags.strip():
        return {"matched_title": None, "strategy": None, "recommendations": []}

    # Vectorize using the SAME vocabulary as training
    new_vector = cv.transform([tags]).toarray()  # shape: (1, 5000)

    # Compute similarity against all existing movies
    sims = cosine_similarity(new_vector, vectors)[0]  # shape: (4806,)

    # Sort descending, take top N
    top_indices = sims.argsort()[::-1][:max(1, int(top_n))]

    movies = artifacts["movies"]
    recommendations = []
    for idx in top_indices:
        entry = movies.iloc[int(idx)]
        recommendations.append({
            "title": str(entry["title"]),
            "movie_id": int(entry["movie_id"]) if "movie_id" in movies.columns else None,
            "similarity_score": round(float(sims[idx]), 4),
        })

    matched_title = tmdb_data.get("title", "Unknown")

    return {
        "matched_title": str(matched_title),
        "strategy": "fold_in",
        "recommendations": recommendations,
    }
