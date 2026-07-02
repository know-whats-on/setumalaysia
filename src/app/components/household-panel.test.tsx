// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HouseholdPanel, type HouseholdSectionTab } from './household-panel';
import {
  acknowledgeHouseholdRules,
  analyzeHouseholdReceipt,
  createEvidence,
  createHouseholdBill,
  createSharedBill,
  respondToHouseholdInvite,
  sendHouseholdNotification,
  updateHouseholdRules,
  uploadEvidenceFile,
} from '../lib/api';
import { generateSignedHouseRulesPdf } from '../lib/household-rules-pdf';
import {
  createDefaultHouseholdRulesVersion,
  getEnabledHouseholdRuleItems,
  type HouseholdInvite,
  type HouseholdNotification,
  type HouseholdRecord,
  type HouseholdRulesAcknowledgement,
  type HouseholdRulesVersion,
} from '../lib/household';
import type { RentalEntry } from '../lib/mock-data';

const platformMocks = vi.hoisted(() => ({
  browserOpen: vi.fn(),
  nativeShell: false,
}));

vi.mock('../lib/api', () => ({
  analyzeHouseholdReceipt: vi.fn(),
  cancelHouseholdInvite: vi.fn(),
  completeHouseholdChore: vi.fn(),
  confirmBillPayment: vi.fn(),
  confirmHouseholdBillPayment: vi.fn(),
  createHouseholdBill: vi.fn(),
  createHouseholdChore: vi.fn(),
  createEvidence: vi.fn(),
  createSharedBill: vi.fn(),
  deleteHouseholdBill: vi.fn(),
  deleteHouseholdChore: vi.fn(),
  deleteHousehold: vi.fn(),
  deleteHouseholdNotification: vi.fn(),
  fetchHouseholdInvitePreview: vi.fn(),
  inviteHouseholdMembers: vi.fn(),
  leaveHousehold: vi.fn(),
  markBillPayment: vi.fn(),
  markHouseholdBillPayment: vi.fn(),
  removeHouseholdMember: vi.fn(),
  resendHouseholdInvite: vi.fn(),
  resolveHouseholdBillContact: vi.fn(),
  respondToHouseholdInvite: vi.fn(),
  sendHouseholdNotification: vi.fn(),
  acknowledgeHouseholdRules: vi.fn(),
  updateHouseholdBill: vi.fn(),
  updateHouseholdChore: vi.fn(),
  updateHouseholdRules: vi.fn(),
  uploadEvidenceFile: vi.fn(),
}));

vi.mock('../lib/household-rules-pdf', () => ({
  generateSignedHouseRulesPdf: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: platformMocks.browserOpen,
  },
}));

vi.mock('../lib/platform', () => ({
  isNativeShell: () => platformMocks.nativeShell,
}));

vi.mock('./hoodie-help-tour', () => ({
  useHoodieHelpTour: () => ({
    enabled: false,
    activeMode: null,
    activeStepId: null,
  }),
}));

vi.mock('./ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./ui/drawer', () => ({
  Drawer: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DrawerBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  platformMocks.nativeShell = false;
  platformMocks.browserOpen.mockReset();
});

vi.mock('./signed-house-rules-pdf-viewer', () => ({
  SignedHouseRulesPdfViewer: ({ acknowledgement }: { acknowledgement: HouseholdRulesAcknowledgement }) => (
    <div data-testid="signed-house-rules-pdf-viewer">
      Signed PDF preview for {acknowledgement.id}
      <button type="button">Download PDF</button>
    </div>
  ),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countTextOccurrences(container: HTMLElement, fragment: string) {
  const normalizedContent = normalizeText(container.textContent);
  const normalizedFragment = normalizeText(fragment);
  if (!normalizedFragment) return 0;
  return normalizedContent.match(new RegExp(escapeRegExp(normalizedFragment), 'g'))?.length || 0;
}

function getButtonByText(container: HTMLElement, fragment: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    normalizeText(button.textContent).includes(fragment),
  );
}

function getButtonByExactText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    normalizeText(button.textContent) === normalizeText(text),
  );
}

async function clickElement(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    nativeTextareaValueSetter?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

function getHouseRulesDialog(container: HTMLElement) {
  return container.querySelector(
    '[role="dialog"][aria-labelledby="house-rules-flow-title"], [role="dialog"][aria-labelledby="house-rules-setup-title"]',
  ) as HTMLElement | null;
}

function prepareHouseRulesSignaturePad(container: HTMLElement) {
  const pad = container.querySelector('[data-testid="house-rules-signature-pad"]') as HTMLElement | null;
  expect(pad).toBeTruthy();
  if (!pad) return null;

  Object.defineProperty(pad, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 240,
      bottom: 120,
      width: 240,
      height: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  Object.assign(pad, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
    releasePointerCapture: vi.fn(),
  });

  return pad;
}

async function drawHouseRulesSignature(container: HTMLElement) {
  const pad = prepareHouseRulesSignaturePad(container);
  if (!pad) return;

  await act(async () => {
    pad.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 24, clientY: 24 }));
    await Promise.resolve();
  });
  await act(async () => {
    pad.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 120, clientY: 60 }));
    await Promise.resolve();
  });
  await act(async () => {
    pad.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 180, clientY: 84 }));
    await Promise.resolve();
  });
}

async function agreeAllHouseRuleSections(container: HTMLElement, version: HouseholdRulesVersion) {
  const sectionCount = version.sections.filter((section) => section.items.some((item) => item.enabled)).length;
  for (let index = 0; index < sectionCount; index += 1) {
    await clickElement(getButtonByText(container, 'Agree & Next'));
  }
}

async function setSelectValue(select: HTMLSelectElement, value: string) {
  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    nativeSelectValueSetter?.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setFileInputValue(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function flushHouseholdPanelAsync() {
  for (let index = 0; index < 6; index += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      await Promise.resolve();
    });
  }
}

function getCheckedInputValues(container: HTMLElement, selector: string) {
  return Array.from(container.querySelectorAll(selector))
    .filter((input): input is HTMLInputElement => input instanceof HTMLInputElement && input.checked)
    .map((input) => input.nextElementSibling?.textContent?.trim() || '');
}

function getInputByLabelText(container: HTMLElement, selector: string, labelText: string) {
  return Array.from(container.querySelectorAll(selector)).find((input): input is HTMLInputElement => (
    input instanceof HTMLInputElement
      && normalizeText(input.nextElementSibling?.textContent) === normalizeText(labelText)
  ));
}

function makeNotification(overrides: Partial<HouseholdNotification> = {}): HouseholdNotification {
  return {
    id: 'notification-1',
    sender_email: 'rushi@hoodie.app',
    recipient_emails: ['fay@hoodie.app'],
    title: 'Saved custom gratitude title',
    body: 'For cleaning the kitchen',
    template_type: 'gratitude',
    origin_type: 'manual',
    entity_type: 'household_notification',
    entity_id: 'notification-1',
    sent_at: '2026-04-26T00:00:00.000Z',
    delivery_channel: 'push',
    deep_link: '/profile?tab=household&household_tab=overview',
    targeted_recipient_count: 1,
    delivered_recipient_count: 1,
    delivered_device_count: 1,
    delivery_status: 'dispatched',
    delivery_mode: 'webhook',
    delivery_error: '',
    metadata: {},
    ...overrides,
  };
}

