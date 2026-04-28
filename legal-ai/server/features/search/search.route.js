import express from 'express';
import { search } from './search.controller.js';

const router = express.Router();

router.post('/', search);

export default router;
