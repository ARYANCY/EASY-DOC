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
    // Increase timeout for law analysis (40s) since it involves LLM processing
    const response = await api.post('/laws/analyze', {
      documentId,
      text,
      jurisdiction
    }, {
      timeout: 40000 // 40 seconds
    });
    
    // Handle case where response or data is undefined
    if (!response || !response.data) {
      console.error('Empty response from laws API');
      throw new Error('No response from server');
    }
    
    // Check if response has the expected structure
    if (response.data.laws === undefined) {
      console.error('Invalid response structure:', response.data);
      throw new Error(response.data.error || 'Invalid response from server');
    }
    
    return response.data.laws || [];
  } catch (error: any) {
    console.error('Error analyzing laws:', error);
    
    // If it's an axios error with response data, extract the error message
    if (error.response?.data) {
      const serverError = error.response.data.error || error.response.data.message || 'Server error';
      throw new Error(serverError);
    }
    
    // Provide more specific error information
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The law analysis is taking too long.');
    }
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      throw new Error('Cannot connect to server. Please check if the server is running.');
    }
    
    throw error;
  }
};
