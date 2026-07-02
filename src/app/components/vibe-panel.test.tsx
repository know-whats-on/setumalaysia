// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VibePanel } from './vibe-panel';

vi.mock('../lib/suburb-crime-map', () => ({
  lookupCrimeForSuburb: vi.fn(() => null),
  getCautionStyle: vi.fn(() => ({
    bg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    label: 'Low',
    text: 'text-[#64748B]',
  })),
}));

const mountedComponents: Array<{ container: HTMLDivElement; root: Root }> = [];

describe('VibePanel Wolli Creek', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
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
  });

  it('shows all 12 requested Wolli countries with total and student comparisons', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedComponents.push({ container, root });

    await act(async () => {
      root.render(<VibePanel suburbName="Wolli Creek" />);
      await Promise.resolve();
    });

    const text = container.textContent || '';
    const expectedCountries = [
      'China',
      'Mongolia',
      'Indonesia',
      'Hong Kong',
      'Philippines',
      'India',
      'Vietnam',
      'Nepal',
      'Malaysia',
      'Taiwan',
      'Singapore',
      'Bangladesh',
    ];

    expectedCountries.forEach((country) => {
      expect(text).toContain(country);
    });
    expect(text).toContain('2,155 total');
    expect(text).toContain('517 students');
    expect(text).toContain('511 total');
    expect(text).toContain('42 students');

    const rows = container.querySelectorAll('[data-testid="vibe-demographic-row"]');
    const bars = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="vibe-demographic-bar"]'));

    expect(rows).toHaveLength(12);
    expect(bars).toHaveLength(12);
    expect(new Set(bars.map((bar) => bar.style.width)).size).toBeGreaterThan(1);
  });
});
