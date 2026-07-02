import type { ProfilePayload } from './api';

export type MigrationStatus = 'needs_profile_completion' | 'completed';

export type MigratedProfile = Partial<ProfilePayload> & Record<string, any> & {
  migration_status?: MigrationStatus;
  migrated_at?: string;
  legacy_firebase?: Record<string, any>;
};

function hasText(value: unknown) {
  return String(value ?? '').trim().length > 0;
}

export function isProfileCompleteForOnboarding(profile: MigratedProfile | null | undefined) {
  if (!profile) return false;
  const requiredFields = [
    profile.first_name,
    profile.last_name,
    profile.dob,
    profile.phone,
    profile.citizenship,
    profile.australian_state,
  ];
  if (requiredFields.some((value) => !hasText(value))) return false;

  const audienceMode = String(profile.audience_mode || 'student').trim().toLowerCase();
  if (audienceMode === 'student') {
    return hasText(profile.university) && hasText(profile.course_name) && hasText(profile.graduation_year);
  }

  return true;
}

export function needsMigratedProfileCompletion(profile: MigratedProfile | null | undefined) {
  return profile?.migration_status === 'needs_profile_completion';
}

export function buildCompletedMigratedProfileUpdates(profile: ProfilePayload) {
  return {
    ...profile,
    migration_status: 'completed' as const,
    is_verified: true,
  };
}
