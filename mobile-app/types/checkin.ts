export interface CheckIn {
  id: string;
  traineeId: string;
  start: string;
  weightKg?: number;
  photoUrl?: string;
  photoUrls?: string[];
  note?: string;
  trainerComment?: CheckInComment;
  overallEnergyLevel: number;
  createdAt: string; 
}
export interface CheckInComment {
  text: string;
  createdAt: string;
}

export interface CheckInPhotoInput {
  uri: string;
  name?: string;
  type?: string;
}

export interface CheckInData {
  start: string;
  weightKg: number;
  photoUrl?: string;
  photoUrls?: string[];
  photo?: CheckInPhotoInput;
  photos?: CheckInPhotoInput[];
  note?: string;
  trainerComment?: CheckInComment;
  overallEnergyLevel: number;
}