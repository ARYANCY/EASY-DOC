import api from '../../lib/axiosInstance';

export interface ChatResponse {
  answer: string;
  sources: any[];
  query: string;
  documentId?: string;
}

export const sendChatMessage = async (query: string, documentId?: string): Promise<ChatResponse> => {
  const response = await api.post('/chat', {
    query,
    documentId,
  });
  return response.data;
};
