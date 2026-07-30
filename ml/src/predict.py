# Prediction logic — loads .pkl artifacts and returns recommendations
# Called by the backend service layer

import pickle

def load_artifacts(model_dir: str):
    movies = pickle.load(open(f"{model_dir}/movies.pkl", "rb"))
    similarity = pickle.load(open(f"{model_dir}/similarity.pkl", "rb"))
    return movies, similarity

def recommend(movie_title: str, movies, similarity, top_n: int = 5):
    """Return top_n recommended movie titles and their IDs."""
    index = movies[movies["title"] == movie_title].index[0]
    distances = similarity[index]
    movie_list = sorted(
        list(enumerate(distances)), reverse=True, key=lambda x: x[1]
    )[1 : top_n + 1]
    return [
        {"title": movies.iloc[i[0]].title, "movie_id": int(movies.iloc[i[0]].movie_id)}
        for i in movie_list
    ]
