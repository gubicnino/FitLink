import type { CheckIn, CheckInData } from '../types/checkin';
import apiClient from './apiClient';

/**
 * Oblika datoteke, kot jo pričakuje multipart/form-data nalaganje slik.
 * FormData.append() v brskalniku sprejme `string | Blob`, zato ta objekt
 * pretvorimo prek `unknown` v `Blob` namesto uporabe `any` (glej standard: prepoved `any`).
 */
type FilePart = { uri: string; name?: string; type?: string };

export const checkInApi = {
  getMyCheckIns: async (): Promise<CheckIn[]> => {
    const res = await apiClient.get<CheckIn[]>('/checkin/my');
    return res.data;
  },
  getCurrentWeekCheckIn: async (): Promise<CheckIn> => {
    const res = await apiClient.get<CheckIn>('/checkin/current');
    return res.data;
  },
  submitCheckIn: async (checkInData: CheckInData): Promise<CheckIn> => {
    const formData = new FormData();
    formData.append('weightKg', String(checkInData.weightKg));
    formData.append('overallEnergyLevel', String(checkInData.overallEnergyLevel));
    formData.append('start', checkInData.start);

    if (checkInData.note?.trim()) {
      formData.append('note', checkInData.note.trim());
    }

    const photos = checkInData.photos?.length
      ? checkInData.photos.slice(0, 5)
      : checkInData.photo?.uri
        ? [checkInData.photo]
        : [];

    photos.forEach((photo, index) => {
      const filePart: FilePart = {
        uri: photo.uri,
        name: photo.name ?? `checkin-${index + 1}.${photo.type?.split('/')[1] ?? 'jpg'}`,
        type: photo.type ?? 'image/jpeg',
      };
      formData.append('photos', filePart as unknown as Blob);
    });

    const res = await apiClient.post<CheckIn>('/checkin', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  addComment: async (checkInId: string, coachingId: string, comment: string): Promise<CheckIn> => {
    const res = await apiClient.put<CheckIn>(`/checkin/${checkInId}/comment`, { comment, coachingId });
    return res.data;
  }
};