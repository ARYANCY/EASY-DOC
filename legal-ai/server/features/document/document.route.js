import express from 'express';
import { getDocument } from './document.service.js';

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await getDocument(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
