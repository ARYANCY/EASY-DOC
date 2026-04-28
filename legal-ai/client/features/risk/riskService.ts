import api from '../../lib/axiosInstance';

export interface RiskResponse {
  risk_score: number;
  flags: any[];
  summary: string;
}

export const getRiskAnalysis = async (documentId: string): Promise<RiskResponse> => {
  const response = await api.get(`/risk/${documentId}`);
  return response.data;
};
