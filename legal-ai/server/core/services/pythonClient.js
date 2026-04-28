import axios from 'axios';
import { config } from '../config/env.js';

const pythonApi = axios.create({
  baseURL: config.fastApiUrl,
  timeout: 120000, // 120s for LLM operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
pythonApi.interceptors.request.use(
  (config) => {
    console.log(`[Python API] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
pythonApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[Python API Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Retry wrapper for resilient API calls
const withRetry = async (fn, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`[Python API] Retry ${attempt}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
};

export const callParser = async (fileBuffer, filename) => {
  return withRetry(async () => {
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), filename);
    
    const response = await pythonApi.post('/parse/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 minutes for parsing
    });
    return response.data;
  });
};

export const callChat = async (query, documentId) => {
  return withRetry(async () => {
    const response = await pythonApi.post('/chat/', {
      query,
      document_id: documentId,
    });
    return response.data;
  });
};

export const callRisk = async (documentId) => {
  return withRetry(async () => {
    const response = await pythonApi.post('/risk/', {
      document_id: documentId,
    });
    return response.data;
  });
};

export const callSimplify = async (text) => {
  return withRetry(async () => {
    const response = await pythonApi.post('/simplify/', {
      text,
    });
    return response.data;
  });
};

export const callSearch = async (query, documentId) => {
  return withRetry(async () => {
    const response = await pythonApi.post('/search/', {
      query,
      document_id: documentId,
    });
    return response.data;
  });
};

export default pythonApi;
