import express from 'express';
import { getDocument, listDocuments } from './document.controller.js';

const router = express.Router();

router.get('/', listDocuments);
router.get('/:id', getDocument);

export default router;
