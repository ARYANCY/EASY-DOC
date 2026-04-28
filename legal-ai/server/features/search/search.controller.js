export const search = async (req, res, next) => {
  try {
    const { query, documentId } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    // Forward to Python service
    const result = await fetch(`${process.env.FASTAPI_URL}/search/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, document_id: documentId }),
    }).then(r => r.json());
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export default { search };