function makeHousehold(overrides: Partial<HouseholdRecord> = {}): HouseholdRecord {
  const rulesVersion = makeHouseholdRulesVersion();
  return {
    id: 'household-1',
    name: 'Campus House',
    status: 'active',
    app_variant: 'ghar',
    created_by_email: 'rushi@hoodie.app',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-26T00:00:00.000Z',
    address_snapshot: {
      timeline_entry_id: 'timeline-1',
      address: '12 Hoodie Street',
      display_address: '12 Hoodie Street, Sydney NSW 2000',
      unit_number: '',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      is_current: true,
    },
    members: [
      {
        id: 'member-rushi',
        email_normalized: 'rushi@hoodie.app',
        display_name: 'Rushi Vyas',
        role: 'owner',
        status: 'active',
      },
      {
        id: 'member-liam',
        email_normalized: 'liam@hoodie.app',
        display_name: 'Liam Davies',
        role: 'member',
        status: 'active',
      },
      {
        id: 'member-fay',
        email_normalized: 'fay@hoodie.app',
        display_name: 'Fay Aurelian',
        role: 'member',
        status: 'active',
      },
    ],
    invites: [],
    bills: [],
    chores: [],
    house_rules: {
      current_version_id: rulesVersion.id,
      versions: [rulesVersion],
      acknowledgements: [
        makeHouseholdRulesAcknowledgement(rulesVersion, 'rushi@hoodie.app', 'Rushi Vyas'),
        makeHouseholdRulesAcknowledgement(rulesVersion, 'liam@hoodie.app', 'Liam Davies'),
        makeHouseholdRulesAcknowledgement(rulesVersion, 'fay@hoodie.app', 'Fay Aurelian'),
      ],
    },
    notifications: [],
    email_notifications: [],
    activity: [],
    ...overrides,
  };
}

function makeHouseholdRulesVersion(overrides: Partial<HouseholdRulesVersion> = {}): HouseholdRulesVersion {
  const version = createDefaultHouseholdRulesVersion({
    id: 'rules-v1',
    createdAt: '2026-04-26T00:00:00.000Z',
    createdByEmail: 'rushi@hoodie.app',
  });
  return {
    ...version,
    ...overrides,
  };
}

function makeHouseholdRulesAcknowledgement(
  version: HouseholdRulesVersion,
  memberEmail = 'rushi@hoodie.app',
  memberDisplayName = 'Rushi Vyas',
): HouseholdRulesAcknowledgement {
  const enabledItems = getEnabledHouseholdRuleItems(version);
  return {
    id: `ack-${memberEmail}`,
    household_id: 'household-1',
    version_id: version.id,
    member_email: memberEmail,
    member_display_name: memberDisplayName,
    checked_item_ids: enabledItems.map((item) => item.id),
    signature: {
      method: 'drawn_signature',
      typed_value: memberDisplayName,
      strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.6 }] }],
    },
    signed_at: '2026-04-26T01:00:00.000Z',
    item_count: enabledItems.length,
    rules_hash: version.rules_hash,
  };
}

function makeHouseholdWithRules(options: {
  version?: HouseholdRulesVersion;
  acknowledgements?: HouseholdRulesAcknowledgement[];
  overrides?: Partial<HouseholdRecord>;
} = {}): HouseholdRecord {
  const version = options.version || makeHouseholdRulesVersion();
  return makeHousehold({
    house_rules: {
      current_version_id: version.id,
      versions: [version],
      acknowledgements: options.acknowledgements ?? [makeHouseholdRulesAcknowledgement(version)],
    },
    ...options.overrides,
  });
}

function makeHouseholdInvite(overrides: Partial<HouseholdInvite> = {}): HouseholdInvite {
  const version = makeHouseholdRulesVersion();
  return {
    id: 'invite-1',
    token: 'invite-token-1',
    household_id: 'household-1',
    household_name: 'Campus House',
    household_address_label: '12 Hoodie Street, Sydney NSW 2000',
    recipient_email: 'rushi@hoodie.app',
    recipient_label: 'Rushi Vyas',
    sender_email: 'owner@hoodie.app',
    sender_display_name: 'House Owner',
    status: 'pending',
    expires_at: '2026-05-01T00:00:00.000Z',
    created_at: '2026-04-26T00:00:00.000Z',
    house_rules_version: version,
    ...overrides,
  };
}

