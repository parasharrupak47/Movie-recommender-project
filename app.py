import streamlit as st
import pickle
import pandas as pd
import requests
import os
import time

# ===================== TMDB CONFIG =====================
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "268364d1f6b16232211778c78ac9e419")

# ===================== POSTER FETCH =====================
@st.cache_data(show_spinner=False)
def fetch_poster(movie_id):
    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}"
        params = {
            "api_key": TMDB_API_KEY,
            "language": "en-US"
        }
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        }

        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10
        )

        if response.status_code != 200:
            return "https://via.placeholder.com/500x750?text=No+Image"

        data = response.json()
        poster_path = data.get("poster_path")

        if poster_path is None:
            return "https://via.placeholder.com/500x750?text=No+Image"

        return "https://image.tmdb.org/t/p/w500" + poster_path

    except requests.exceptions.RequestException:
        return "https://via.placeholder.com/500x750?text=Error"

# ===================== RECOMMENDATION =====================
def recommend(movie):
    movie_index = movies[movies['title'] == movie].index[0]
    distances = similarity[movie_index]

    movie_list = sorted(
        list(enumerate(distances)),
        key=lambda x: x[1],
        reverse=True
    )[1:6]

    recommended_movies = []
    recommended_movies_posters = []

    for i in movie_list:
        movie_id = movies.iloc[i[0]].movie_id
        recommended_movies.append(movies.iloc[i[0]].title)
        recommended_movies_posters.append(fetch_poster(movie_id))
        time.sleep(0.2)  # prevents TMDB rate-limit resets

    return recommended_movies, recommended_movies_posters

# ===================== LOAD DATA =====================
movies_dict = pickle.load(open("movie_dict.pkl", "rb"))
movies = pd.DataFrame(movies_dict)

similarity = pickle.load(open("similarity.pkl", "rb"))

# ===================== STREAMLIT UI =====================
st.title("Movie Recommender System")

selected_movie_name = st.selectbox(
    "Which movie are you looking for TODAY?",
    movies["title"].values
)

if st.button("Recommend"):
    names, posters = recommend(selected_movie_name)

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        st.text(names[0])
        st.image(posters[0])

    with col2:
        st.text(names[1])
        st.image(posters[1])

    with col3:
        st.text(names[2])
        st.image(posters[2])

    with col4:
        st.text(names[3])
        st.image(posters[3])

    with col5:
        st.text(names[4])
        st.image(posters[4])
