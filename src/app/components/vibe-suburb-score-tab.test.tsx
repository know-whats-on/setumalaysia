// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VibeSuburbScoreTab } from "./vibe-suburb-score-tab";

const {
  appConfigMock,
  fetchSuburbShareEnrichmentMock,
  lookupCrimeForSuburbMock,
  resolveHoodieShareBackgroundImageMock,
  testSuburb,
} = vi.hoisted(() => ({
  appConfigMock: {
    variant: "burb_mate",
    shareBaseUrl: "https://suburb.knowwhatson.com",
  },
  fetchSuburbShareEnrichmentMock: vi.fn(),
  lookupCrimeForSuburbMock: vi.fn(),
  resolveHoodieShareBackgroundImageMock: vi.fn(),
  testSuburb: {
    suburb: "Campbelltown",
    state: "NSW",
    totalStudents: 786,
    badge: "Cultural Infrastructure",
    score: "Medium",
  },
}));

vi.mock("../lib/api", () => ({
  fetchSuburbShareEnrichment: fetchSuburbShareEnrichmentMock,
}));

vi.mock("../lib/hoodie-share-media", () => ({
  resolveHoodieShareBackgroundImage: resolveHoodieShareBackgroundImageMock,
}));

vi.mock("../lib/suburb-crime-map", () => ({
  lookupCrimeForSuburb: lookupCrimeForSuburbMock,
}));

vi.mock("../lib/app-config", () => ({
  APP_CONFIG: appConfigMock,
}));

vi.mock("../lib/demographics-data", () => ({
  suburbDemographics: [testSuburb],
}));

vi.mock("../lib/au-universities", () => ({
  universitySuburbs: {},
}));

vi.mock("../hooks/useSuburbFilter", () => ({
  useSuburbFilter: () => ({
    searchQuery: "",
    setSearchQuery: () => {},
    selectedUni: "All",
    setSelectedUni: () => {},
    selectedBadge: "All",
    setSelectedBadge: () => {},
    selectedScore: "All",
    setSelectedScore: () => {},
    selectedState: "All",
    setSelectedState: () => {},
    availableStates: ["NSW"],
    filteredSuburbs: [testSuburb],
  }),
}));

vi.mock("./vibe-panel", () => ({
  VibePanel: ({ suburbName }: { suburbName: string }) => (
    <div data-testid="vibe-panel">{suburbName}</div>
  ),
}));

