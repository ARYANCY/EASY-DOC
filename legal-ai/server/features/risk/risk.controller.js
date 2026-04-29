import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export const getRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${FASTAPI_URL}/risk/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
};
