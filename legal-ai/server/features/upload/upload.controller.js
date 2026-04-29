import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are supported'), false);
    }
  },
});

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${FASTAPI_URL}/parse`, formData, {
      headers: { ...formData.getHeaders() },
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    res.json(response.data);
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ success: false, error: err.response?.data?.detail || err.message });
  }
};
