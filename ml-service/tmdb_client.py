"""
Lightweight TMDB client for the ML service.

Used only for the fold-in path: when a requested movie is not in the pre-computed
dataset, we fetch its features from TMDB and build a tags vector on the fly.

This is intentionally minimal — the heavy TMDB integration (posters, trending,
search) lives in the Node.js backend. This module fetches only the fields needed
for feature engineering: overview, genres, keywords, cast, and crew.
"""

import os
import logging
import requests

log = logging.getLogger("ml-service")

TMDB_BASE = "https://api.themoviedb.org/3"

def _get_api_key():
    key = os.environ.get("TMDB_API_KEY", "")
    if key: return key
    
    # Fallback to reading the backend .env file
    try:
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("TMDB_API_KEY="):
                        return line.split("=", 1)[1].strip()
    except Exception as e:
        log.warning("Could not read backend .env for TMDB API key: %s", e)
    return ""

TMDB_API_KEY = _get_api_key()

# Timeout for TMDB API calls (seconds)
_TIMEOUT = 8


def fetch_movie_features(movie_id):
    """
    Fetch the features needed to build a tags string for a movie.

    Uses a single TMDB call with ``append_to_response`` to get everything at once:
    overview, genres, credits (cast + crew), and keywords.

    Returns a dict on success::

        {
            "title":    "Deadpool & Wolverine",
            "overview": "A listless Wade Wilson toils away ...",
            "genres":   ["Action", "Comedy", "Science Fiction"],
            "keywords": ["superhero", "marvel", ...],
            "cast":     ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin"],
            "director": "Shawn Levy",
        }

    Returns ``None`` on any failure (missing key, network error, etc.).
    """
    if not TMDB_API_KEY:
        log.warning("TMDB_API_KEY is not set — cannot fetch features for fold-in")
        return None

    try:
        resp = requests.get(
            f"{TMDB_BASE}/movie/{movie_id}",
            params={
                "api_key": TMDB_API_KEY,
                "append_to_response": "credits,keywords",
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        log.warning("TMDB fetch failed for movie_id=%s: %s", movie_id, exc)
        return None

    # --- Extract fields ------------------------------------------------
    title = data.get("title", "")
    overview = data.get("overview", "")

    genres = [g["name"] for g in data.get("genres", [])]

    # Keywords are nested under data["keywords"]["keywords"]
    kw_block = data.get("keywords", {})
    keywords = [k["name"] for k in kw_block.get("keywords", [])]

    # Top 3 cast members (matching the original training)
    credits = data.get("credits", {})
    cast_list = credits.get("cast", [])
    cast = [c["name"] for c in cast_list[:3]]

    # Director from crew
    crew_list = credits.get("crew", [])
    director = ""
    for member in crew_list:
        if member.get("job") == "Director":
            director = member.get("name", "")
            break

    return {
        "title": title,
        "overview": overview,
        "genres": genres,
        "keywords": keywords,
        "cast": cast,
        "director": director,
    }
