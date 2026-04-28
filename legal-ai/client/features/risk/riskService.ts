import api from '../../lib/axiosInstance';

export const getRiskAnalysis = async (documentId: string) => {
  const response = await api.get(`/risk/${documentId}`);
  return response;
};
