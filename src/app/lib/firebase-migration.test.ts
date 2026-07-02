import { describe, expect, it } from 'vitest';
import {
  applyExistingProfilePolicy,
  getProfileKey,
  prepareFirestoreProfileEnrichments,
  prepareFirebaseUsersMigration,
  splitDisplayName,
  UNSW_UNIVERSITY,
  UNSW_UNIVERSITY_ID,
} from '../../../scripts/firebase-migration-lib.mjs';

describe('Firebase user migration parser', () => {
  it('normalizes Firebase auth exports and records skipped users', () => {
    const prepared = prepareFirebaseUsersMigration({
      users: [
        {
          localId: 'uid-1',
          email: ' Maya.Chen@Uni.edu.au ',
          displayName: 'Maya Chen',
          emailVerified: true,
          createdAt: '1710000000000',
          lastLoginAt: '1711000000000',
          providerUserInfo: [
            {
              providerId: 'google.com',
              rawId: 'google-1',
              email: 'maya.chen@uni.edu.au',
              displayName: 'Maya Chen',
            },
          ],
        },
        { localId: 'uid-2', email: 'not-an-email' },
        { localId: 'uid-3', email: 'maya.chen@uni.edu.au' },
        { localId: 'uid-4', email: 'disabled@example.com', disabled: true },
      ],
    }, {
      projectId: 'legacy-project',
      appVariant: 'all',
      migratedAt: '2026-05-06T00:00:00.000Z',
    });

    expect(prepared.report).toMatchObject({
      total_exported: 4,
      importable_before_limit: 1,
      prepared: 1,
      skipped_invalid_email: 1,
      skipped_duplicate_email: 1,
      skipped_disabled: 1,
    });

    const [record] = prepared.records;
    expect(record.key).toBe(getProfileKey('maya.chen@uni.edu.au'));
    expect(record.profile).toMatchObject({
      email: 'maya.chen@uni.edu.au',
      first_name: 'Maya',
      last_name: 'Chen',
      audience_mode: 'student',
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
      email_type: 'edu_au',
      is_verified: false,
      migration_status: 'needs_profile_completion',
      app_variant_imported_for: 'all',
      legacy_firebase: {
        project_id: 'legacy-project',
        uid: 'uid-1',
        display_name: 'Maya Chen',
        email_verified: true,
        created_at: '2024-03-09T16:00:00.000Z',
        last_sign_in_at: '2024-03-21T05:46:40.000Z',
      },
    });
    expect(record.profile.legacy_firebase.providers).toEqual([
      expect.objectContaining({ provider_id: 'google.com', raw_id: 'google-1' }),
    ]);
  });

  it('uses conservative email-local names when display name is unavailable', () => {
    expect(splitDisplayName('', 'ravi.kumar@example.com')).toEqual({
      firstName: 'Ravi',
      lastName: 'Kumar',
    });
    expect(splitDisplayName('', 'support123@example.com')).toEqual({
      firstName: '',
      lastName: '',
    });
  });

  it('preserves SETU China as a Firebase migration target variant', () => {
    const prepared = prepareFirebaseUsersMigration({
      users: [
        {
          localId: 'uid-cn-1',
          email: 'lin@example.edu.au',
          displayName: 'Lin Wang',
        },
      ],
    }, {
      appVariant: 'setu_china',
      migratedAt: '2026-06-18T00:00:00.000Z',
    });

    expect(prepared.records[0]?.profile.app_variant_imported_for).toBe('setu_china');
  });

  it('enriches Auth allow-listed users from Firestore profiles and keeps Firestore-only profiles out', () => {
    const prepared = prepareFirebaseUsersMigration({
      users: [
        { localId: 'uid-1', email: 'deeksha@example.com' },
      ],
    }, {
      migratedAt: '2026-05-06T00:00:00.000Z',
      firestoreProfiles: {
        profiles: [
          {
            path: 'projects/old/databases/(default)/documents/users/doc-1',
            data: {
              email: ' Deeksha@Example.com ',
              firstName: 'Deeksha',
              lastName: 'Paudel',
              phoneNumber: '0412345678',
              dateOfBirth: '1998-03-02T00:00:00.000Z',
              citizenship: 'India',
              australianState: 'NSW',
              courseName: 'Master of Commerce',
              graduationYear: '2027',
            },
          },
          {
            path: 'projects/old/databases/(default)/documents/users/doc-2',
            data: {
              email: 'firestore-only@example.com',
              fullName: 'Firestore Only',
            },
          },
        ],
      },
    });

    expect(prepared.report).toMatchObject({
      firestore_profiles_total: 2,
      firestore_profiles_with_email: 2,
      firestore_profiles_matched: 1,
      skipped_firestore_only: 1,
    });
    expect(prepared.records[0].profile).toMatchObject({
      email: 'deeksha@example.com',
      first_name: 'Deeksha',
      last_name: 'Paudel',
      phone: '0412345678',
      dob: '1998-03-02',
      citizenship: 'India',
      australian_state: 'NSW',
      audience_mode: 'student',
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
      course_name: 'Master of Commerce',
      graduation_year: 2027,
      migration_status: 'needs_profile_completion',
    });
    expect(prepared.records[0].profile.legacy_firebase.firestore).toMatchObject({
      path: 'projects/old/databases/(default)/documents/users/doc-1',
      matched_email: 'deeksha@example.com',
    });
  });

  it('normalizes Firestore REST documents and skips duplicate Firestore emails', () => {
    const prepared = prepareFirestoreProfileEnrichments({
      documents: [
        {
          name: 'projects/old/databases/(default)/documents/users/a',
          fields: {
            email: { stringValue: 'same@example.com' },
            fullName: { stringValue: 'First Person' },
          },
        },
        {
          name: 'projects/old/databases/(default)/documents/users/b',
          fields: {
            email: { stringValue: 'same@example.com' },
            firstName: { stringValue: 'Second' },
          },
        },
      ],
    }, {
      enrichedAt: '2026-05-06T00:00:00.000Z',
    });

    expect(prepared.report).toMatchObject({
      firestore_profiles_total: 2,
      firestore_profiles_with_email: 2,
      firestore_profiles_duplicate_email: 1,
    });
    expect(prepared.byEmail.get('same@example.com')?.profile).toMatchObject({
      first_name: 'First',
      last_name: 'Person',
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
    });
  });

  it('keeps plain Firestore name fields as display names', () => {
    const prepared = prepareFirestoreProfileEnrichments({
      profiles: [
        {
          path: 'users/plain-name',
          id: 'plain-name',
          email: 'plain.name@example.com',
          name: 'Plain Name',
        },
      ],
    }, {
      enrichedAt: '2026-05-06T00:00:00.000Z',
    });

    expect(prepared.byEmail.get('plain.name@example.com')?.profile).toMatchObject({
      first_name: 'Plain',
      last_name: 'Name',
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
    });
  });

  it('skips complete Supabase profiles and updates incomplete profiles', () => {
    const prepared = prepareFirebaseUsersMigration({
      users: [
        { localId: 'uid-1', email: 'complete@example.com', displayName: 'Complete User' },
        { localId: 'uid-2', email: 'incomplete@example.com', displayName: 'Incomplete User' },
      ],
    }, {
      migratedAt: '2026-05-06T00:00:00.000Z',
    });

    const existing = new Map([
      [getProfileKey('complete@example.com'), {
        value: {
          email: 'complete@example.com',
          first_name: 'Complete',
          last_name: 'User',
          dob: '1995-01-01',
          phone: '+61411111111',
          citizenship: 'India',
          australian_state: 'NSW',
          audience_mode: 'newcomer',
        },
      }],
      [getProfileKey('incomplete@example.com'), {
        value: {
          email: 'incomplete@example.com',
          first_name: 'Existing',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      }],
    ]);

    const result = applyExistingProfilePolicy(prepared.records, existing);

    expect(result.report).toMatchObject({
      rows_to_upsert: 1,
      skipped_existing_complete: 1,
      updated_existing_incomplete: 1,
      new_profiles: 0,
    });
    expect(result.rows[0].value).toMatchObject({
      email: 'incomplete@example.com',
      first_name: 'Existing',
      last_name: 'User',
      created_at: '2026-01-01T00:00:00.000Z',
      migration_status: 'needs_profile_completion',
    });
  });

  it('preserves existing non-empty fields while canonicalizing old migrated stubs to student UNSW', () => {
    const prepared = prepareFirebaseUsersMigration({
      users: [
        { localId: 'uid-1', email: 'incomplete@example.com' },
      ],
    }, {
      migratedAt: '2026-05-06T00:00:00.000Z',
      firestoreProfiles: {
        profiles: [
          {
            path: 'users/incomplete',
            data: {
              email: 'incomplete@example.com',
              firstName: 'New',
              lastName: 'Name',
              course: 'Bachelor of Design',
            },
          },
        ],
      },
    });

    const existing = new Map([
      [getProfileKey('incomplete@example.com'), {
        value: {
          email: 'incomplete@example.com',
          first_name: 'Existing',
          last_name: '',
          audience_mode: 'newcomer',
          university: '',
          migration_status: 'needs_profile_completion',
          legacy_firebase: { uid: 'uid-1' },
        },
      }],
    ]);

    const result = applyExistingProfilePolicy(prepared.records, existing);

    expect(result.rows[0].value).toMatchObject({
      email: 'incomplete@example.com',
      first_name: 'Existing',
      last_name: 'Name',
      audience_mode: 'student',
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
      course_name: 'Bachelor of Design',
      migration_status: 'needs_profile_completion',
      legacy_firebase: {
        uid: 'uid-1',
        firestore: expect.objectContaining({ path: 'users/incomplete' }),
      },
    });
  });
});
