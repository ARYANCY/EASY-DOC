export const searchDocuments = async (query, documentId) => {
  // Forward to Python FastAPI service
  const response = await fetch(`${process.env.FASTAPI_URL}/search/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, document_id: documentId }),
  });
  return response.json();
};

export default { searchDocuments };
