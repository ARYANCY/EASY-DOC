import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export const chat = async (req, res) => {
  try {
    const { doc_id, query, history } = req.body;
    const response = await axios.post(`${FASTAPI_URL}/chat`, { doc_id, query, history: history || [] });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
};
