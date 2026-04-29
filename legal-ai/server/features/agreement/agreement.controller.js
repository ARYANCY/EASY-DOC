import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as agreementService from './agreement.service.js';

export const uploadTemplate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const name = req.body.name || req.file.originalname;
    const templateUrl = req.file.path;
    const agreement = await agreementService.createAgreement(name, templateUrl);
    res.status(201).json(agreement);
  } catch (err) {
    next(err);
  }
};

export const generateText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prompt, context } = req.body;
    
    // Call Python NLP service
    const nlpUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const nlpRes = await axios.post(`${nlpUrl}/agreement/generate`, { prompt, context });
    
    const generatedText = nlpRes.data.text;
    const agreement = await agreementService.addVersion(id, generatedText, 'ai');
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const editText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const agreement = await agreementService.addVersion(id, text, 'manual');
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const setVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    const agreement = await agreementService.setVersionPointer(id, parseInt(version, 10));
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const approveText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.approveAgreement(id);
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const injectPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.injectPdf(id);
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const getAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.getAgreement(id);
    if (!agreement) return res.status(404).json({ error: 'Not found' });
    res.json(agreement);
  } catch (err) {
    next(err);
  }
};

export const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.getAgreement(id);
    if (!agreement) return res.status(404).json({ error: 'Not found' });
    
    const targetFile = agreement.status === 'injected' && agreement.pdfUrl ? agreement.pdfUrl : agreement.templateUrl;
    
    if (!targetFile || !fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(targetFile)}"`);
    
    const fileStream = fs.createReadStream(targetFile);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

export const downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.getAgreement(id);
    if (!agreement || !agreement.pdfUrl || !fs.existsSync(agreement.pdfUrl)) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    // Determine content type
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(agreement.pdfUrl)}"`);
    
    const fileStream = fs.createReadStream(agreement.pdfUrl);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
};
