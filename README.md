# Advanced Movie Recommendation System

A Netflix-inspired movie recommendation system with a React frontend, FastAPI backend, and a content-based ML engine.

## Project Structure

```
advanced-movie-recommendation-system/
├── frontend/        # React + Vite UI
├── backend/         # FastAPI REST API
├── ml/              # Notebooks + trained model artifacts
├── docker/          # Dockerfiles + docker-compose
└── docs/            # Architecture docs, notes
```

## Getting Started

### ML — Train the model
```bash
cd ml
pip install -r requirements.txt
# Open notebooks/model_dev.ipynb and run all cells
# Artifacts are saved to ml/models/
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack
- **Frontend**: React, Vite, React Router
- **Backend**: FastAPI, SQLAlchemy, JWT Auth
- **ML**: scikit-learn, pandas, TMDB API
- **Deploy**: Docker, docker-compose
