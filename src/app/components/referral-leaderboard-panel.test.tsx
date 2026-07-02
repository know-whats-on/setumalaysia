// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralLeaderboardPanel } from './referral-leaderboard-panel';
import { fetchAdminReferralLeaderboard } from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchAdminReferralLeaderboard: vi.fn(),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];
const mockedFetchAdminReferralLeaderboard = vi.mocked(fetchAdminReferralLeaderboard);

async function renderPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<ReferralLeaderboardPanel email="admin@example.com" />);
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

describe('ReferralLeaderboardPanel', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    mockedFetchAdminReferralLeaderboard.mockResolvedValue({
      leaderboard: [
        {
          inviter_email: 'rushi@example.com',
          display_name: 'Rushi V.',
          points: 3,
          credited_count: 3,
          pending_count: 1,
          joined_count: 4,
          joined_no_credit_count: 1,
          already_joined_count: 0,
          total_invites: 5,
          latest_invited_at: '2026-04-25T00:00:00.000Z',
        },
      ],
      totals: {
        inviter_count: 1,
        points: 3,
        credited_count: 3,
        pending_count: 1,
        joined_count: 4,
        total_invites: 5,
      },
    });
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
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the admin-only combined referral leaderboard', async () => {
    const container = await renderPanel();

    expect(mockedFetchAdminReferralLeaderboard).toHaveBeenCalledWith('admin@example.com');
    expect(container.textContent).toContain('Shared leaderboard');
    expect(container.textContent).toContain('Rushi V.');
    expect(container.textContent).toContain('rushi@example.com');
    expect(container.textContent).toContain('Each credited joined account earns 1 point');
    expect(container.textContent).toContain('Points');
    expect(container.textContent).toContain('3 pts');
  });
});
