import { describe, expect, it } from 'vitest';
import {
  getUnauthenticatedRedirectRoute,
  isAuthenticationRoute,
  isPublicBrowserAccessibleRoute,
} from './layout';

describe('SETU China login-only route policy', () => {
  it('uses the root onboarding route for SETU China auth', () => {
    expect(getUnauthenticatedRedirectRoute('setu_china')).toBe('/');
    expect(isAuthenticationRoute('/', 'setu_china')).toBe(true);
    expect(isAuthenticationRoute('/login', 'setu_china')).toBe(true);
  });

  it('keeps the original onboarding route for other variants', () => {
    expect(getUnauthenticatedRedirectRoute('ghar')).toBe('/');
    expect(isAuthenticationRoute('/', 'ghar')).toBe(true);
    expect(isAuthenticationRoute('/login', 'ghar')).toBe(true);
  });

  it('keeps SETU China general information routes behind login', () => {
    expect(isPublicBrowserAccessibleRoute('/', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/dashboard', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/vibe', '?section=vibe&vibe_tab=suburb-score', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/vibe', '?section=events', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/vibe', '?section=alerts', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/legal', '?section=prepare&prepare_tab=checklist', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/setu', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/games', '', 'setu_china')).toBe(false);
  });

  it('keeps SETU China account-based routes protected', () => {
    expect(isPublicBrowserAccessibleRoute('/profile', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/notifications', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/plans/plan-1', '', 'setu_china')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/arrival', '', 'setu_china')).toBe(false);
  });

  it('does not make other variant dashboards public', () => {
    expect(isPublicBrowserAccessibleRoute('/dashboard', '', 'ghar')).toBe(false);
    expect(isPublicBrowserAccessibleRoute('/guide/sydney/rent', '', 'ghar')).toBe(true);
  });
});
