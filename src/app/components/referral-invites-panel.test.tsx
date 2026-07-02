// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralInvitesPanel } from './referral-invites-panel';
import {
  createReferralInvite,
  deleteReferralInvite,
  fetchMyReferralInvites,
} from '../lib/api';

vi.mock('../lib/api', () => ({
  createReferralInvite: vi.fn(),
  deleteReferralInvite: vi.fn(),
  fetchMyReferralInvites: vi.fn(),
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: {
    variant: 'burb_mate',
    displayName: 'Hoodie',
    inviteBaseUrl: 'https://suburb.knowwhatson.com',
    shareBaseUrl: 'https://suburb.knowwhatson.com',
    referralShareImagePath: '/social/hoodie-referral-invite-banner.png',
  },
}));

vi.mock('../lib/app-variant', () => ({
  APP_VARIANT: 'burb_mate',
}));

vi.mock('../lib/platform', () => ({
  isNativeShell: () => false,
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];
const mockedFetchMyReferralInvites = vi.mocked(fetchMyReferralInvites);
const mockedCreateReferralInvite = vi.mocked(createReferralInvite);
const mockedDeleteReferralInvite = vi.mocked(deleteReferralInvite);

async function renderPanel(email = 'rushi@example.com') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<ReferralInvitesPanel email={email} />);
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

describe('ReferralInvitesPanel', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    mockedFetchMyReferralInvites.mockResolvedValue({
      invites: [
        {
          id: 'invite-waiting',
          inviter_email: 'rushi@example.com',
          invited_email: 'very.long.email.address.for.layout.coverage@example.com',
          source_app_variant: 'burb_mate',
          status: 'invited',
          created_at: '2026-04-26T00:00:00.000Z',
        },
        {
          id: 'invite-1',
          inviter_email: 'rushi@example.com',
          invited_email: 'friend@example.com',
          source_app_variant: 'burb_mate',
          status: 'joined',
          joined_at: '2026-04-25T00:00:00.000Z',
          credited_at: '2026-04-25T00:00:00.000Z',
          created_at: '2026-04-20T00:00:00.000Z',
        },
      ],
      summary: {
        total: 2,
        invited: 1,
        joined: 1,
        joined_no_credit: 0,
        already_joined: 0,
        points: 1,
      },
    });
    mockedCreateReferralInvite.mockResolvedValue({
      id: 'invite-2',
      inviter_email: 'rushi@example.com',
      invited_email: 'new@example.com',
      source_app_variant: 'burb_mate',
      status: 'invited',
      created_at: '2026-04-25T00:00:00.000Z',
    });
    mockedDeleteReferralInvite.mockResolvedValue({
      id: 'invite-waiting',
      deleted: true,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['banner'], { type: 'image/png' }),
    }));
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('shows the signed-in user only their own referral invite statuses', async () => {
    const container = await renderPanel();

    expect(mockedFetchMyReferralInvites).toHaveBeenCalledWith('rushi@example.com');
    expect(container.textContent).toContain('friend@example.com');
    expect(container.textContent).toContain('1 point earned');
    expect(container.textContent).toContain('Waiting to Join');
    expect(container.textContent).toContain('Added 26 Apr 2026');
    expect(container.textContent).toContain('Points');
    expect(Array.from(container.querySelectorAll('button')).filter((button) => button.textContent?.includes('Delete'))).toHaveLength(1);
    const longEmail = container.querySelector('[data-testid="referral-email-invite-waiting"]');
    expect(longEmail?.className).toContain('[overflow-wrap:anywhere]');
  });

  it('rejects self-invites before calling the API', async () => {
    const container = await renderPanel();
    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Add');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    await act(async () => {
      nativeInputValueSetter?.call(input, 'rushi@example.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockedCreateReferralInvite).not.toHaveBeenCalled();
    expect(container.textContent).toContain('You cannot track your own account email.');
  });

  it('falls back to copying the share message when web share is unavailable', async () => {
    const container = await renderPanel();
    const shareButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Share');
    const clipboardWriteText = vi.mocked(window.navigator.clipboard.writeText);

    await act(async () => {
      shareButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('https://suburb.knowwhatson.com'),
    );
    expect(container.textContent).toContain('Referral message copied.');
  });

  it('attaches the referral banner when file sharing is available on the web', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: shareMock,
    });
    Object.defineProperty(window.navigator, 'canShare', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });

    const container = await renderPanel();
    const shareButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Share');

    await act(async () => {
      shareButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/social/hoodie-referral-invite-banner.png'));
    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Share Hoodie',
      text: expect.stringContaining('https://suburb.knowwhatson.com'),
      files: expect.arrayContaining([
        expect.objectContaining({
          name: 'hoodie-referral-invite-banner.png',
          type: 'image/png',
        }),
      ]),
    }));
    expect(container.textContent).toContain('Referral message shared.');
  });

  it('deletes only waiting referrals and refreshes the list', async () => {
    mockedFetchMyReferralInvites
      .mockResolvedValueOnce({
        invites: [
          {
            id: 'invite-waiting',
            inviter_email: 'rushi@example.com',
            invited_email: 'very.long.email.address.for.layout.coverage@example.com',
            source_app_variant: 'burb_mate',
            status: 'invited',
            created_at: '2026-04-26T00:00:00.000Z',
          },
          {
            id: 'invite-1',
            inviter_email: 'rushi@example.com',
            invited_email: 'friend@example.com',
            source_app_variant: 'burb_mate',
            status: 'joined',
            joined_at: '2026-04-25T00:00:00.000Z',
            credited_at: '2026-04-25T00:00:00.000Z',
            created_at: '2026-04-20T00:00:00.000Z',
          },
        ],
        summary: {
          total: 2,
          invited: 1,
          joined: 1,
          joined_no_credit: 0,
          already_joined: 0,
          points: 1,
        },
      })
      .mockResolvedValueOnce({
        invites: [
          {
            id: 'invite-1',
            inviter_email: 'rushi@example.com',
            invited_email: 'friend@example.com',
            source_app_variant: 'burb_mate',
            status: 'joined',
            joined_at: '2026-04-25T00:00:00.000Z',
            credited_at: '2026-04-25T00:00:00.000Z',
            created_at: '2026-04-20T00:00:00.000Z',
          },
        ],
        summary: {
          total: 1,
          invited: 0,
          joined: 1,
          joined_no_credit: 0,
          already_joined: 0,
          points: 1,
        },
      });

    const container = await renderPanel();
    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Delete');

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockedDeleteReferralInvite).toHaveBeenCalledWith('invite-waiting', 'rushi@example.com');
    expect(container.textContent).not.toContain('very.long.email.address.for.layout.coverage@example.com');
    expect(container.textContent).toContain('Waiting referral deleted.');
  });
});
