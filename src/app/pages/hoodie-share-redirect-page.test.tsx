// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoodieShareRedirectPage } from "./hoodie-share-redirect-page";

const { mockAppConfig, hoodieShareMocks, getStoreFallbackUrlMock } = vi.hoisted(
  () => ({
    mockAppConfig: {
      displayName: "SETU India AU",
      marketingUrl: "https://ghar.knowwhatson.com",
      webIcon: "/setu-icon.png",
      shareBaseUrl: "https://ghar.knowwhatson.com",
    },
    hoodieShareMocks: {
      buildFallbackDescriptorForMatch: vi.fn(),
      buildHoodieShareDeepLinkForMatch: vi.fn(),
      matchHoodieSharePath: vi.fn(),
      resolveHoodieShareMatchAppRoute: vi.fn(),
    },
    getStoreFallbackUrlMock: vi.fn(),
  }),
);

vi.mock("../lib/app-config", () => ({
  APP_CONFIG: mockAppConfig,
}));

vi.mock("../lib/hoodie-share", () => hoodieShareMocks);

vi.mock("../lib/public-plan-links", () => ({
  getStoreFallbackUrl: getStoreFallbackUrlMock,
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderPage(path = "/share/event/cityofsydney/laneway-festival") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/share/event/:source/:slug"
            element={<HoodieShareRedirectPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  await flushEffects();
  return container;
}

function getButtonByText(container: HTMLElement, text: string) {
  const normalizedText = text.trim().toLowerCase();
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => {
      const candidateText =
        candidate.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return candidateText.includes(normalizedText);
    },
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found for text: ${text}`);
  }
  return button;
}

describe("HoodieShareRedirectPage", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
    window.location.hash = "";
    hoodieShareMocks.matchHoodieSharePath.mockReset();
    hoodieShareMocks.buildFallbackDescriptorForMatch.mockReset();
    hoodieShareMocks.buildHoodieShareDeepLinkForMatch.mockReset();
    hoodieShareMocks.resolveHoodieShareMatchAppRoute.mockReset();
    getStoreFallbackUrlMock.mockReset();

    getStoreFallbackUrlMock.mockReturnValue("https://ghar.knowwhatson.com");
    hoodieShareMocks.matchHoodieSharePath.mockReturnValue({
      kind: "event",
      source: "cityofsydney",
      slug: "laneway-festival",
    });
    hoodieShareMocks.buildFallbackDescriptorForMatch.mockReturnValue({
      privacyClass: "public_safe",
      storyCardData: {
        title: "Laneway Festival",
      },
    });
    hoodieShareMocks.buildHoodieShareDeepLinkForMatch.mockReturnValue(
      "#setu-open",
    );
    hoodieShareMocks.resolveHoodieShareMatchAppRoute.mockReturnValue(
      "/events/cityofsydney/laneway-festival",
    );
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

  it("renders SETU-specific share copy and uses the active app deep link", async () => {
    const container = await renderPage();

    expect(container.textContent).toContain("Shared from SETU India AU");
    expect(container.textContent).toContain("Opening SETU India AU");
    expect(getButtonByText(container, "Open in SETU India AU")).toBeTruthy();
    expect(window.location.hash).toBe("#setu-open");
  });

  it("renders the invalid-link fallback with SETU-specific copy", async () => {
    hoodieShareMocks.matchHoodieSharePath.mockReturnValue(null);
    const container = await renderPage();

    expect(container.textContent).toContain(
      "This share link is not valid anymore. You can still open SETU India AU or get the app.",
    );
    expect(getButtonByText(container, "Open SETU India AU")).toBeTruthy();
  });
});
