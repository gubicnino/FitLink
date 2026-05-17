import apiClient from '../api/apiClient';

export interface TrainerApplicationPayload {
  bio: string;
  specializations: string[];
  certificateFileUrl: string;
  certificateFileName: string;
  certificateMimeType: string;
  certificateChecksum: string;
}

export interface TrainerCertificationUploadResponse {
  certificateFileUrl: string;
  certificateFileName: string;
  certificateMimeType: string;
  certificateChecksum: string;
}

export interface TrainerApplicationResponse {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

export const trainerApplicationService = {
  uploadCertification: async (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as never);

    const response = await apiClient.post('/trainer-applications/certification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as TrainerCertificationUploadResponse;
  },

  submitApplication: async (payload: TrainerApplicationPayload) => {
    const response = await apiClient.post('/trainer-applications', payload);
    return response.data as TrainerApplicationResponse;
  },
};