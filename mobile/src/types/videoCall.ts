export type VideoCallStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'LIVE'
  | 'EXPIRED'
  | 'COMPLETED';

export interface VideoCall {
  id: string;
  conversationId: string;
  scheduledByUserId: string;
  trainerId: string;
  traineeId: string;
  coachingId: string | null;
  scheduledFor: string;
  meetingUrl: string;
  status: VideoCallStatus;
  createdAt: string;
  decidedAt: string | null;
  completedAt: string | null;
  declineReason: string | null;
}

export interface ScheduleVideoCallBody {
  scheduledFor?: string | null;
  instant?: boolean;
}
