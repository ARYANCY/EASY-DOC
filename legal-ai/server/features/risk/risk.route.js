import express from 'express';
import { getRisk } from './risk.service.js';

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await getRisk(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
