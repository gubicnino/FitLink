export type UserRole = 'TRAINEE' | 'TRAINER' | 'ADMIN';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserProfile {
	birthDate: string | null;
	gender: string | null;
	heightCm: number | null;
	currentWeightKg: number | null;
}

export interface TrainerInfo {
	verificationStatus: VerificationStatus | null;
	licenseFileUrl: string | null;
	bio: string | null;
	specializations: string[];
	verifiedAt: string | null;
	rejectionReason: string | null;
}

export interface User {
	id: string;
	firebaseUid: string;
	email: string;
	displayName: string;
	role: UserRole;
	profile: UserProfile | null;
	trainer: TrainerInfo | null;
	fcmToken: string | null;
	createdAt: string;
	updatedAt: string;
	avatarUrl: string | null;
	savedCourseIds?: string[] | null;

}
