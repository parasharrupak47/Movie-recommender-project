# Movie Recommender System

A movie recommendation application built with Streamlit that suggests similar movies based on your selection. The app uses content-based filtering and fetches movie posters from TMDB API.

## Features

- 🎬 Select from thousands of movies
- 🎯 Get 5 personalized movie recommendations
- 🖼️ View movie posters for each recommendation
- ⚡ Fast and responsive interface

## Local Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   streamlit run app.py
   ```

4. Open your browser to `http://localhost:8501`

## Deployment on Streamlit Cloud

### Prerequisites
- GitHub account
- Streamlit Cloud account (free at [share.streamlit.io](https://share.streamlit.io))

### Steps to Deploy:

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Streamlit Cloud:**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Click "New app"
   - Select your GitHub repository
   - Set main file path: `app.py`
   - Click "Deploy"

3. **Optional: Add TMDB API Key as Secret:**
   - In Streamlit Cloud dashboard, go to your app settings
   - Add secret: `TMDB_API_KEY = "your_api_key_here"`

### Important Notes:

⚠️ **File Size Limitations:**
- Streamlit Cloud has a 1GB limit per app
- If your `.pkl` files (especially `similarity.pkl`) are very large, you may need to:
  - Store them in Git LFS (Large File Storage)
  - Host them externally (e.g., Google Drive, AWS S3)
  - Reduce the similarity matrix size

## Alternative Deployment Options

### Option 1: Streamlit Cloud (Recommended)
- Free hosting
- Easy deployment from GitHub
- Automatic updates on git push

### Option 2: Heroku
```bash
# Already configured with Procfile
heroku create your-app-name
git push heroku main
```

### Option 3: Railway
- Connect your GitHub repo
- Railway auto-detects Streamlit apps
- No additional configuration needed

### Option 4: Local Network
```bash
streamlit run app.py --server.address 0.0.0.0
```

## Files Structure

```
movie-recommender/
│
├── app.py                 # Main Streamlit application
├── movie_dict.pkl         # Movies dataset
├── similarity.pkl         # Similarity matrix
├── requirements.txt       # Python dependencies
├── .streamlit/
│   └── config.toml       # Streamlit configuration
├── Procfile              # For Heroku deployment
└── README.md             # This file
```

## Technologies Used

- **Streamlit** - Web framework
- **Pandas** - Data manipulation
- **Pickle** - Model serialization
- **Requests** - API calls to TMDB
- **TMDB API** - Movie posters and data

## License

MIT License

## Support

For issues or questions, please open an issue on GitHub.
