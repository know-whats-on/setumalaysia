import { describe, expect, it } from 'vitest';
import { buildHouseholdRoute, getHouseholdFocusTargetId, parseHouseholdRoute } from './household-route';

describe('household-route', () => {
  it('infers bills when a bill id is present', () => {
    const parsed = parseHouseholdRoute('/profile?tab=household&bill_id=bill-123&payment_id=pay-456&household_source=imessage');

    expect(parsed.sectionTab).toBe('bills');
    expect(parsed.billId).toBe('bill-123');
    expect(parsed.paymentId).toBe('pay-456');
    expect(parsed.source).toBe('imessage');
  });

  it('builds focused notification routes', () => {
    const route = buildHouseholdRoute({
      notificationId: 'note-123',
      source: 'push',
    });

    expect(route).toBe('/profile?tab=household&household_tab=activity&notification_id=note-123&household_source=push');
  });

  it('builds and parses house rules routes', () => {
    const route = buildHouseholdRoute({
      sectionTab: 'rules',
      source: 'push',
    });

    expect(route).toBe('/profile?tab=household&household_tab=rules&household_source=push');
    expect(parseHouseholdRoute(route).sectionTab).toBe('rules');
  });

  it('returns the most specific focus target', () => {
    expect(getHouseholdFocusTargetId({
      billId: 'bill-123',
      paymentId: 'pay-456',
      choreId: '',
      notificationId: '',
    })).toBe('payment:pay-456');
  });
});