async function renderHouseholdPanel(options?: {
  email?: string;
  profileFullName?: string;
  household?: HouseholdRecord;
  pendingInvites?: HouseholdInvite[];
  initialSectionTab?: HouseholdSectionTab;
  incomingInviteToken?: string | null;
  incomingInviteIntent?: 'accept' | 'decline' | null;
  sharedBills?: HouseholdRecord['bills'];
  onRefresh?: () => Promise<void>;
  onOpenRoute?: (route: string) => void;
  onSectionTabChange?: (tab: HouseholdSectionTab) => void;
}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });
  const panelEmail = options?.email || 'rushi@hoodie.app';
  const defaultProfileFullName = panelEmail === 'liam@hoodie.app'
    ? 'Liam Davies'
    : panelEmail === 'fay@hoodie.app'
      ? 'Fay Aurelian'
      : 'Rushi Vyas';

  await act(async () => {
    root.render(
      <HouseholdPanel
        email={panelEmail}
        profileFullName={options?.profileFullName || defaultProfileFullName}
        rentalHistory={[] as RentalEntry[]}
        household={options?.household === undefined ? makeHousehold() : options.household}
        pendingInvites={options?.pendingInvites || []}
        sharedBills={options?.sharedBills || []}
        billContacts={[]}
        onRefresh={options?.onRefresh || vi.fn().mockResolvedValue(undefined)}
        onOpenTimeline={vi.fn()}
        onStartCreateHousehold={vi.fn()}
        onClearIncomingInvite={vi.fn()}
        initialSectionTab={options?.initialSectionTab || 'overview'}
        incomingInviteToken={options?.incomingInviteToken || null}
        incomingInviteIntent={options?.incomingInviteIntent || null}
        onSectionTabChange={options?.onSectionTabChange}
        onOpenRoute={options?.onOpenRoute}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

describe('HouseholdPanel gratitude notifications', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.localStorage.setItem('ghar_first_name', 'Account');
    window.localStorage.setItem('ghar_last_name', 'Owner');
    vi.mocked(generateSignedHouseRulesPdf).mockResolvedValue({
      blob: new Blob(['signed pdf'], { type: 'application/pdf' }),
      fileName: 'signed-house-rules.pdf',
    });
    vi.mocked(uploadEvidenceFile).mockResolvedValue({
      storage_path: 'evidence/signed-house-rules.pdf',
      file_url: 'https://example.test/signed-house-rules.pdf',
      file_type: 'application/pdf',
      file_size: 123,
      original_name: 'signed-house-rules.pdf',
    });
    vi.mocked(createEvidence).mockResolvedValue({} as never);
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
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('autofills gratitude copy, keeps multi-recipient sending, and preserves manual title edits', async () => {
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Notify Household'));
    await clickElement(getButtonByText(container, 'Thank & celebrate'));

    const titleInput = container.querySelector('input[placeholder="Push title"]') as HTMLInputElement;
    const bodyTextarea = container.querySelector('textarea[placeholder="Write your push message to the household..."]') as HTMLTextAreaElement;
    const recipientCheckboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const thankedMemberRadios = Array.from(container.querySelectorAll('input[name="gratitude-household-thanked-member"]')) as HTMLInputElement[];

    expect(titleInput.value).toBe('Rushi thanked Liam! 🎉');
    expect(bodyTextarea.value).toBe('For ');
    expect(getCheckedInputValues(container, 'input[type="checkbox"]')).toEqual(['Liam Davies', 'Fay Aurelian']);
    expect(getCheckedInputValues(container, 'input[name="gratitude-household-thanked-member"]')).toEqual(['Liam Davies']);
    expect(container.textContent).toContain('Who are you thanking?');

    await clickElement(recipientCheckboxes[1]);
    expect(getCheckedInputValues(container, 'input[type="checkbox"]')).toEqual(['Liam Davies']);
    expect(titleInput.value).toBe('Rushi thanked Liam! 🎉');

    await clickElement(thankedMemberRadios[1]);
    expect(titleInput.value).toBe('Rushi thanked Fay! 🎉');
    expect(getCheckedInputValues(container, 'input[name="gratitude-household-thanked-member"]')).toEqual(['Fay Aurelian']);

    await setInputValue(titleInput, 'Custom thanks title');
    await clickElement(thankedMemberRadios[0]);

    expect(titleInput.value).toBe('Custom thanks title');
    expect(getCheckedInputValues(container, 'input[name="gratitude-household-thanked-member"]')).toEqual(['Liam Davies']);
  });

  it('restores saved gratitude notifications exactly as stored in the resend flow', async () => {
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        notifications: [
          makeNotification({
            recipient_emails: ['liam@hoodie.app', 'fay@hoodie.app'],
            metadata: { thanked_member_email: 'liam@hoodie.app' },
          }),
        ],
        email_notifications: [
          makeNotification({
            recipient_emails: ['liam@hoodie.app', 'fay@hoodie.app'],
            metadata: { thanked_member_email: 'liam@hoodie.app' },
          }),
        ],
      }),
      initialSectionTab: 'activity',
    });

    await clickElement(getButtonByText(container, 'Notifications'));
    await clickElement(getButtonByText(container, 'Edit / Resend'));

    const titleInput = container.querySelector('input[placeholder="Push title"]') as HTMLInputElement;
    const bodyTextarea = container.querySelector('textarea[placeholder="Write your push message to the household..."]') as HTMLTextAreaElement;

    expect(titleInput.value).toBe('Saved custom gratitude title');
    expect(bodyTextarea.value).toBe('For cleaning the kitchen');
    expect(getCheckedInputValues(container, 'input[type="checkbox"]')).toEqual(['Liam Davies', 'Fay Aurelian']);
    expect(getCheckedInputValues(container, 'input[name="gratitude-household-thanked-member"]')).toEqual(['Liam Davies']);
  });

  it('sends gratitude metadata with the separately selected thanked housemate', async () => {
    vi.mocked(sendHouseholdNotification).mockResolvedValue({
      household: null,
      notification: makeNotification({
        title: 'Rushi thanked Fay! 🎉',
        recipient_emails: ['liam@hoodie.app', 'fay@hoodie.app'],
        metadata: { thanked_member_email: 'fay@hoodie.app' },
      }),
      delivery_status: 'dispatched',
      delivered_device_count: 1,
      targeted_recipient_count: 2,
      delivery_error: '',
    });

    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Notify Household'));
    await clickElement(getButtonByText(container, 'Thank & celebrate'));
    await clickElement(getInputByLabelText(container, 'input[name="gratitude-household-thanked-member"]', 'Fay Aurelian'));
    await clickElement(getButtonByText(container, 'Send Push'));

    expect(sendHouseholdNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmails: ['liam@hoodie.app', 'fay@hoodie.app'],
      title: 'Rushi thanked Fay! 🎉',
      body: 'For',
      templateType: 'gratitude',
      metadata: { thanked_member_email: 'fay@hoodie.app' },
    }));
  });

  it('keeps the other notification templates multi-recipient', async () => {
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Notify Household'));
    await clickElement(getButtonByText(container, 'Thank & celebrate'));
    await clickElement(getButtonByText(container, 'Bill reminder'));

    const recipientCheckboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    expect(getCheckedInputValues(container, 'input[type="checkbox"]')).toEqual(['Liam Davies', 'Fay Aurelian']);

    await clickElement(recipientCheckboxes[1]);

    expect(getCheckedInputValues(container, 'input[type="checkbox"]')).toEqual(['Liam Davies']);
  });
});

