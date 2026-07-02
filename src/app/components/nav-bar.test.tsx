// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavBar } from './nav-bar';

const appConfigState = vi.hoisted(() => ({
  appVariant: 'burb_mate',
  config: {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Resources',
    showSetuFeatures: false,
    useSharedResourcesShell: true,
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/app-variant', () => ({
  get APP_VARIANT() {
    return appConfigState.appVariant;
  },
}));

vi.mock('../assets/lamp-hoodienie.svg', () => ({
  default: '/lamp-hoodienie.svg',
}));

vi.mock('lucide-react', () => {
  const createIcon = (name: string) => (props: Record<string, unknown>) => (
    <svg data-testid={`icon-${name}`} {...props} />
  );

  return {
    Bell: createIcon('bell'),
    BookOpen: createIcon('book-open'),
    Bot: createIcon('bot'),
    BriefcaseBusiness: createIcon('briefcase-business'),
    Building2: createIcon('building2'),
    CalendarDays: createIcon('calendar-days'),
    Calculator: createIcon('calculator'),
    CheckSquare: createIcon('check-square'),
    ClipboardList: createIcon('clipboard-list'),
    Compass: createIcon('compass'),
    FileText: createIcon('file-text'),
    Fuel: createIcon('fuel'),
    Home: createIcon('home'),
    Landmark: createIcon('landmark'),
    Map: createIcon('map'),
    ReceiptText: createIcon('receipt-text'),
    Scale: createIcon('scale'),
    Search: createIcon('search'),
    ShieldAlert: createIcon('shield-alert'),
    ShoppingBasket: createIcon('shopping-basket'),
    Sparkles: createIcon('sparkles'),
    Train: createIcon('train'),
    User: createIcon('user'),
  };
});

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

function getButtonByLabel(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}

function getButtonContainingLabel(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.includes(label),
  );
}

function renderNavBar(
  onNavigate = vi.fn(),
  props: Partial<Parameters<typeof NavBar>[0]> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(<NavBar activeView="dashboard" onNavigate={onNavigate} {...props} />);
  });

  return { container, onNavigate };
}

function clickButton(container: HTMLElement, label: string) {
  act(() => {
    getButtonByLabel(container, label)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function clickButtonContaining(container: HTMLElement, label: string) {
  act(() => {
    getButtonContainingLabel(container, label)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  appConfigState.appVariant = 'burb_mate';
  Object.assign(appConfigState.config, {
    variant: 'burb_mate',
    experienceMode: 'hoodie',
    assistantName: 'Hoodienie',
    resourcesLabel: 'Resources',
    showSetuFeatures: false,
    useSharedResourcesShell: true,
  });
});

afterEach(() => {
  for (const mounted of mountedComponents.splice(0)) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
  }
  vi.clearAllMocks();
});

describe('NavBar', () => {
  it('renders the refreshed Hoodie nav labels and icons', () => {
    const { container } = renderNavBar();

    expect(getButtonByLabel(container, "'Hood")).toBeTruthy();
    expect(getButtonByLabel(container, 'Vibe')).toBeTruthy();
    expect(getButtonByLabel(container, 'Hoodienie')).toBeTruthy();
    expect(getButtonByLabel(container, 'Resources')).toBeTruthy();
    expect(getButtonByLabel(container, 'Household')).toBeTruthy();
    expect(getButtonByLabel(container, 'Profile')).toBeFalsy();

    expect(getButtonByLabel(container, "'Hood")?.querySelector('[data-testid="icon-search"]')).toBeTruthy();
    expect(getButtonByLabel(container, 'Household')?.querySelector('[data-testid="icon-building2"]')).toBeTruthy();
  });

  it('keeps existing dashboard and profile navigation keys', () => {
    const onNavigate = vi.fn();
    const { container } = renderNavBar(onNavigate);

    act(() => {
      getButtonByLabel(container, "'Hood")?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      getButtonByLabel(container, 'Household')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'dashboard');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'profile');
  });

  it('keeps Hoodie bottom nav buttons direct on the assistant landing route', () => {
    const onNavigate = vi.fn();
    const { container } = renderNavBar(onNavigate, {
      activeView: 'arrival',
    });

    expect(getButtonByLabel(container, "'Hood")).toBeTruthy();
    expect(getButtonByLabel(container, 'Vibe')).toBeTruthy();
    expect(getButtonByLabel(container, 'Hoodienie')).toBeTruthy();
    expect(getButtonByLabel(container, 'Resources')).toBeTruthy();
    expect(getButtonByLabel(container, 'Household')).toBeTruthy();
    expect(getButtonByLabel(document.body, 'Fuel')).toBeFalsy();

    clickButton(container, "'Hood");
    clickButton(container, 'Vibe');
    clickButton(container, 'Resources');
    clickButton(container, 'Household');

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'dashboard');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'vibe');
    expect(onNavigate).toHaveBeenNthCalledWith(3, 'legal');
    expect(onNavigate).toHaveBeenNthCalledWith(4, 'profile');
  });

  it('keeps the center assistant nav button direct', () => {
    const onNavigate = vi.fn();
    const { container } = renderNavBar(onNavigate, {
      activeView: 'arrival',
    });

    clickButton(container, 'Hoodienie');

    expect(onNavigate).toHaveBeenCalledWith('arrival');
  });

  it('keeps SETU/Gendu bottom nav direct with shared resource routing', () => {
    appConfigState.appVariant = 'ghar';
    Object.assign(appConfigState.config, {
      variant: 'ghar',
      assistantName: 'Gendu',
      showSetuFeatures: true,
      useSharedResourcesShell: true,
    });
    const onNavigate = vi.fn();
    const { container } = renderNavBar(onNavigate, {
      activeView: 'arrival',
    });

    expect(getButtonContainingLabel(container, 'Home')).toBeTruthy();
    expect(getButtonContainingLabel(container, 'Ask')).toBeTruthy();
    expect(getButtonContainingLabel(container, 'Tasks')).toBeTruthy();

    clickButtonContaining(container, 'Home');
    clickButtonContaining(container, 'Ask');
    clickButtonContaining(container, 'Tasks');

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'dashboard');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'arrival');
    expect(onNavigate).toHaveBeenNthCalledWith(3, 'resources');
  });

  it('renders Wolli nav labels, image icons, and resources navigation', () => {
    appConfigState.appVariant = 'wheres_wolli';
    Object.assign(appConfigState.config, {
      variant: 'wheres_wolli',
      assistantName: 'Wolli',
      resourcesLabel: 'Resources',
      showSetuFeatures: true,
      useSharedResourcesShell: true,
    });
    const onNavigate = vi.fn();
    const { container } = renderNavBar(onNavigate);

    expect(getButtonByLabel(container, 'Home')).toBeTruthy();
    expect(getButtonByLabel(container, 'Explore')).toBeTruthy();
    expect(getButtonByLabel(container, 'Ask')).toBeTruthy();
    expect(getButtonByLabel(container, 'Resources')).toBeTruthy();
    expect(getButtonByLabel(container, 'Me')).toBeTruthy();
    expect(container.querySelectorAll('img[aria-hidden="true"]')).toHaveLength(5);

    clickButton(container, 'Resources');
    clickButton(container, 'Ask');

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'resources');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'arrival');
  });
});
