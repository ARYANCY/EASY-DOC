import express from 'express';
import { upload, uploadDocument } from './upload.controller.js';

const router = express.Router();

router.post('/', upload.single('file'), uploadDocument);

export default router;
