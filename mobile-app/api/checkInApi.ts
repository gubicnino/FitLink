import { CheckIn, CheckInData } from '../types/checkin';
import apiClient from './apiClient';

export const checkInApi = {
  getMyCheckIns: async (): Promise<CheckIn[]> => {
    const res = await apiClient.get<CheckIn[]>('/checkin/my');
    return res.data;
  },
  getCurrentWeekCheckIn: async (): Promise<CheckIn> => {
    const res = await apiClient.get<CheckIn>('/checkin/current');
    return res.data;
  },
  submitCheckIn: async (checkInData: CheckInData) => {
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
      formData.append('photos', {
        uri: photo.uri,
        name: photo.name ?? `checkin-${index + 1}.${photo.type?.split('/')[1] ?? 'jpg'}`,
        type: photo.type ?? 'image/jpeg',
      } as any);
    });

    const res = await apiClient.post<CheckIn>('/checkin', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  addComment: async (checkInId: string, coachingId: string, comment: string) => {
    const res = await apiClient.put<CheckIn>(`/checkin/${checkInId}/comment`, { comment, coachingId });
    return res.data;
  }
};