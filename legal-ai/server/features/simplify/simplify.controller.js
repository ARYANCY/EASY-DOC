import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export const simplify = async (req, res) => {
  try {
    const response = await axios.post(`${FASTAPI_URL}/simplify`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
};
