import { CheckIn } from "./checkin";

export interface CoachingRequest {
  trainerId: string;
  requestMessage: string;
}

export interface Coaching {
  id: string;
  traineeId: string;
  trainerId: string;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'REJECTED' | string;
  requestMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  checkIns: CheckIn[];
}