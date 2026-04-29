import express from 'express';
import { getRisk } from './risk.controller.js';
const router = express.Router();
router.get('/:id', getRisk);
export default router;