vi.mock("./share/hoodie-share-actions", () => ({
  HoodieShareActions: ({
    descriptor,
    disabled,
    disabledReason,
    instagramDisabled,
    instagramDisabledReason,
    variant,
  }: {
    descriptor: any;
    disabled?: boolean;
    disabledReason?: string;
    instagramDisabled?: boolean;
    instagramDisabledReason?: string;
    variant?: string;
  }) => (
    <div
      data-testid="share-actions"
      data-disabled={String(Boolean(disabled))}
      data-instagram-disabled={String(Boolean(instagramDisabled))}
      data-variant={variant || "default"}
      data-render-style={descriptor.renderStyle}
      data-summary={descriptor.storyCardData.summaryText || ""}
      data-background={descriptor.backgroundImageUrl || ""}
      data-first-stat={descriptor.storyCardData.statTiles?.[0]?.value || ""}
    >
      {disabledReason || instagramDisabledReason || ""}
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
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderTab({
  selectedSuburbParam = "campbelltown",
  embedded = false,
}: { selectedSuburbParam?: string; embedded?: boolean } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <VibeSuburbScoreTab
        selectedSuburbParam={selectedSuburbParam}
        onSuburbChange={() => {}}
        embedded={embedded}
      />,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

function getShareActions(container: HTMLElement) {
  const element = container.querySelector('[data-testid="share-actions"]');
  if (!(element instanceof HTMLElement)) {
    throw new Error("Share actions did not render.");
  }
  return element;
}

describe("VibeSuburbScoreTab suburb share enrichment", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    appConfigMock.variant = "burb_mate";
    appConfigMock.shareBaseUrl = "https://suburb.knowwhatson.com";
    fetchSuburbShareEnrichmentMock.mockReset();
    lookupCrimeForSuburbMock.mockReset();
    resolveHoodieShareBackgroundImageMock.mockReset();

    lookupCrimeForSuburbMock.mockReturnValue({
      status: "found",
      data: {
        scores: {
          overall_caution_score_0_100: 67,
          personal_safety_score_0_100: 59,
          property_crime_score_0_100: 70,
          overall_caution_band: "Moderate",
        },
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

    document.body.innerHTML = "";
  });

  it("keeps generic share available, unlocks Instagram only after image prep, and reuses the prepared asset from cache", async () => {
    const enrichment = createDeferred<{
      summary: string;
      hostedBackgroundImageUrl?: string;
      sourcePageUrl?: string;
      sourceLabel?: string;
    }>();
    const preparedBackground = createDeferred<{
      resolvedUrl?: string;
      revoke: () => void;
    }>();
    fetchSuburbShareEnrichmentMock.mockReturnValueOnce(enrichment.promise);
    resolveHoodieShareBackgroundImageMock.mockReturnValueOnce(
      preparedBackground.promise,
    );

    const container = await renderTab();
    const shareActions = getShareActions(container);

    expect(fetchSuburbShareEnrichmentMock).toHaveBeenCalledWith({
      suburb: "Campbelltown",
      state: "NSW",
      totalStudents: 786,
      vibeBadge: "Cultural Infrastructure",
      crimeScore: 67,
      personalSafetyScore: 59,
      propertyCrimeScore: 70,
      crimeBand: "Moderate",
    });
    expect(shareActions.dataset.disabled).toBe("false");
    expect(shareActions.dataset.instagramDisabled).toBe("true");
    expect(shareActions.dataset.variant).toBe("default");
    expect(shareActions.textContent).toContain("Preparing Instagram image...");
    expect(shareActions.dataset.firstStat).toBe("67");

    await act(async () => {
      enrichment.resolve({
        summary:
          "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
        hostedBackgroundImageUrl:
          "https://images.example.com/campbelltown-instagram-ready.jpg",
        sourcePageUrl:
          "https://en.wikipedia.org/wiki/Campbelltown%2C_New_South_Wales",
        sourceLabel: "Wikipedia",
      });
      await enrichment.promise;
    });
    await flushEffects();

    const preparingShareActions = getShareActions(container);
    expect(resolveHoodieShareBackgroundImageMock).toHaveBeenCalledWith(
      "https://images.example.com/campbelltown-instagram-ready.jpg",
    );
    expect(preparingShareActions.dataset.disabled).toBe("false");
    expect(preparingShareActions.dataset.instagramDisabled).toBe("true");
    expect(preparingShareActions.dataset.background).toBe(
      "https://images.example.com/campbelltown-instagram-ready.jpg",
    );

    await act(async () => {
      preparedBackground.resolve({
        resolvedUrl: "data:image/jpeg;base64,campbelltown-ready",
        revoke: vi.fn(),
      });
      await preparedBackground.promise;
    });
    await flushEffects();

    const readyShareActions = getShareActions(container);
    expect(readyShareActions.dataset.disabled).toBe("false");
    expect(readyShareActions.dataset.instagramDisabled).toBe("false");
    expect(readyShareActions.dataset.variant).toBe("default");
    expect(readyShareActions.dataset.renderStyle).toBe("photo");
    expect(readyShareActions.dataset.background).toBe(
      "data:image/jpeg;base64,campbelltown-ready",
    );
    expect(readyShareActions.dataset.summary).toBe(
      "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
    );

    const secondContainer = await renderTab();
    const cachedShareActions = getShareActions(secondContainer);
    expect(fetchSuburbShareEnrichmentMock).toHaveBeenCalledTimes(1);
    expect(resolveHoodieShareBackgroundImageMock).toHaveBeenCalledTimes(1);
    expect(cachedShareActions.dataset.instagramDisabled).toBe("false");
    expect(cachedShareActions.dataset.background).toBe(
      "data:image/jpeg;base64,campbelltown-ready",
    );
  });

  it("uses bottom-nav-aware scrolling for Malaysia suburb stats list and detail views", async () => {
    appConfigMock.variant = "jom_settle";
    fetchSuburbShareEnrichmentMock.mockResolvedValue({
      summary: "Campbelltown has student-friendly daily rhythm.",
    });
    resolveHoodieShareBackgroundImageMock.mockResolvedValue({
      resolvedUrl: "",
      revoke: vi.fn(),
    });

    const listContainer = await renderTab({ selectedSuburbParam: "" });
    const listScroll = listContainer.querySelector('[data-testid="vibe-suburb-score-scroll"]');
    expect(listScroll?.className).toContain("pb-[calc(var(--app-bottom-nav-clearance)+2rem)]");
    expect((listScroll as HTMLElement | null)?.getAttribute("style")).toContain("app-bottom-nav-clearance");

    const detailContainer = await renderTab();
    const detailScroll = detailContainer.querySelector('[data-testid="vibe-suburb-detail-scroll"]');
    expect(detailScroll?.className).toContain("pb-[calc(var(--app-bottom-nav-clearance)+2rem)]");
    expect((detailScroll as HTMLElement | null)?.getAttribute("style")).toContain("app-bottom-nav-clearance");
  });

  it("leaves bottom-nav clearance to the parent scroll shell when Malaysia suburb stats are embedded", async () => {
    appConfigMock.variant = "jom_settle";
    fetchSuburbShareEnrichmentMock.mockResolvedValue({
      summary: "Campbelltown has student-friendly daily rhythm.",
    });
    resolveHoodieShareBackgroundImageMock.mockResolvedValue({
      resolvedUrl: "",
      revoke: vi.fn(),
    });

    const listContainer = await renderTab({ selectedSuburbParam: "", embedded: true });
    const listScroll = listContainer.querySelector('[data-testid="vibe-suburb-score-scroll"]');
    expect(listScroll?.className).toContain("pb-3");
    expect(listScroll?.className).not.toContain("app-bottom-nav-clearance");
    expect((listScroll as HTMLElement | null)?.getAttribute("style") || "").not.toContain("app-bottom-nav-clearance");

    const detailContainer = await renderTab({ embedded: true });
    const detailScroll = detailContainer.querySelector('[data-testid="vibe-suburb-detail-scroll"]');
    expect(detailScroll?.className).toBe("bg-white");
    expect((detailScroll as HTMLElement | null)?.getAttribute("style") || "").not.toContain("app-bottom-nav-clearance");
  });

  it("keeps only the back header fixed while the share actions and stats panel scroll together", async () => {
    fetchSuburbShareEnrichmentMock.mockResolvedValue({
      summary:
        "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
    });

    const container = await renderTab();
    const header = container.querySelector('[data-testid="vibe-suburb-detail-header"]');
    const scrollRegion = container.querySelector('[data-testid="vibe-suburb-detail-scroll"]');
    const shareActions = getShareActions(container);
    const vibePanel = container.querySelector('[data-testid="vibe-panel"]');

    expect(header).toBeInstanceOf(HTMLElement);
    expect(scrollRegion).toBeInstanceOf(HTMLElement);
    expect(shareActions).toBeInstanceOf(HTMLElement);
    expect(vibePanel).toBeInstanceOf(HTMLElement);
    expect(scrollRegion?.contains(header)).toBe(false);
    expect(scrollRegion?.contains(shareActions)).toBe(true);
    expect(scrollRegion?.contains(vibePanel)).toBe(true);
    expect((scrollRegion as HTMLElement).className).toContain("overflow-y-auto");
  });
});