describe('HouseholdPanel bills and spend summary', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.localStorage.setItem('ghar_first_name', 'Account');
    window.localStorage.setItem('ghar_last_name', 'Owner');
    vi.mocked(generateSignedHouseRulesPdf).mockResolvedValue({
      blob: new Blob(['signed pdf'], { type: 'application/pdf' }),
      fileName: 'signed-house-rules.pdf',
    });
    vi.mocked(uploadEvidenceFile).mockResolvedValue({
      storage_path: 'evidence/signed-house-rules.pdf',
      file_url: 'https://example.test/signed-house-rules.pdf',
      file_type: 'application/pdf',
      file_size: 123,
      original_name: 'signed-house-rules.pdf',
    });
    vi.mocked(createEvidence).mockResolvedValue({} as never);
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
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('shows common bill categories and saves selected standard categories', async () => {
    vi.mocked(createHouseholdBill).mockResolvedValue({} as any);
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    await clickElement(getButtonByText(container, 'Liam Davies'));

    const categorySelect = container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement;
    expect(categorySelect.value).toBe('');
    expect(Array.from(categorySelect.options).map((option) => option.textContent?.trim())).toEqual([
      'Select category',
      'Rent',
      'Utilities',
      'Internet',
      'Groceries',
      'Food',
      'Entertainment',
      'Other',
    ]);

    await setInputValue(container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement, 'Internet bill');
    await setSelectValue(categorySelect, 'Internet');
    await setInputValue(container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement, '90');
    await setInputValue(container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement, '2026-04-30');
    await clickElement(getButtonByText(container, 'Create Bill'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createHouseholdBill).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Internet bill',
      category: 'Internet',
      amountTotal: 90,
    }));
    expect(createSharedBill).not.toHaveBeenCalled();
  });

  it('saves one-person bills as personal shared bills instead of household bills', async () => {
    vi.mocked(createSharedBill).mockResolvedValue({} as any);
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    await clickElement(getButtonByText(container, 'Liam Davies'));
    await clickElement(getButtonByText(container, 'Fay Aurelian'));

    const categorySelect = container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement;
    await setInputValue(container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement, 'Old phone bill');
    await setSelectValue(categorySelect, 'Utilities');
    await setInputValue(container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement, '75');
    await setInputValue(container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement, '2026-03-15');
    const personalBillCheckbox = container.querySelector('input[aria-label="Personal bill"]') as HTMLInputElement;
    expect(personalBillCheckbox.checked).toBe(true);
    expect(container.textContent).toContain('Private to Rushi Vyas');
    await clickElement(getButtonByText(container, 'Create Bill'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createHouseholdBill).not.toHaveBeenCalled();
    expect(createSharedBill).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Old phone bill',
      billScope: 'personal',
      notifyMembers: false,
      splits: [expect.objectContaining({
        member_email: 'rushi@hoodie.app',
        amount_owed: 75,
      })],
    }));
  });

  it('lets the personal bill checkbox switch between private and shared participants', async () => {
    vi.mocked(createSharedBill).mockResolvedValue({} as any);
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    const personalBillCheckbox = container.querySelector('input[aria-label="Personal bill"]') as HTMLInputElement;
    expect(personalBillCheckbox.checked).toBe(false);

    await clickElement(personalBillCheckbox);
    expect(personalBillCheckbox.checked).toBe(true);
    expect(container.textContent).toContain('Only you can see this bill');
    expect(container.textContent).toContain('Private to Rushi Vyas');
    expect(container.textContent).not.toContain('Notify everyone on this bill');

    await clickElement(personalBillCheckbox);
    expect(personalBillCheckbox.checked).toBe(false);
    expect(container.textContent).toContain('Notify everyone on this bill');
    expect(getButtonByText(container, 'Liam Davies')).toBeTruthy();
    expect(getButtonByText(container, 'Fay Aurelian')).toBeTruthy();

    await clickElement(personalBillCheckbox);
    const categorySelect = container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement;
    await setInputValue(container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement, 'Private groceries');
    await setSelectValue(categorySelect, 'Groceries');
    await setInputValue(container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement, '42');
    await setInputValue(container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement, '2026-04-26');
    await clickElement(getButtonByText(container, 'Create Bill'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createHouseholdBill).not.toHaveBeenCalled();
    expect(createSharedBill).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Private groceries',
      billScope: 'personal',
      notifyMembers: false,
      splits: [expect.objectContaining({
        member_email: 'rushi@hoodie.app',
        amount_owed: 42,
      })],
    }));
  });

  it('requires a bill category before saving', async () => {
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    await setInputValue(container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement, 'Power');
    await setInputValue(container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement, '55');
    await setInputValue(container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement, '2026-04-30');
    await clickElement(getButtonByText(container, 'Create Bill'));

    expect(container.textContent).toContain('Choose a bill category.');
    expect(createHouseholdBill).not.toHaveBeenCalled();
  });

  it('reveals a custom category field for Other and saves the custom value', async () => {
    vi.mocked(createHouseholdBill).mockResolvedValue({} as any);
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    await clickElement(getButtonByText(container, 'Liam Davies'));

    const categorySelect = container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement;
    await setSelectValue(categorySelect, 'Other');

    const customCategoryInput = container.querySelector('input[aria-label="Custom bill category"]') as HTMLInputElement;
    expect(customCategoryInput).toBeTruthy();

    await setInputValue(container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement, 'Pet run');
    await setInputValue(customCategoryInput, 'Pet supplies');
    await setInputValue(container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement, '45');
    await setInputValue(container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement, '2026-04-30');
    await clickElement(getButtonByText(container, 'Create Bill'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createHouseholdBill).toHaveBeenCalledWith(expect.objectContaining({
      category: 'Pet supplies',
    }));
  });

  it('restores custom bill categories when editing an existing bill', async () => {
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        bills: [{
          id: 'bill-custom',
          household_id: 'household-1',
          bill_scope: 'household',
          app_variant: 'ghar',
          title: 'Snacks',
          category: 'late night snacks',
          amount_total: 30,
          due_at: '2026-04-30T00:00:00.000Z',
          created_by_email: 'rushi@hoodie.app',
          paid_by_email: 'rushi@hoodie.app',
          split_type: 'equal',
          notes: '',
          status: 'open',
          email_members: true,
          created_at: '2026-04-26T00:00:00.000Z',
          splits: [
            {
              id: 'split-rushi',
              member_email: 'rushi@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Rushi Vyas',
              amount_owed: 10,
              amount_paid: 10,
              shares: 1,
              status: 'settled',
            },
            {
              id: 'split-liam',
              member_email: 'liam@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Liam Davies',
              amount_owed: 10,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
            {
              id: 'split-fay',
              member_email: 'fay@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Fay Aurelian',
              amount_owed: 10,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
          ],
          payments: [],
        }],
      }),
      initialSectionTab: 'bills',
    });

    await clickElement(getButtonByText(container, 'Edit'));

    const categorySelect = container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement;
    const customCategoryInput = container.querySelector('input[aria-label="Custom bill category"]') as HTMLInputElement;

    expect(categorySelect.value).toBe('Other');
    expect(customCategoryInput.value).toBe('late night snacks');
  });

  it('dedupes repeated household name and address in the header', async () => {
    const addressLabel = '12 Hoodie Street, Sydney NSW 2000';
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        name: addressLabel,
      }),
    });

    expect(countTextOccurrences(container, addressLabel)).toBe(1);
  });

  it('keeps distinct household names and addresses as separate header lines', async () => {
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        name: 'Campus House',
      }),
    });

    expect(container.textContent).toContain('Campus House');
    expect(container.textContent).toContain('12 Hoodie Street, Sydney NSW 2000');
  });

  it('keeps spend summary out of the overview screen', async () => {
    const container = await renderHouseholdPanel({
      initialSectionTab: 'overview',
    });

    expect(container.textContent).not.toContain('Spend summary');
  });

  it('keeps rich spend analytics out of the bills section', async () => {
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        bills: [
          {
            id: 'bill-week',
            household_id: 'household-1',
            bill_scope: 'household',
            app_variant: 'ghar',
            title: 'Utilities',
            category: 'Utilities',
            amount_total: 100,
            due_at: '2026-04-30T00:00:00.000Z',
            created_by_email: 'rushi@hoodie.app',
            paid_by_email: 'rushi@hoodie.app',
            split_type: 'equal',
            notes: '',
            status: 'open',
            email_members: true,
            created_at: '2026-04-25T00:00:00.000Z',
            splits: [
              {
                id: 'split-rushi-week',
                member_email: 'rushi@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Rushi Vyas',
                amount_owed: 40,
                amount_paid: 40,
                shares: 1,
                status: 'settled',
              },
              {
                id: 'split-liam-week',
                member_email: 'liam@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Liam Davies',
                amount_owed: 30,
                amount_paid: 0,
                shares: 1,
                status: 'open',
              },
              {
                id: 'split-fay-week',
                member_email: 'fay@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Fay Aurelian',
                amount_owed: 30,
                amount_paid: 0,
                shares: 1,
                status: 'open',
              },
            ],
            payments: [],
          },
          {
            id: 'bill-month',
            household_id: 'household-1',
            bill_scope: 'household',
            app_variant: 'ghar',
            title: 'Internet',
            category: 'Internet',
            amount_total: 80,
            due_at: '2026-04-18T00:00:00.000Z',
            created_by_email: 'rushi@hoodie.app',
            paid_by_email: 'liam@hoodie.app',
            split_type: 'equal',
            notes: '',
            status: 'open',
            email_members: true,
            created_at: '2026-04-10T00:00:00.000Z',
            splits: [
              {
                id: 'split-rushi-month',
                member_email: 'rushi@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Rushi Vyas',
                amount_owed: 20,
                amount_paid: 0,
                shares: 1,
                status: 'open',
              },
              {
                id: 'split-liam-month',
                member_email: 'liam@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Liam Davies',
                amount_owed: 30,
                amount_paid: 0,
                shares: 1,
                status: 'open',
              },
              {
                id: 'split-fay-month',
                member_email: 'fay@hoodie.app',
                participant_type: 'household_member',
                participant_display_name: 'Fay Aurelian',
                amount_owed: 30,
                amount_paid: 0,
                shares: 1,
                status: 'open',
              },
            ],
            payments: [],
          },
        ],
      }),
      sharedBills: [
        {
          id: 'shared-week',
          bill_scope: 'shared',
          app_variant: 'ghar',
          title: 'Brunch',
          category: 'Groceries',
          amount_total: 50,
          due_at: '2026-04-28T00:00:00.000Z',
          created_by_email: 'rushi@hoodie.app',
          paid_by_email: 'rushi@hoodie.app',
          split_type: 'equal',
          notes: '',
          status: 'open',
          email_members: true,
          created_at: '2026-04-24T00:00:00.000Z',
          splits: [
            {
              id: 'shared-split-rushi',
              member_email: 'rushi@hoodie.app',
              participant_type: 'hoodie_friend',
              participant_display_name: 'Rushi Vyas',
              amount_owed: 25,
              amount_paid: 25,
              shares: 1,
              status: 'settled',
            },
            {
              id: 'shared-split-friend',
              member_email: 'friend@hoodie.app',
              participant_type: 'hoodie_friend',
              participant_display_name: 'Cafe Friend',
              amount_owed: 25,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
          ],
          payments: [],
        },
      ],
      initialSectionTab: 'bills',
    });

    expect(container.textContent).not.toContain('Spend summary');
    expect(container.textContent).toContain('Add Bill');
    expect(container.textContent).toContain('Utilities');
    expect(container.textContent).toContain('Internet');
  });

  it('keeps the bills empty state focused on bill management', async () => {
    const container = await renderHouseholdPanel({
      initialSectionTab: 'bills',
    });

    expect(container.textContent).not.toContain('Spend summary');
    expect(container.textContent).toContain('No bills yet');
  });

  it('uses the section drawer and launches the dedicated expense tracker route', async () => {
    const onOpenRoute = vi.fn();
    const container = await renderHouseholdPanel({ onOpenRoute });

    expect(container.textContent).toContain('Household section');

    await clickElement(getButtonByText(container, 'Household section'));
    expect(container.textContent).toContain('Household sections');
    expect(container.textContent).toContain('Expense Tracker');
    expect(container.textContent).not.toContain('New');

    await clickElement(getButtonByText(container, 'Expense Tracker'));

    expect(onOpenRoute).toHaveBeenCalledWith('/household/expenses');
  });

  it('blocks the bill drawer while receipt scanning is in progress', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof analyzeHouseholdReceipt>>>();
    vi.mocked(analyzeHouseholdReceipt).mockReturnValue(deferred.promise);
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));
    const scanInput = Array.from(container.querySelectorAll('input[type="file"]')).find((input): input is HTMLInputElement =>
      input instanceof HTMLInputElement && input.getAttribute('accept') === 'image/*',
    );
    await setFileInputValue(scanInput as HTMLInputElement, [
      new File(['receipt image'], 'receipt.png', { type: 'image/png' }),
    ]);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Scanning receipt...');
    expect((container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement).matches(':disabled')).toBe(true);
    expect(getButtonByText(container, 'Create Bill')).toBeUndefined();
    expect(getButtonByText(container, 'Scanning receipt...')).toBeTruthy();

    deferred.resolve({
      title: 'Receipt result',
      merchant: 'Receipt result',
      amount_total: 10,
      category: 'Food',
      transaction_date: '2026-04-26',
      notes: '',
      confidence: 0.9,
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Hoodie is reading the merchant');
    expect((container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement).matches(':disabled')).toBe(false);
  });

  it('scans a bill photo and autofills the draft without saving', async () => {
    vi.mocked(analyzeHouseholdReceipt).mockResolvedValue({
      title: 'Woolworths Wolli Creek',
      merchant: 'Woolworths',
      amount_total: 64.25,
      category: 'Groceries',
      transaction_date: '2026-04-26',
      notes: 'AI extracted from receipt.',
      confidence: 0.88,
    });
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));

    const scanInput = Array.from(container.querySelectorAll('input[type="file"]')).find((input): input is HTMLInputElement =>
      input instanceof HTMLInputElement && input.getAttribute('accept') === 'image/*',
    );
    expect(scanInput).toBeTruthy();
    expect(scanInput?.getAttribute('accept')).toBe('image/*');
    expect(scanInput?.hasAttribute('capture')).toBe(false);
    expect(container.textContent).toContain('Choose photo');

    await setFileInputValue(scanInput as HTMLInputElement, [
      new File(['receipt image'], 'receipt.png', { type: 'image/png' }),
    ]);
    await flushHouseholdPanelAsync();

    expect(analyzeHouseholdReceipt).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      actorEmail: 'rushi@hoodie.app',
    }));
    expect((container.querySelector('input[placeholder="Bill title"]') as HTMLInputElement).value).toBe('Woolworths Wolli Creek');
    expect((container.querySelector('input[placeholder="Total amount"]') as HTMLInputElement).value).toBe('64.25');
    expect((container.querySelector('select[aria-label="Bill category"]') as HTMLSelectElement).value).toBe('Groceries');
    expect((container.querySelector('input[aria-label="Select bill due date"]') as HTMLInputElement).value).toBe('2026-04-26');
    expect(container.textContent).toContain('Receipt scanned. Review the draft before saving.');
    expect(createHouseholdBill).not.toHaveBeenCalled();
  });

  it('keeps manual bill entry usable with a warning when receipt AI times out', async () => {
    vi.mocked(analyzeHouseholdReceipt).mockRejectedValue(new Error('The request timed out.'));
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));

    const scanInput = Array.from(container.querySelectorAll('input[type="file"]')).find((input): input is HTMLInputElement =>
      input instanceof HTMLInputElement && input.getAttribute('accept') === 'image/*',
    );
    await setFileInputValue(scanInput as HTMLInputElement, [
      new File(['receipt image'], 'receipt.png', { type: 'image/png' }),
    ]);
    await flushHouseholdPanelAsync();

    expect(container.textContent).toContain('Receipt attached. Hoodie could not finish reading it in time');
    expect(container.querySelector('input[placeholder="Bill title"]')).toBeTruthy();
    expect(container.textContent).toContain('receipt.png');
  });

  it('keeps manual bill entry usable with a warning when receipt AI returns a generic failure', async () => {
    vi.mocked(analyzeHouseholdReceipt).mockRejectedValue(new Error('Failed to scan receipt'));
    const container = await renderHouseholdPanel();

    await clickElement(getButtonByText(container, 'Add Bill'));

    const scanInput = Array.from(container.querySelectorAll('input[type="file"]')).find((input): input is HTMLInputElement =>
      input instanceof HTMLInputElement && input.getAttribute('accept') === 'image/*',
    );
    await setFileInputValue(scanInput as HTMLInputElement, [
      new File(['receipt image'], 'receipt.png', { type: 'image/png' }),
    ]);
    await flushHouseholdPanelAsync();

    expect(container.textContent).toContain('Receipt attached. Hoodie could not confidently read it this time');
    expect(container.textContent).not.toContain('Failed to scan receipt');
    expect(container.querySelector('input[placeholder="Bill title"]')).toBeTruthy();
  });

  it('opens household bill attachments with the native browser from Hoodie', async () => {
    platformMocks.nativeShell = true;
    platformMocks.browserOpen.mockResolvedValue(undefined);
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    const container = await renderHouseholdPanel({
      household: makeHousehold({
        bills: [{
          id: 'bill-with-attachment',
          household_id: 'household-1',
          bill_scope: 'household',
          app_variant: 'burb_mate',
          title: 'Water bill',
          category: 'Utilities',
          amount_total: 120,
          due_at: '2026-04-30T00:00:00.000Z',
          created_by_email: 'rushi@hoodie.app',
          paid_by_email: 'rushi@hoodie.app',
          split_type: 'equal',
          notes: '',
          status: 'open',
          email_members: true,
          created_at: '2026-04-26T00:00:00.000Z',
          attachments: [{
            storage_path: 'evidence/water-bill.jpg',
            file_url: 'https://signed.example.test/water-bill.jpg',
            file_type: 'image/jpeg',
            file_size: 2048,
            original_name: 'water-bill.jpg',
          }],
          splits: [
            {
              id: 'split-rushi',
              member_email: 'rushi@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Rushi Vyas',
              amount_owed: 40,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
            {
              id: 'split-liam',
              member_email: 'liam@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Liam Davies',
              amount_owed: 40,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
            {
              id: 'split-fay',
              member_email: 'fay@hoodie.app',
              participant_type: 'household_member',
              participant_display_name: 'Fay Aurelian',
              amount_owed: 40,
              amount_paid: 0,
              shares: 1,
              status: 'open',
            },
          ],
          payments: [],
        }],
      }),
      initialSectionTab: 'bills',
    });

    await clickElement(getButtonByText(container, 'Photo • water-bill.jpg'));
    expect(getButtonByText(container, 'Open Outside')).toBeTruthy();

    await clickElement(getButtonByText(container, 'Open Outside'));

    expect(platformMocks.browserOpen).toHaveBeenCalledWith({
      url: 'https://signed.example.test/water-bill.jpg',
    });
    expect(windowOpen).not.toHaveBeenCalled();
  });
});

