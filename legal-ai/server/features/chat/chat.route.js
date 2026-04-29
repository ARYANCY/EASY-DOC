import express from 'express';
import { chat } from './chat.controller.js';
const router = express.Router();
router.post('/', chat);
export default router;
