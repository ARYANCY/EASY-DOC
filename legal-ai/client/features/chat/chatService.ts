import api from '../../lib/axiosInstance';

export const sendChatMessage = async (query: string, documentId?: string) => {
  const response = await api.post('/chat', {
    query,
    documentId,
  });
  return response;
};
