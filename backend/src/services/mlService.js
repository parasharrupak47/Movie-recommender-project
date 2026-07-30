import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

/**
 * Calls the Python Flask ml-service to get movie recommendations.
 * @param {string} movieTitle
 * @param {number} topN  - number of results (default 5)
 * @returns {Array} [{ title, movie_id, similarity_score }]
 */
export const fetchRecommendations = async (movieTitle, topN = 5) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/recommend`, {
      movie: movieTitle,
      top_n: topN,
    });
    return response.data.recommendations;
  } catch (err) {
    if (err.response) {
      throw new Error(err.response.data?.error || "ML service error");
    }
    throw new Error("ML service is unavailable. Make sure it is running on port 5001.");
  }
};
