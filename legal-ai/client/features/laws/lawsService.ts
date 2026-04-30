import api from '../../lib/axiosInstance';

export interface LawReference {
  law_name: string;
  section?: string;
  article?: string;
  context: string;
  link: string;
  importance: 'high' | 'medium' | 'low';
  category: 'statute' | 'regulation' | 'case_law' | 'constitutional';
  relevance_score?: number;
}

export const analyzeLaws = async (documentId: string, text?: string, jurisdiction?: string): Promise<LawReference[]> => {
  try {
    const response = await api.post('/laws/analyze', {
      documentId,
      text,
      jurisdiction
    }, {
      timeout: 40000 
    });
    return response.data.laws || [];
  } catch (error: any) {
    console.error('Error analyzing laws:', error);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The law analysis is taking too long.');
    }
    throw error;
  }
};

