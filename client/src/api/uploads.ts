import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UploadResult {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export const uploadsApi = {
  async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await axios.post<UploadResult>(`${API_URL}/uploads`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  async deleteFile(fileId: string): Promise<void> {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/uploads/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
