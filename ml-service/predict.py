import pickle
import os


def load_artifacts(model_dir: str):
    """Load movies dataframe and similarity matrix from .pkl files."""
    movies_path = os.path.join(model_dir, "movies.pkl")
    similarity_path = os.path.join(model_dir, "similarity.pkl")

    if not os.path.exists(movies_path) or not os.path.exists(similarity_path):
        raise FileNotFoundError(
            f"Model files not found in {model_dir}. "
            "Run ml/notebooks/model_dev.ipynb first to generate them."
        )

    movies = pickle.load(open(movies_path, "rb"))
    similarity = pickle.load(open(similarity_path, "rb"))
    return movies, similarity


def recommend(movie_title: str, movies, similarity, top_n: int = 5):
    """
    Return top_n recommendations for a given movie title.
    Each result includes title, movie_id, and similarity_score.
    """
    index = movies[movies["title"] == movie_title].index[0]
    distances = list(enumerate(similarity[index]))

    sorted_movies = sorted(distances, key=lambda x: x[1], reverse=True)[1: top_n + 1]

    results = []
    for i, score in sorted_movies:
        results.append({
            "title": movies.iloc[i]["title"],
            "movie_id": int(movies.iloc[i]["movie_id"]),
            "similarity_score": round(float(score), 4),
        })

    return results
