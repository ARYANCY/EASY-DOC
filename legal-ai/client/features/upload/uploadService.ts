import api from '../../lib/axiosInstance';

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // Don't set Content-Type - let browser set it with proper boundary
  const response = await api.post('/upload', formData);
  return response;
};
