// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createProfileMock,
  fetchHouseholdInvitePreviewMock,
  fetchProfileMock,
  fetchRentalHistoryMock,
  onboardingPropsRef,
  sendOtpMock,
  updateProfileMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  createProfileMock: vi.fn(),
  fetchHouseholdInvitePreviewMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  fetchRentalHistoryMock: vi.fn(),
  onboardingPropsRef: { current: null as any },
  sendOtpMock: vi.fn(),
  updateProfileMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock('../components/onboarding', () => ({
  Onboarding: (props: any) => {
    onboardingPropsRef.current = props;
    return <div data-testid="onboarding">Onboarding</div>;
  },
}));

vi.mock('../lib/api', () => ({
  createProfile: createProfileMock,
  fetchHouseholdInvitePreview: fetchHouseholdInvitePreviewMock,
  fetchProfile: fetchProfileMock,
  fetchRentalHistory: fetchRentalHistoryMock,
  isReviewerBypassEmail: () => false,
  sendOtp: sendOtpMock,
  updateProfile: updateProfileMock,
  verifyOtp: verifyOtpMock,
}));

import { OnboardingPage } from './onboarding-page';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
}

async function renderOnboardingPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/arrival" element={<LocationDisplay />} />
          <Route path="/dashboard" element={<LocationDisplay />} />
          <Route path="/vibe" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

function getLocationText(container: HTMLElement) {
  return container.querySelector('[data-testid="location-display"]')?.textContent || '';
}

