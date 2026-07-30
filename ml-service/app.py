from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import load_artifacts, recommend
import os

app = Flask(__name__)
CORS(app)

# Load artifacts once at startup
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
movies, similarity = load_artifacts(MODEL_DIR)


@app.route("/", methods=["GET"])
def health():
    return jsonify({"message": "ML service is running"})


@app.route("/recommend", methods=["POST"])
def get_recommendations():
    data = request.get_json()

    movie_title = data.get("movie")
    top_n = data.get("top_n", 5)

    if not movie_title:
        return jsonify({"error": "movie field is required"}), 400

    # Check if movie exists in dataset
    if movie_title not in movies["title"].values:
        return jsonify({"error": f"Movie '{movie_title}' not found in dataset"}), 404

    results = recommend(movie_title, movies, similarity, top_n=top_n)
    return jsonify({"movie": movie_title, "recommendations": results})


if __name__ == "__main__":
    app.run(port=5001, debug=False)
