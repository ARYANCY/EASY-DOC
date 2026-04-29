import api from '../../lib/axiosInstance';

export interface AgreementVersion {
  version: number;
  text: string;
  source: 'ai' | 'manual';
  createdAt: string;
}

export interface Agreement {
  agreementId: string;
  name: string;
  templateUrl: string;
  pdfUrl: string;
  versions: AgreementVersion[];
  currentVersion: number;
  status: 'draft' | 'approved' | 'injected';
}

export const uploadTemplate = async (file: File, name?: string): Promise<Agreement> => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  
  return await api.post('/agreement/upload-template', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }) as any;
};

export const generateAgreement = async (id: string, prompt: string, context?: string): Promise<Agreement> => {
  return await api.post(`/agreement/${id}/generate`, { prompt, context }) as any;
};

export const editAgreement = async (id: string, text: string): Promise<Agreement> => {
  return await api.post(`/agreement/${id}/edit`, { text }) as any;
};

export const setVersion = async (id: string, version: number): Promise<Agreement> => {
  return await api.post(`/agreement/${id}/version`, { version }) as any;
};

export const approveAgreement = async (id: string): Promise<Agreement> => {
  return await api.post(`/agreement/${id}/approve`) as any;
};

export const injectPdf = async (id: string): Promise<Agreement> => {
  return await api.post(`/agreement/${id}/inject`) as any;
};

export const getAgreement = async (id: string): Promise<Agreement> => {
  return await api.get(`/agreement/${id}`) as any;
};