describe('OnboardingPage default landing route', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.sessionStorage.clear();
    createProfileMock.mockReset();
    fetchHouseholdInvitePreviewMock.mockReset();
    fetchProfileMock.mockReset();
    fetchRentalHistoryMock.mockReset();
    onboardingPropsRef.current = null;
    sendOtpMock.mockReset();
    updateProfileMock.mockReset();
    verifyOtpMock.mockReset();
    window.localStorage.setItem('ghar_onboarded', 'true');
    window.localStorage.setItem('ghar_email', 'student@example.com');
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }

    document.body.innerHTML = '';
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('lands on the assistant when the timeline has a current address', async () => {
    fetchRentalHistoryMock.mockResolvedValue([{ id: 'timeline-1', is_current: true }]);

    const container = await renderOnboardingPage();

    expect(fetchRentalHistoryMock).not.toHaveBeenCalled();
    expect(getLocationText(container)).toBe('/arrival');
  });

  it('lands on the assistant when the timeline has no current address', async () => {
    fetchRentalHistoryMock.mockResolvedValue([{ id: 'timeline-1', is_current: false }]);

    const container = await renderOnboardingPage();

    expect(fetchRentalHistoryMock).not.toHaveBeenCalled();
    expect(getLocationText(container)).toBe('/arrival');
  });

  it('keeps an explicit post-login route ahead of the assistant default', async () => {
    window.sessionStorage.setItem('ghar_post_login_route', '/vibe?section=events');
    fetchRentalHistoryMock.mockResolvedValue([{ id: 'timeline-1', is_current: true }]);

    const container = await renderOnboardingPage();

    expect(fetchRentalHistoryMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('ghar_post_login_route')).toBeNull();
    expect(getLocationText(container)).toBe('/vibe?section=events');
  });

  it('falls back to the assistant if rental history cannot be loaded', async () => {
    fetchRentalHistoryMock.mockRejectedValue(new Error('offline'));

    const container = await renderOnboardingPage();

    expect(fetchRentalHistoryMock).not.toHaveBeenCalled();
    expect(getLocationText(container)).toBe('/arrival');
  });

  it('logs complete existing profiles in directly after OTP', async () => {
    window.localStorage.removeItem('ghar_onboarded');
    window.localStorage.removeItem('ghar_email');
    verifyOtpMock.mockResolvedValue({});
    fetchProfileMock.mockResolvedValue({
      email: 'complete@example.com',
      first_name: 'Complete',
      last_name: 'User',
      dob: '1995-01-01',
      phone: '+61411111111',
      citizenship: 'India',
      australian_state: 'NSW',
      audience_mode: 'newcomer',
    });

    const container = await renderOnboardingPage();

    await act(async () => {
      await onboardingPropsRef.current.onVerifyOtp('complete@example.com', 'ABC123');
      await Promise.resolve();
    });

    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(createProfileMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('ghar_email')).toBe('complete@example.com');
    expect(getLocationText(container)).toBe('/arrival');
  });

  it('keeps migrated incomplete profiles in onboarding after OTP', async () => {
    window.localStorage.removeItem('ghar_onboarded');
    window.localStorage.removeItem('ghar_email');
    verifyOtpMock.mockResolvedValue({});
    fetchProfileMock.mockResolvedValue({
      email: 'migrated@example.com',
      first_name: 'Maya',
      last_name: 'Chen',
      audience_mode: 'newcomer',
      migration_status: 'needs_profile_completion',
      legacy_firebase: { uid: 'legacy-uid' },
    });

    const container = await renderOnboardingPage();

    await act(async () => {
      await onboardingPropsRef.current.onVerifyOtp('migrated@example.com', 'ABC123');
      await Promise.resolve();
    });

    expect(getLocationText(container)).toBe('');
    expect(window.localStorage.getItem('ghar_onboarded')).toBeNull();
    expect(onboardingPropsRef.current.initialProfile).toMatchObject({
      email: 'migrated@example.com',
      migration_status: 'needs_profile_completion',
      legacy_firebase: { uid: 'legacy-uid' },
    });
  });

  it('keeps enriched migrated profiles in onboarding until migration status is completed', async () => {
    window.localStorage.removeItem('ghar_onboarded');
    window.localStorage.removeItem('ghar_email');
    verifyOtpMock.mockResolvedValue({});
    fetchProfileMock.mockResolvedValue({
      email: 'enriched@example.com',
      first_name: 'Enriched',
      last_name: 'Student',
      dob: '1998-01-01',
      phone: '+61411111111',
      citizenship: 'India',
      australian_state: 'NSW',
      audience_mode: 'student',
      university: 'University of New South Wales',
      university_id: 'university_of_new_south_wales',
      course_name: 'Master of Commerce',
      graduation_year: 2027,
      migration_status: 'needs_profile_completion',
      legacy_firebase: { uid: 'legacy-uid' },
    });

    const container = await renderOnboardingPage();

    await act(async () => {
      await onboardingPropsRef.current.onVerifyOtp('enriched@example.com', 'ABC123');
      await Promise.resolve();
    });

    expect(getLocationText(container)).toBe('');
    expect(window.localStorage.getItem('ghar_onboarded')).toBeNull();
    expect(onboardingPropsRef.current.initialProfile).toMatchObject({
      email: 'enriched@example.com',
      university: 'University of New South Wales',
      migration_status: 'needs_profile_completion',
    });
  });

  it('marks migrated profiles completed when onboarding is submitted', async () => {
    window.localStorage.removeItem('ghar_onboarded');
    window.localStorage.removeItem('ghar_email');
    verifyOtpMock.mockResolvedValue({});
    fetchProfileMock.mockResolvedValue({
      email: 'migrated@example.com',
      first_name: 'Maya',
      last_name: 'Chen',
      audience_mode: 'newcomer',
      migration_status: 'needs_profile_completion',
      legacy_firebase: { uid: 'legacy-uid' },
    });
    updateProfileMock.mockResolvedValue({});

    const container = await renderOnboardingPage();

    await act(async () => {
      await onboardingPropsRef.current.onVerifyOtp('migrated@example.com', 'ABC123');
      await Promise.resolve();
    });

    await act(async () => {
      await onboardingPropsRef.current.onComplete({
        email: 'migrated@example.com',
        first_name: 'Maya',
        last_name: 'Chen',
        dob: '1995-01-01',
        phone: '+61411111111',
        citizenship: 'India',
        home_state: '',
        australian_state: 'NSW',
        audience_mode: 'newcomer',
        university: '',
        university_id: '',
        email_type: 'standard',
        course_name: '',
        postcode: '',
      });
      await Promise.resolve();
    });

    expect(createProfileMock).not.toHaveBeenCalled();
    expect(updateProfileMock).toHaveBeenCalledWith('migrated@example.com', expect.objectContaining({
      migration_status: 'completed',
      is_verified: true,
      email: 'migrated@example.com',
    }));
    expect(window.localStorage.getItem('ghar_email')).toBe('migrated@example.com');
    expect(getLocationText(container)).toBe('/arrival');
  });
});
