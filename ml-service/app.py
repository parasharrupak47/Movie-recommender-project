"""
Recommendation microservice.

Exposes the content-based recommender over HTTP so the Node backend can call it
without embedding Python. Model artifacts are loaded once at import time —
the similarity matrix is large, so per-request loading would be untenable.
"""

import os, urllib.request

MODEL_DIR = os.environ.get(
    "MODEL_DIR",
    os.path.join(os.path.dirname(__file__), "models"),
)
os.makedirs(MODEL_DIR, exist_ok=True)

import logging

from flask import Flask, request, jsonify
from flask_cors import CORS

from predict import load_artifacts, load_foldin_artifacts, recommend, recommend_new_movie, search_titles
from tmdb_client import fetch_movie_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ml-service")

app = Flask(__name__)

# Only the Node backend should call this service. Lock CORS to it rather than
# leaving the default wildcard open.
ALLOWED_ORIGIN = os.environ.get("BACKEND_URL", "http://localhost:8000")
CORS(app, origins=[ALLOWED_ORIGIN])


DEFAULT_TOP_N = 5
MAX_TOP_N = 20

# Load once at startup. If the pickles are missing the service still boots so
# /health can report the problem, rather than crash-looping on start.
ARTIFACTS = None
LOAD_ERROR = None

try:
    log.info("Loading model artifacts from %s", MODEL_DIR)
    ARTIFACTS = load_artifacts(MODEL_DIR)
    log.info("Loaded %d movies", len(ARTIFACTS["movies"]))
    # Load fold-in artifacts (optional — cv.pkl + vectors.pkl)
    load_foldin_artifacts(ARTIFACTS, MODEL_DIR)
except Exception as exc:                      # noqa: BLE001 - surfaced via /health
    LOAD_ERROR = str(exc)
    log.error("Failed to load artifacts: %s", exc)


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    """Reports whether the model loaded, so the backend can fail fast and clearly."""
    if ARTIFACTS is None:
        return jsonify({
            "status": "degraded",
            "model_loaded": False,
            "error": LOAD_ERROR,
        }), 503

    return jsonify({
        "status": "ok",
        "model_loaded": True,
        "movie_count": int(len(ARTIFACTS["movies"])),
    })


@app.route("/recommend", methods=["POST"])
def get_recommendations():
    """
    Body: { "movie": "Inception", "movie_id": 27205, "top_n": 5 }

    Either `movie` or `movie_id` is required. `movie_id` is preferred — it's the
    TMDB id, so it matches search results exactly and avoids title ambiguity.
    """
    if ARTIFACTS is None:
        return jsonify({"error": "Model artifacts are not loaded", "detail": LOAD_ERROR}), 503

    payload = request.get_json(silent=True) or {}

    title = payload.get("movie")
    movie_id = payload.get("movie_id")

    if not title and movie_id is None:
        return jsonify({"error": "Provide either 'movie' or 'movie_id'"}), 400

    # Clamp so a caller can't request an unbounded slice
    try:
        top_n = int(payload.get("top_n", DEFAULT_TOP_N))
    except (TypeError, ValueError):
        top_n = DEFAULT_TOP_N
    top_n = max(1, min(MAX_TOP_N, top_n))

    result = recommend(ARTIFACTS, title=title, movie_id=movie_id, top_n=top_n)

    # ── Fold-in: try to recommend for movies NOT in the dataset ──
    if not result["recommendations"] and movie_id is not None:
        tmdb_data = fetch_movie_features(movie_id)
        if tmdb_data:
            log.info("Fold-in: building tags for '%s' (TMDB %s)", tmdb_data.get("title"), movie_id)
            result = recommend_new_movie(ARTIFACTS, tmdb_data, top_n=top_n)

    if not result["recommendations"]:
        # 404 with near-miss suggestions is more useful than a bare "not found";
        # the dataset is a fixed snapshot so newer films legitimately miss.
        return jsonify({
            "error": "Movie not found in the recommendation dataset",
            "requested": {"movie": title, "movie_id": movie_id},
            "suggestions": search_titles(ARTIFACTS, title or "", limit=5),
        }), 404

    return jsonify({
        "movie": title,
        "matched_title": result["matched_title"],
        "strategy": result["strategy"],
        "recommendations": result["recommendations"],
    })


@app.route("/titles", methods=["GET"])
def titles():
    """GET /titles?q=incep — dataset titles matching a substring."""
    if ARTIFACTS is None:
        return jsonify({"error": "Model artifacts are not loaded"}), 503

    query = request.args.get("q", "")
    return jsonify({"query": query, "titles": search_titles(ARTIFACTS, query, limit=20)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)