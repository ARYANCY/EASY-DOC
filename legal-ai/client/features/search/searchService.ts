import api from '../../lib/axiosInstance';

interface SearchResult {
  text: string;
  score: number;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export const searchDocuments = async (
  query: string,
  documentId?: string
): Promise<SearchResponse> => {
  const response = await api.post('/search', {
    query,
    documentId,
  });
  return response as SearchResponse;
};

export default { searchDocuments };
