import express from 'express';
import { simplify } from './simplify.controller.js';
const router = express.Router();
router.post('/', simplify);
export default router;
