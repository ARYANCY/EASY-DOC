// Central API base URL — reads from env var, falls back to localhost for dev
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export default API_BASE;
