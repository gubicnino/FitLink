import apiClient, { API_ORIGIN } from './apiClient';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TrainerApplication {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  bio: string | null;
  specializations: string[];
  certificateFileUrl: string | null;
  certificateFileName: string | null;
  certificateMimeType: string | null;
  certificateChecksum: string | null;
  status: ApplicationStatus;
  rejectionReason: string | null;
  reviewedByAdminId: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  updatedAt: string;
}

export const trainerApplicationApi = {
  getPending: async (): Promise<TrainerApplication[]> => {
    const res = await apiClient.get<TrainerApplication[]>('/trainer-applications/pending');
    return res.data;
  },

  approve: async (id: string): Promise<TrainerApplication> => {
    const res = await apiClient.post<TrainerApplication>(
      `/trainer-applications/${encodeURIComponent(id)}/approve`,
    );
    return res.data;
  },

  reject: async (id: string, rejectionReason: string): Promise<TrainerApplication> => {
    const res = await apiClient.post<TrainerApplication>(
      `/trainer-applications/${encodeURIComponent(id)}/reject`,
      { rejectionReason },
    );
    return res.data;
  },


  certificateUrl: (fileName: string): string =>
    `${API_ORIGIN}/api/trainer-applications/certificate/${encodeURIComponent(fileName)}`,

  fetchCertificateBlob: async (fileName: string): Promise<Blob> => {
    const res = await apiClient.get(
      `/trainer-applications/certificate/${encodeURIComponent(fileName)}`,
      { responseType: 'blob' },
    );
    return res.data as Blob;
  },
};
