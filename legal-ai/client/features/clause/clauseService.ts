import api from '../../lib/axiosInstance';

export interface Clause {
  id: string;
  title: string;
  description: string;
  type: string;
  text?: string;
}

export const extractClauses = async (documentId: string, clauseTypes?: string[]): Promise<Clause[]> => {
  const data = await api.post('/clause', {
    documentId,
    clauseTypes,
  });
  return (data as unknown) as Clause[];
};
