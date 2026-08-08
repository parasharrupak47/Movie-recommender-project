import os, urllib.request

MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.dirname(__file__), "models"))
os.makedirs(MODEL_DIR, exist_ok=True)

FILES = {
    "movie_dict.pkl": "https://huggingface.co/parasharrupak47/Movie-Recommender-Artifacts/resolve/main/movie_dict.pkl",
    "movies.pkl": "https://huggingface.co/parasharrupak47/Movie-Recommender-Artifacts/resolve/main/movies.pkl",
    "similarity.pkl": "https://huggingface.co/parasharrupak47/Movie-Recommender-Artifacts/resolve/main/similarity.pkl",
}
for fname, url in FILES.items():
    path = os.path.join(MODEL_DIR, fname)
    if not os.path.exists(path):
        print(f"Downloading {fname}...")
        urllib.request.urlretrieve(url, path)
        print(f"Done: {fname}")