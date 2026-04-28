import api from '../../lib/axiosInstance';

export interface SimplifyResponse {
  original: string;
  simplified: string;
}

export const getDocument = async (documentId: string) => {
  const response = await api.get(`/document/${documentId}`);
  return response.data;
};

export const simplifyDocument = async (text: string): Promise<SimplifyResponse> => {
  const response = await api.post('/simplify', { text });
  return response.data;
};
