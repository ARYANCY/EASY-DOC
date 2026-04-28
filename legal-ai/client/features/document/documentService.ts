import api from '../../lib/axiosInstance';

export const getDocument = async (documentId: string) => {
  const response = await api.get(`/document/${documentId}`);
  return response;
};

export const simplifyDocument = async (text: string) => {
  const response = await api.post('/simplify', { text });
  return response;
};
