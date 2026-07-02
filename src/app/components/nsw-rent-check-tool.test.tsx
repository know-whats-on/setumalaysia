// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NswRentCheckSavedRecord } from '../lib/prepare-types';

const { createNswRentCheckMock, deleteNswRentCheckMock, fetchNswRentChecksMock } = vi.hoisted(() => ({
  createNswRentCheckMock: vi.fn(),
  deleteNswRentCheckMock: vi.fn(),
  fetchNswRentChecksMock: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  createNswRentCheck: createNswRentCheckMock,
  deleteNswRentCheck: deleteNswRentCheckMock,
  fetchNswRentChecks: fetchNswRentChecksMock,
}));

vi.mock('./address-search-field', () => {
  const nswAddress = {
    formatted_address: '1 George Street, Sydney NSW 2000',
    display_address: '1 George Street, Sydney NSW 2000',
    suburb: 'Sydney',
    postcode: '2000',
    state: 'NSW',
    lat: -33.8688,
    lng: 151.2093,
    building_id: 'nsw-building',
    unit_number: '',
  };
  const vicAddress = {
    ...nswAddress,
    formatted_address: '1 Collins Street, Melbourne VIC 3000',
    display_address: '1 Collins Street, Melbourne VIC 3000',
    suburb: 'Melbourne',
    postcode: '3000',
    state: 'VIC',
    building_id: 'vic-building',
  };

  return {
    VerifiedAddressInput: ({ onChange }: { onChange: (address: typeof nswAddress) => void }) => (
      <div>
        <button type="button" onClick={() => onChange(nswAddress)}>Use NSW address</button>
        <button type="button" onClick={() => onChange(vicAddress)}>Use VIC address</button>
      </div>
    ),
  };
});

import { NswRentCheckTool } from './nsw-rent-check-tool';

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function buildRecord(overrides: Partial<NswRentCheckSavedRecord> = {}): NswRentCheckSavedRecord {
  return {
    id: 'rent-1',
    check_number: 'RENT-0001',
    email: 'renter@example.com',
    address: {
      formatted_address: '1 George Street, Sydney NSW 2000',
      display_address: '1 George Street, Sydney NSW 2000',
      suburb: 'Sydney',
      postcode: '2000',
      state: 'NSW',
      lat: -33.8688,
      lng: 151.2093,
      building_id: 'nsw-building',
      unit_number: '',
    },
    postcode: '2000',
    property_type: 'unit',
    bedrooms: '2',
    weekly_rent: 780,
    median_rent_lower: 700,
    median_rent_upper: 850,
    source_extraction_date: '22/04/2026',
    result_state: 'withinMedian',
    percent_difference: null,
    result_message: 'This rent sits within the NSW median rent range.',
    created_at: '2026-04-22T00:00:00.000Z',
    updated_at: '2026-04-22T00:00:00.000Z',
    ...overrides,
  };
}

async function renderTool() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<NswRentCheckTool onFocusChange={vi.fn()} />);
    await Promise.resolve();
  });
  await flushEffects();

  return container;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function getButtonContaining(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

async function clickButton(container: HTMLElement, text: string) {
  const button = getButtonContaining(container, text);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('NswRentCheckTool', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    window.localStorage.setItem('ghar_email', 'renter@example.com');
    fetchNswRentChecksMock.mockResolvedValue([]);
    createNswRentCheckMock.mockResolvedValue(buildRecord());
    deleteNswRentCheckMock.mockResolvedValue({ deleted: true });
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
    vi.clearAllMocks();
  });

  it('renders saved history after load', async () => {
    fetchNswRentChecksMock.mockResolvedValue([buildRecord()]);

    const container = await renderTool();

    expect(container.textContent).toContain('1 George Street, Sydney NSW 2000');
    expect(container.textContent).toContain('$780/week');
    expect(container.textContent).toContain('Within median');
  });

  it('selecting an NSW address fills postcode and state', async () => {
    const container = await renderTool();

    await clickButton(container, 'Start New');
    await clickButton(container, 'Use NSW address');

    const values = Array.from(container.querySelectorAll<HTMLInputElement>('input')).map((input) => input.value);
    expect(values).toContain('NSW');
    expect(values).toContain('2000');
  });

  it('blocks a non-NSW address before submission', async () => {
    const container = await renderTool();

    await clickButton(container, 'Start New');
    await clickButton(container, 'Use VIC address');
    await clickButton(container, 'Next');

    expect(container.textContent).toContain('verified NSW address');
    expect(createNswRentCheckMock).not.toHaveBeenCalled();
  });

  it('submits answers and renders the result card', async () => {
    const container = await renderTool();

    await clickButton(container, 'Start New');
    await clickButton(container, 'Use NSW address');
    await clickButton(container, 'Next');
    await clickButton(container, 'House');
    await clickButton(container, 'Next');
    await clickButton(container, '2');
    await clickButton(container, 'Next');

    const rentInput = Array.from(container.querySelectorAll<HTMLInputElement>('input')).find((input) => input.placeholder === 'e.g. 780');
    expect(rentInput).toBeTruthy();
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(rentInput, '780');
      rentInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    await clickButton(container, 'Run Check');
    await flushEffects();

    expect(createNswRentCheckMock).toHaveBeenCalledWith(expect.objectContaining({
      postcode: '2000',
      property_type: 'house',
      bedrooms: '2',
      weekly_rent: 780,
    }));
    expect(container.textContent).toContain('Rent comparison');
    expect(container.textContent).toContain('$700 - $850');
    expect(container.textContent).toContain('Source: NSW Fair Trading rental bond lodgement data.');
  });
});
