// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CityGuidesHub } from "./city-guides-hub";

const { fetchCityGuidesMock } = vi.hoisted(() => ({
  fetchCityGuidesMock: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  fetchCityGuides: fetchCityGuidesMock,
  fetchProfile: vi.fn(),
  fetchRentalHistory: vi.fn(),
}));

vi.mock("../lib/app-config", () => ({
  APP_CONFIG: {
    shareBaseUrl: "https://share.example.com",
    variant: "burb_mate",
  },
}));

vi.mock("../lib/app-variant", () => ({
  APP_VARIANT: "burb_mate",
}));

vi.mock("./share/hoodie-share-actions", () => ({
  HoodieShareActions: ({ variant }: { variant?: string }) => (
    <div
      data-testid="guide-share-actions"
      data-variant={variant || "default"}
    />
  ),
}));

vi.mock("./figma/ImageWithFallback", () => ({
  ImageWithFallback: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];
let elementScrollToMock: ReturnType<typeof vi.fn>;
let windowScrollToMock: ReturnType<typeof vi.fn>;

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockCarouselObservers() {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
}

function createGuide(slug: string, title: string, placeCount = 1) {
  const places = Array.from({ length: placeCount }, (_, index) => {
    const placeSlug =
      index === 0
        ? "hyde-park-barracks"
        : index === 1
          ? "susannah-place"
          : `place-${index + 1}`;
    const placeName =
      index === 0
        ? "Hyde Park Barracks"
        : index === 1
          ? "Susannah Place Museum"
          : `Place ${index + 1}`;
    return {
      id: placeSlug,
      name: placeName,
      description: `${placeName} notes.`,
      image_url: `https://images.example.com/${placeSlug}.jpg`,
      lat: -33.869 - index / 100,
      lng: 151.211 + index / 100,
    };
  });

  return {
    id: slug,
    slug,
    title,
    intro: `A guide to ${title}.`,
    city: "Sydney",
    city_slug: "sydney",
    state: "NSW",
    cover_image_url: `https://images.example.com/${slug}.jpg`,
    places,
  };
}

function getScrollContainer(container: HTMLElement) {
  const scroller = container.querySelector<HTMLElement>(
    '[data-testid="city-guides-scroll-container"]',
  );
  expect(scroller).toBeTruthy();
  return scroller as HTMLElement;
}

function setRect(element: HTMLElement, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = vi.fn(
    () =>
      ({
        x: rect.x ?? rect.left ?? 0,
        y: rect.y ?? rect.top ?? 0,
        top: rect.top ?? 0,
        left: rect.left ?? 0,
        right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
        bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderHub(options?: {
  cityParam?: string;
  initialGuideParam?: string;
  onGuideChange?: (guideSlug: string | null) => void;
  guidesView?: "carousel" | "list";
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });
  const initialGuideParam = options?.initialGuideParam ?? "historic-sydney";

  function Harness() {
    const [currentGuideParam, setCurrentGuideParam] =
      useState(initialGuideParam);

    return (
      <MemoryRouter>
        <CityGuidesHub
          cityParam={options?.cityParam ?? "sydney"}
          guideParam={currentGuideParam}
          guidesView={options?.guidesView || "list"}
          onCityChange={() => {}}
          onGuideChange={(nextGuide) => {
            options?.onGuideChange?.(nextGuide);
            setCurrentGuideParam(nextGuide || "");
          }}
          onGuidesViewChange={() => {}}
        />
      </MemoryRouter>
    );
  }

  await act(async () => {
    root.render(<Harness />);
    await Promise.resolve();
  });

  await flushEffects();
  await flushEffects();
  return container;
}

function expectTextOrder(container: HTMLElement, labels: string[]) {
  let previousIndex = -1;
  for (const label of labels) {
    const nextIndex = container.textContent?.indexOf(label) ?? -1;
    expect(nextIndex).toBeGreaterThan(previousIndex);
    previousIndex = nextIndex;
  }
}

describe("CityGuidesHub invite share actions", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    mockReducedMotion(false);
    mockCarouselObservers();
    elementScrollToMock = vi.fn(function (
      this: HTMLElement,
      options?: ScrollToOptions,
    ) {
      if (options && typeof options === "object") {
        if (typeof options.top === "number") this.scrollTop = options.top;
        if (typeof options.left === "number") this.scrollLeft = options.left;
      }
    });
    windowScrollToMock = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollTo", {
      configurable: true,
      writable: true,
      value: elementScrollToMock,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: windowScrollToMock,
    });
    fetchCityGuidesMock.mockReset();
    fetchCityGuidesMock.mockResolvedValue([
      createGuide("historic-sydney", "Historic Sydney", 2),
      createGuide("modern-sydney", "Modern Sydney", 1),
    ]);
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

    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("uses the invite share variant on the guide detail surface", async () => {
    const container = await renderHub();

    const shareActions = container.querySelector(
      '[data-testid="guide-share-actions"]',
    );
    expect(shareActions).toBeTruthy();
    expect(shareActions?.getAttribute("data-variant")).toBe("invite");
  });

  it("uses one custom city select chevron with the native select arrow suppressed", async () => {
    const container = await renderHub({
      cityParam: "perth",
      initialGuideParam: "",
      guidesView: "carousel",
    });

    const citySelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Choose city"]',
    );
    expect(citySelect).toBeTruthy();
    expect(citySelect?.className).toContain("appearance-none");
    expect(
      container.querySelectorAll('[data-testid="city-guides-city-select-chevron"]'),
    ).toHaveLength(1);
  });

  it("merges static flagship event guides when the API has no city guides", async () => {
    fetchCityGuidesMock.mockResolvedValueOnce([]);

    const container = await renderHub({ initialGuideParam: "" });

    expect(container.textContent).not.toContain("Vivid Sydney 2026");
    expect(container.textContent).toContain("Sydney New Year's Eve 2026");
    expect(container.textContent).toContain("Countdown");
  });

  it("orders non-pinned countdown flagship guides after API guides in the carousel", async () => {
    const container = await renderHub({
      initialGuideParam: "",
      guidesView: "carousel",
    });

    expectTextOrder(container, [
      "Historic Sydney",
      "Modern Sydney",
      "Sydney New Year's Eve 2026",
    ]);
  });

  it("pins King's Birthday guides first and moves Pizza Hut guides last", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00+10:00"));
    fetchCityGuidesMock.mockResolvedValueOnce([
      createGuide(
        "only-all-you-can-eat-pizza-huts-in-australia-sydney",
        "The Only All-You-Can-Eat Pizza Huts in Australia",
        1,
      ),
      createGuide("historic-sydney", "Historic Sydney", 2),
    ]);

    const container = await renderHub({
      initialGuideParam: "",
      guidesView: "carousel",
    });

    expectTextOrder(container, [
      "King's Birthday Weekend: Government House Sydney",
      "Historic Sydney",
      "Sydney New Year's Eve 2026",
      "The Only All-You-Can-Eat Pizza Huts in Australia",
    ]);
  });

  it("keeps live flagship guides ahead of countdown flagship guides", async () => {
    fetchCityGuidesMock.mockResolvedValueOnce([
      createGuide("vivid-sydney-2026-light-walk", "Vivid Sydney 2026", 2),
      createGuide("historic-sydney", "Historic Sydney", 2),
    ]);

    const container = await renderHub({ initialGuideParam: "" });

    expectTextOrder(container, [
      "Vivid Sydney 2026",
      "Historic Sydney",
      "Sydney New Year's Eve 2026",
    ]);
  });

  it("orders pinned and Pizza Hut guides correctly in the related guides strip", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00+10:00"));
    fetchCityGuidesMock.mockResolvedValueOnce([
      createGuide(
        "only-all-you-can-eat-pizza-huts-in-australia-sydney",
        "The Only All-You-Can-Eat Pizza Huts in Australia",
        1,
      ),
      createGuide("historic-sydney", "Historic Sydney", 2),
      createGuide("modern-sydney", "Modern Sydney", 1),
    ]);

    const container = await renderHub();

    expectTextOrder(container, [
      "King's Birthday Weekend: Government House Sydney",
      "Modern Sydney",
      "Sydney New Year's Eve 2026",
      "The Only All-You-Can-Eat Pizza Huts in Australia",
    ]);
  });

  it("renders the countdown shell for a future static flagship event", async () => {
    fetchCityGuidesMock.mockResolvedValueOnce([]);

    const container = await renderHub({
      initialGuideParam: "sydney-nye-2026",
    });

    expect(container.textContent).toContain("Sydney New Year's Eve 2026");
    expect(container.textContent).toContain("Starts in");
    expect(container.textContent).toContain("Official event source");
    expect(container.textContent).toContain("Event info and countdown");

    const heroImage = container.querySelector(
      `img[alt="Sydney New Year's Eve 2026"]`,
    );
    const countdownImage = container.querySelector(
      'img[alt="Event info and countdown"]',
    );
    expect(heroImage?.getAttribute("src")).toMatch(/^https:\/\//);
    expect(countdownImage?.getAttribute("src")).toMatch(/^https:\/\//);
    expect(heroImage?.getAttribute("src")).not.toContain("data:image");
  });

  it("renders a live King's Birthday guide in the selected city", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T12:00:00+10:00"));
    fetchCityGuidesMock.mockResolvedValueOnce([]);

    const container = await renderHub({
      cityParam: "melbourne",
      initialGuideParam: "kings-birthday-melbourne-2026",
      guidesView: "carousel",
    });

    const citySelect = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Choose city"]',
    );
    expect(citySelect?.value).toBe("melbourne");
    expect(container.textContent).toContain(
      "King's Birthday Weekend: Free Melbourne",
    );
    expect(container.textContent).toContain("Live now");
    expect(container.textContent).toContain("3 live sections");
    expect(container.textContent).toContain(
      "Taste of Portugal at Queen Victoria Market",
    );

    const showOnMapButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Show on Map"),
    );
    expect(showOnMapButton).toBeTruthy();
    expect(showOnMapButton?.hasAttribute("disabled")).toBe(false);
  });

  it("renders a King's Birthday countdown before one-day activities open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00+10:00"));
    fetchCityGuidesMock.mockResolvedValueOnce([]);

    const container = await renderHub({
      initialGuideParam: "kings-birthday-sydney-2026",
    });

    expect(container.textContent).toContain(
      "King's Birthday Weekend: Government House Sydney",
    );
    expect(container.textContent).toContain("Starts tomorrow");
    expect(container.textContent).toContain("Event info and countdown");
    expect(container.textContent).not.toContain(
      "State Rooms and vice-regal table",
    );
  });

  it("applies animated flagship treatment only when motion is allowed", async () => {
    fetchCityGuidesMock.mockResolvedValueOnce([
      createGuide("vivid-sydney-2026-light-walk", "Vivid Sydney 2026", 2),
    ]);
    const animatedContainer = await renderHub({
      initialGuideParam: "vivid-sydney-2026-light-walk",
    });
    expect(
      animatedContainer.querySelector(".hoodie-vivid-screen-lights"),
    ).toBeTruthy();

    mockReducedMotion(true);
    fetchCityGuidesMock.mockResolvedValueOnce([
      createGuide("vivid-sydney-2026-light-walk", "Vivid Sydney 2026", 2),
    ]);
    const reducedContainer = await renderHub({
      initialGuideParam: "vivid-sydney-2026-light-walk",
    });
    expect(
      reducedContainer.querySelector(".hoodie-vivid-screen-lights"),
    ).toBeNull();
  });

  it("resets the guide scroller when opening a related guide", async () => {
    const onGuideChange = vi.fn();
    const container = await renderHub({ onGuideChange });
    const scrollContainer = getScrollContainer(container);
    scrollContainer.scrollTop = 840;
    elementScrollToMock.mockClear();
    windowScrollToMock.mockClear();

    const relatedGuideButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Modern Sydney"));
    expect(relatedGuideButton).toBeTruthy();

    await act(async () => {
      relatedGuideButton?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });
    await flushEffects();

    expect(onGuideChange).toHaveBeenCalledWith("modern-sydney");
    expect(container.textContent).toContain("Modern Sydney");
    expect(
      elementScrollToMock.mock.calls.some(
        ([options]) => (options as ScrollToOptions | undefined)?.top === 0,
      ),
    ).toBe(true);
    expect(windowScrollToMock).toHaveBeenCalled();
  });

  it("scrolls guide section pills inside the guide scroller", async () => {
    const container = await renderHub();
    const scrollContainer = getScrollContainer(container);
    const target = document.getElementById(
      "guide-place-historic-sydney-susannah-place",
    );
    expect(target).toBeTruthy();
    scrollContainer.scrollTop = 48;
    setRect(scrollContainer, { top: 200, height: 600, bottom: 800 });
    setRect(target as HTMLElement, { top: 500, height: 200, bottom: 700 });
    elementScrollToMock.mockClear();
    windowScrollToMock.mockClear();

    const sectionAnchor = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.includes("Place 2: Susannah Place Museum"),
    );
    expect(sectionAnchor).toBeTruthy();

    await act(async () => {
      sectionAnchor?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(elementScrollToMock).toHaveBeenCalledWith({
      top: 332,
      behavior: "smooth",
    });
    expect(window.location.hash).toBe(
      "#guide-place-historic-sydney-susannah-place",
    );
    expect(windowScrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  });

  it("uses auto guide section scrolling for reduced-motion users", async () => {
    mockReducedMotion(true);
    const container = await renderHub();
    const scrollContainer = getScrollContainer(container);
    const target = document.getElementById(
      "guide-place-historic-sydney-susannah-place",
    );
    expect(target).toBeTruthy();
    scrollContainer.scrollTop = 20;
    setRect(scrollContainer, { top: 120, height: 620, bottom: 740 });
    setRect(target as HTMLElement, { top: 420, height: 200, bottom: 620 });
    elementScrollToMock.mockClear();

    const sectionAnchor = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.includes("Place 2: Susannah Place Museum"),
    );
    expect(sectionAnchor).toBeTruthy();

    await act(async () => {
      sectionAnchor?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(elementScrollToMock).toHaveBeenCalledWith({
      top: 304,
      behavior: "auto",
    });
  });
});