describe('HouseholdPanel house rules', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.localStorage.setItem('ghar_first_name', 'Account');
    window.localStorage.setItem('ghar_last_name', 'Owner');
    vi.mocked(generateSignedHouseRulesPdf).mockResolvedValue({
      blob: new Blob(['signed pdf'], { type: 'application/pdf' }),
      fileName: 'signed-house-rules.pdf',
    });
    vi.mocked(uploadEvidenceFile).mockResolvedValue({
      storage_path: 'evidence/signed-house-rules.pdf',
      file_url: 'https://example.test/signed-house-rules.pdf',
      file_type: 'application/pdf',
      file_size: 123,
      original_name: 'signed-house-rules.pdf',
    });
    vi.mocked(createEvidence).mockResolvedValue({} as never);
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
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('keeps dashboard stats out of House Rules', async () => {
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules(),
      initialSectionTab: 'rules',
    });

    expect(container.textContent).toContain('Acknowledgements');
    expect(container.textContent).not.toContain('You owe');
    expect(container.textContent).not.toContain("You're owed");
    expect(container.textContent).not.toContain('Bills due');
    expect(container.textContent).not.toContain('Chores due');
  });

  it('shows all household stats in Overview', async () => {
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules(),
      initialSectionTab: 'overview',
    });

    expect(container.textContent).toContain('You owe');
    expect(container.textContent).toContain("You're owed");
    expect(container.textContent).toContain('Bills due');
    expect(container.textContent).toContain('Chores due');
  });

  it('shows only bill-relevant stats in Bills', async () => {
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules(),
      initialSectionTab: 'bills',
    });

    expect(container.textContent).toContain('You owe');
    expect(container.textContent).toContain("You're owed");
    expect(container.textContent).toContain('Bills due');
    expect(container.textContent).not.toContain('Chores due');
  });

  it('shows only chore-relevant stats in Chores', async () => {
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules(),
      initialSectionTab: 'chores',
    });

    expect(container.textContent).toContain('Chores due');
    expect(container.textContent).not.toContain('You owe');
    expect(container.textContent).not.toContain("You're owed");
    expect(container.textContent).not.toContain('Bills due');
  });

  it('embeds signed PDFs for visible signed acknowledgements only', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [
          makeHouseholdRulesAcknowledgement(version, 'rushi@hoodie.app', 'Rushi Vyas'),
          makeHouseholdRulesAcknowledgement(version, 'liam@hoodie.app', 'Liam Davies'),
        ],
      }),
      initialSectionTab: 'rules',
    });

    expect(container.querySelectorAll('[data-testid="signed-house-rules-pdf-viewer"]')).toHaveLength(2);

    const memberContainer = await renderHouseholdPanel({
      email: 'fay@hoodie.app',
      profileFullName: 'Fay Aurelian',
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [
          makeHouseholdRulesAcknowledgement(version, 'rushi@hoodie.app', 'Rushi Vyas'),
          makeHouseholdRulesAcknowledgement(version, 'liam@hoodie.app', 'Liam Davies'),
        ],
      }),
      initialSectionTab: 'rules',
    });

    expect(memberContainer.textContent).toContain('Waiting for latest version signature');
    expect(memberContainer.querySelectorAll('[data-testid="signed-house-rules-pdf-viewer"]')).toHaveLength(0);
  });

  it('opens the full-screen declaration flow from Move In instead of immediately joining', async () => {
    const invite = makeHouseholdInvite();
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
    });

    await clickElement(getButtonByText(container, 'Move In'));

    expect(respondToHouseholdInvite).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Accept house rules');
    expect(container.textContent).toContain(invite.house_rules_version?.title);
    expect(container.textContent).toContain('Step 1 of');
    expect(getButtonByText(container, 'Agree & Next')).toBeTruthy();
  });

  it('auto-opens the declaration checklist from an iMessage invite accept link', async () => {
    const invite = makeHouseholdInvite();
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
      incomingInviteToken: invite.token,
      incomingInviteIntent: 'accept',
    });
    await flushHouseholdPanelAsync();

    expect(respondToHouseholdInvite).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Accept house rules');
    expect(container.textContent).toContain(invite.house_rules_version?.title);
  });

  it('shows Sydney published time without exposing the version hash in the signing flow', async () => {
    const invite = makeHouseholdInvite();
    const rulesHash = invite.house_rules_version?.rules_hash || 'missing-rules-hash';
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
    });

    await clickElement(getButtonByText(container, 'Move In'));

    const dialog = getHouseRulesDialog(container);
    expect(dialog?.textContent).toContain('Published on 26 Apr 2026, 10:00 AM Sydney time');
    expect(dialog?.textContent).not.toContain('Version hash');
    expect(dialog?.textContent).not.toContain(rulesHash);

    const footer = container.querySelector('[data-testid="house-rules-accept-footer"]') as HTMLElement | null;
    expect(footer?.getAttribute('style')).toContain('native-safe-area-bottom');
    expect(footer?.getAttribute('style')).not.toContain('app-bottom-nav-clearance');
  });

  it('blocks invite acceptance until every section is agreed and the profile name is signed', async () => {
    const invite = makeHouseholdInvite();
    const version = invite.house_rules_version as HouseholdRulesVersion;
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
    });

    await clickElement(getButtonByText(container, 'Move In'));

    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    await agreeAllHouseRuleSections(container, version);

    const submitButton = getButtonByText(container, 'Sign & Join') as HTMLButtonElement;
    const typedNameInput = container.querySelector('input[placeholder="Type your profile full name"]') as HTMLInputElement;
    expect(typedNameInput.value).toBe('Rushi Vyas');
    expect(submitButton.matches(':disabled')).toBe(true);

    await setInputValue(typedNameInput, 'Wrong Name');
    await drawHouseRulesSignature(container);
    expect(submitButton.matches(':disabled')).toBe(true);
    await setInputValue(typedNameInput, 'Rushi Vyas');
    expect(submitButton.matches(':disabled')).toBe(false);
    expect(respondToHouseholdInvite).not.toHaveBeenCalled();
  });

  it('prevents text selection while drawing a signature', async () => {
    const invite = makeHouseholdInvite();
    const version = invite.house_rules_version as HouseholdRulesVersion;
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
    });

    await clickElement(getButtonByText(container, 'Move In'));
    await agreeAllHouseRuleSections(container, version);

    const helperText = Array.from(container.querySelectorAll('p')).find((entry) =>
      normalizeText(entry.textContent).includes('Draw your signature in the box'),
    );
    const pad = prepareHouseRulesSignaturePad(container);
    expect(helperText?.className).toContain('select-none');
    expect(pad?.className).toContain('select-none');

    const selection = window.getSelection();
    const removeSelectionSpy = selection ? vi.spyOn(selection, 'removeAllRanges') : null;
    const pointerDown = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: 24,
      clientY: 24,
    });
    const pointerMove = new MouseEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 60,
    });

    await act(async () => {
      pad?.dispatchEvent(pointerDown);
      await Promise.resolve();
    });
    await act(async () => {
      pad?.dispatchEvent(pointerMove);
      await Promise.resolve();
    });

    expect(pointerDown.defaultPrevented).toBe(true);
    expect(pointerMove.defaultPrevented).toBe(true);
    expect(removeSelectionSpy).toHaveBeenCalled();
  });

  it('sends the rules acknowledgement payload when the invite is accepted', async () => {
    const invite = makeHouseholdInvite();
    const version = invite.house_rules_version as HouseholdRulesVersion;
    const enabledItemIds = getEnabledHouseholdRuleItems(version).map((item) => item.id);
    const acknowledgement = makeHouseholdRulesAcknowledgement(version, 'rushi@hoodie.app', 'Rushi Vyas');
    const acceptedHousehold = makeHouseholdWithRules({
      version,
      acknowledgements: [acknowledgement],
      overrides: {
        house_rules: {
          current_version_id: version.id,
          versions: [version],
          acknowledgements: [acknowledgement],
          owner_setup_completed_version_id: version.id,
        },
      },
    });
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onSectionTabChange = vi.fn();
    vi.mocked(respondToHouseholdInvite).mockResolvedValue({
      household: acceptedHousehold,
      acknowledgement,
    } as never);
    const container = await renderHouseholdPanel({
      household: null,
      pendingInvites: [invite],
      onRefresh,
      onSectionTabChange,
    });

    await clickElement(getButtonByText(container, 'Move In'));
    await agreeAllHouseRuleSections(container, version);
    await drawHouseRulesSignature(container);
    await clickElement(getButtonByText(container, 'Sign & Join'));
    await flushHouseholdPanelAsync();

    expect(respondToHouseholdInvite).toHaveBeenCalledWith(expect.objectContaining({
      token: invite.token,
      email: 'rushi@hoodie.app',
      action: 'accept',
      forceLeaveCurrent: false,
      rulesAcknowledgement: expect.objectContaining({
        version_id: version.id,
        signature: expect.objectContaining({
          method: 'drawn_signature',
          typed_value: 'Rushi Vyas',
          strokes: expect.arrayContaining([
            expect.objectContaining({
              points: expect.arrayContaining([
                expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
              ]),
            }),
          ]),
        }),
      }),
    }));
    const payload = vi.mocked(respondToHouseholdInvite).mock.calls[0]?.[0].rulesAcknowledgement;
    expect([...(payload?.checked_item_ids || [])].sort()).toEqual([...enabledItemIds].sort());
    expect(onRefresh).toHaveBeenCalled();
    expect(onSectionTabChange).toHaveBeenCalledWith('overview');
    expect(generateSignedHouseRulesPdf).toHaveBeenCalledWith(expect.objectContaining({
      household: acceptedHousehold,
      version,
      acknowledgement,
    }));
    expect(uploadEvidenceFile).toHaveBeenCalled();
    expect(createEvidence).toHaveBeenCalledWith(expect.objectContaining({
      email: 'rushi@hoodie.app',
      filename: 'signed-house-rules.pdf',
    }));
  });

  it('forces the owner into setup before signing default rules', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    const dialog = getHouseRulesDialog(container);
    expect(dialog?.textContent).toContain('Set up house rules');
    expect(dialog?.textContent).toContain('Step 1 of');
    expect(getButtonByText(container, 'Save & Next')).toBeTruthy();
    expect(container.textContent).not.toContain('Sign Rules');
  });

  it('keeps added checklist items visible while editing', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    const initialTextareas = Array.from(container.querySelectorAll('[data-house-rule-item-id]')) as HTMLTextAreaElement[];
    await clickElement(getButtonByText(container, 'Add checklist item'));
    await flushHouseholdPanelAsync();

    const updatedTextareas = Array.from(container.querySelectorAll('[data-house-rule-item-id]')) as HTMLTextAreaElement[];
    expect(updatedTextareas).toHaveLength(initialTextareas.length + 1);
    expect(updatedTextareas.at(-1)?.value).toBe('');
    expect(document.activeElement).toBe(updatedTextareas.at(-1));
  });

  it('preserves spaces typed into the first checklist item textarea', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    const firstRuleTextarea = container.querySelector('[data-house-rule-item-id]') as HTMLTextAreaElement;
    await setTextareaValue(firstRuleTextarea, 'First rule with several spaces inside ');

    expect(firstRuleTextarea.value).toBe('First rule with several spaces inside ');
  });

  it('blocks continuing when an active checklist item is blank', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    await clickElement(getButtonByText(container, 'Add checklist item'));
    await clickElement(getButtonByText(container, 'Save & Next'));

    expect(container.textContent).toContain('Fill in every active checklist item before continuing, or turn blank items off.');
    expect(container.textContent).toContain('Step 1 of');
  });

  it('adds a new section from an edit step instead of the signature step', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    await clickElement(getButtonByExactText(container, 'Add section'));
    await flushHouseholdPanelAsync();

    expect(container.textContent).toContain('Step 2 of 10');
    const titleInput = container.querySelector('input[aria-label="Rule section 2 title"]') as HTMLInputElement;
    expect(titleInput.value).toBe('New section');
  });

  it('does not show Add another section on the publish signature step', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'overview',
    });
    await flushHouseholdPanelAsync();

    for (let index = 0; index < version.sections.length; index += 1) {
      await clickElement(getButtonByText(container, 'Save & Next'));
    }

    expect(container.textContent).toContain('Publish and sign');
    expect(container.textContent).not.toContain('Add another section');
  });

  it('shows exact publish failures from the rules API', async () => {
    const version = makeHouseholdRulesVersion();
    const household = makeHouseholdWithRules({
      version,
      acknowledgements: [makeHouseholdRulesAcknowledgement(version)],
    });
    vi.mocked(updateHouseholdRules).mockRejectedValueOnce(new Error('Backend exact publish error'));
    const container = await renderHouseholdPanel({
      household,
      initialSectionTab: 'rules',
    });

    await clickElement(getButtonByText(container, 'Edit Rules'));
    for (let index = 0; index < version.sections.length; index += 1) {
      await clickElement(getButtonByText(container, 'Save & Next'));
    }
    await drawHouseRulesSignature(container);
    await clickElement(getButtonByText(container, 'Publish & Sign'));
    await flushHouseholdPanelAsync();

    expect(container.textContent).toContain('Backend exact publish error');
  });

  it('shows non-owner members a waiting state until the owner publishes setup', async () => {
    const version = makeHouseholdRulesVersion();
    const container = await renderHouseholdPanel({
      email: 'liam@hoodie.app',
      household: makeHouseholdWithRules({
        version,
        acknowledgements: [],
      }),
      initialSectionTab: 'rules',
    });
    await flushHouseholdPanelAsync();

    expect(getHouseRulesDialog(container)).toBeNull();
    expect(container.textContent).toContain('Owner setup pending');
    expect(container.textContent).not.toContain('Review & Sign');
  });

  it('lets the owner publish edited rules and shows members pending the latest acknowledgement', async () => {
    const version = makeHouseholdRulesVersion();
    const ownerAcknowledgement = makeHouseholdRulesAcknowledgement(version);
    const household = makeHouseholdWithRules({
      version,
      acknowledgements: [ownerAcknowledgement],
    });
    const container = await renderHouseholdPanel({
      household,
      initialSectionTab: 'rules',
    });

    await clickElement(getButtonByText(container, 'Edit Rules'));
    for (let index = 0; index < version.sections.length; index += 1) {
      await clickElement(getButtonByText(container, 'Save & Next'));
    }

    const updatedVersion = makeHouseholdRulesVersion({
      id: 'rules-v2',
      version_number: 2,
      title: 'Updated House Rules',
      created_at: '2026-04-27T00:00:00.000Z',
      rules_hash: 'hr_updated',
      change_note: 'Quiet hours clarified',
    });
    const updatedOwnerAcknowledgement = makeHouseholdRulesAcknowledgement(updatedVersion);
    const updatedHousehold = makeHouseholdWithRules({
      version: updatedVersion,
      acknowledgements: [updatedOwnerAcknowledgement],
      overrides: {
        house_rules: {
          current_version_id: updatedVersion.id,
          versions: [updatedVersion, version],
          acknowledgements: [updatedOwnerAcknowledgement, ownerAcknowledgement],
          owner_setup_completed_version_id: updatedVersion.id,
        },
      },
    });
    vi.mocked(updateHouseholdRules).mockResolvedValue({
      household: updatedHousehold,
      house_rules: updatedHousehold.house_rules,
      version: updatedVersion,
      acknowledgement: updatedOwnerAcknowledgement,
    } as never);

    await setInputValue(container.querySelector('input[placeholder="Rules title"]') as HTMLInputElement, 'Updated House Rules');
    await setInputValue(container.querySelector('input[placeholder="Change note (optional)"]') as HTMLInputElement, 'Quiet hours clarified');
    const ownerNameInput = container.querySelector('input[placeholder="Type your profile full name"]') as HTMLInputElement;
    expect(ownerNameInput.value).toBe('Rushi Vyas');
    await setInputValue(ownerNameInput, 'Rushi Vyas');
    await drawHouseRulesSignature(container);
    await clickElement(getButtonByText(container, 'Publish & Sign'));
    await flushHouseholdPanelAsync();

    expect(updateHouseholdRules).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      actorEmail: 'rushi@hoodie.app',
      rulesDraft: expect.objectContaining({
        title: 'Updated House Rules',
        change_note: 'Quiet hours clarified',
      }),
      acknowledgement: expect.objectContaining({
        checked_item_ids: expect.arrayContaining(getEnabledHouseholdRuleItems(version).map((item) => item.id)),
        signature: expect.objectContaining({
          method: 'drawn_signature',
          typed_value: 'Rushi Vyas',
          strokes: expect.arrayContaining([
            expect.objectContaining({
              points: expect.arrayContaining([
                expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
              ]),
            }),
          ]),
        }),
      }),
    }));
    const memberContainer = await renderHouseholdPanel({
      email: 'liam@hoodie.app',
      household: makeHouseholdWithRules({
        version: updatedVersion,
        acknowledgements: [updatedOwnerAcknowledgement],
        overrides: {
          house_rules: {
            current_version_id: updatedVersion.id,
            versions: [updatedVersion, version],
            acknowledgements: [updatedOwnerAcknowledgement],
            owner_setup_completed_version_id: updatedVersion.id,
          },
        },
      }),
      initialSectionTab: 'rules',
    });

    expect(memberContainer.textContent).toContain('House rules need your signature');
    expect(memberContainer.textContent).toContain('Waiting for latest version signature');
    expect(memberContainer.textContent).toContain('Pending');
  });

  it('auto-opens updated rules and highlights edited declaration text', async () => {
    const previousVersion = makeHouseholdRulesVersion();
    const changedDescription = 'Everyone keeps the home livable by following the updated written roster.';
    const changedRuleText = 'I will follow the updated written cleaning roster and complete my assigned chores on time.';
    const unchangedRuleText = previousVersion.sections[0].items[1].text;
    const updatedSections = previousVersion.sections.map((section, sectionIndex) => (
      sectionIndex === 0
        ? {
            ...section,
            description: changedDescription,
            items: section.items.map((item, itemIndex) => (
              itemIndex === 0 ? { ...item, text: changedRuleText } : item
            )),
          }
        : section
    ));
    const updatedVersion = makeHouseholdRulesVersion({
      id: 'rules-v2',
      version_number: 2,
      created_at: '2026-04-27T11:12:00.000Z',
      rules_hash: 'hr_rules_v2',
      sections: updatedSections,
    });
    const household = makeHousehold({
      house_rules: {
        current_version_id: updatedVersion.id,
        versions: [previousVersion, updatedVersion],
        acknowledgements: [
          makeHouseholdRulesAcknowledgement(updatedVersion, 'rushi@hoodie.app', 'Rushi Vyas'),
          makeHouseholdRulesAcknowledgement(previousVersion, 'liam@hoodie.app', 'Liam Davies'),
        ],
        owner_setup_completed_version_id: updatedVersion.id,
      },
    });

    const container = await renderHouseholdPanel({
      email: 'liam@hoodie.app',
      household,
      initialSectionTab: 'rules',
    });
    await flushHouseholdPanelAsync();

    const dialog = getHouseRulesDialog(container);
    expect(dialog?.textContent).toContain('Review house rules');
    expect(dialog?.textContent).toContain('Version 2');
    expect(dialog?.textContent).toContain('Published on 27 Apr 2026, 9:12 PM Sydney time');

    const highlightedText = Array.from(dialog?.querySelectorAll('[data-testid="house-rules-change-highlight"]') || [])
      .map((entry) => normalizeText(entry.textContent));
    expect(highlightedText).toContain(changedDescription);
    expect(highlightedText).toContain(changedRuleText);
    expect(highlightedText).not.toContain(unchangedRuleText);
  });

  it('opens the House Rules tab from a rules notification', async () => {
    const onSectionTabChange = vi.fn();
    const notification = makeNotification({
      id: 'rules-notification',
      origin_type: 'house_rules_changed',
      entity_type: 'house_rules',
      entity_id: 'rules-v2',
      title: 'House rules changed',
      body: 'Please review the latest household rules.',
      deep_link: '/profile?tab=household&household_tab=rules',
    });
    const container = await renderHouseholdPanel({
      household: makeHouseholdWithRules({
        overrides: {
          notifications: [notification],
        },
      }),
      initialSectionTab: 'activity',
      onSectionTabChange,
    });

    await clickElement(getButtonByText(container, 'Notifications'));
    await clickElement(getButtonByText(container, 'Open House Rules'));

    expect(onSectionTabChange).toHaveBeenCalledWith('rules');
    expect(container.textContent).toContain('Acknowledgements');
  });

  it('submits active member acknowledgements for the latest rules version', async () => {
    const version = makeHouseholdRulesVersion();
    const household = makeHouseholdWithRules({
      version,
      acknowledgements: [makeHouseholdRulesAcknowledgement(version)],
    });
    vi.mocked(acknowledgeHouseholdRules).mockResolvedValue({
      household,
      acknowledgement: makeHouseholdRulesAcknowledgement(version, 'liam@hoodie.app', 'Liam Davies'),
    } as never);
    const onSectionTabChange = vi.fn();
    const container = await renderHouseholdPanel({
      email: 'liam@hoodie.app',
      profileFullName: 'Liam Davies',
      household,
      initialSectionTab: 'rules',
      onSectionTabChange,
    });

    await clickElement(getButtonByText(container, 'Review & Sign'));
    await agreeAllHouseRuleSections(container, version);
    await drawHouseRulesSignature(container);
    await clickElement(getButtonByText(container, 'Sign Rules'));
    await flushHouseholdPanelAsync();

    expect(acknowledgeHouseholdRules).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 'household-1',
      actorEmail: 'liam@hoodie.app',
      versionId: version.id,
      acknowledgement: expect.objectContaining({
        version_id: version.id,
        signature: expect.objectContaining({
          method: 'drawn_signature',
          typed_value: 'Liam Davies',
          strokes: expect.arrayContaining([
            expect.objectContaining({
              points: expect.arrayContaining([
                expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
              ]),
            }),
          ]),
        }),
      }),
    }));
    expect(onSectionTabChange).toHaveBeenCalledWith('overview');
  });
});
