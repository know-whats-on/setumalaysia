// @vitest-environment jsdom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoodieShareActions } from "./hoodie-share-actions";

vi.mock("../../lib/platform", () => ({
  isNativeShell: () => true,
}));

vi.mock("../../lib/instagram-story-share", () => ({
  shareHoodieDescriptorGeneric: vi.fn(),
  shareHoodieDescriptorToInstagram: vi.fn(),
}));

vi.mock("../../lib/app-config", () => ({
  APP_CONFIG: {
    displayName: "Hoodie",
  },
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

const descriptor = {
  privacyClass: "public",
  storyCardData: {},
} as any;

async function renderShareActions(
  props?: Partial<ComponentProps<typeof HoodieShareActions>>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<HoodieShareActions descriptor={descriptor} {...props} />);
    await Promise.resolve();
  });

  return container;
}

describe("HoodieShareActions", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = "";
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

  it("preserves the default share labels", async () => {
    const container = await renderShareActions();

    expect(container.textContent).toContain("Share to Instagram");
    expect(container.textContent).toContain("Share");
  });

  it("renders invite-mode copy with an icon-only generic share button", async () => {
    const container = await renderShareActions({ variant: "invite" });

    expect(container.textContent).toContain("Share as Invite");

    const genericButton = container.querySelector('button[aria-label="Share"]');
    expect(genericButton).toBeTruthy();
    expect(genericButton?.querySelector(".sr-only")?.textContent).toBe("Share");

    const visibleTextNodes = Array.from(genericButton?.childNodes || []).filter(
      (node) =>
        node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
    );
    expect(visibleTextNodes).toHaveLength(0);
  });

  it("can hide the generic share button when an embedded invite surface only needs banner export", async () => {
    const container = await renderShareActions({
      variant: "invite",
      showGenericAction: false,
    });

    expect(container.textContent).toContain("Share as Invite");
    expect(container.querySelector('button[aria-label="Share"]')).toBeNull();
  });

  it("renders the instagram chooser dialog above the plan sheet stacking layer", async () => {
    const container = await renderShareActions({ variant: "invite" });
    const inviteButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Share as Invite"),
    );

    await act(async () => {
      inviteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const dialogOverlay = document.querySelector(
      '[data-slot="dialog-overlay"]',
    );
    const dialogContent = document.querySelector(
      '[data-slot="dialog-content"]',
    );

    expect(dialogOverlay?.className).toContain("z-[2200]");
    expect(dialogContent?.className).toContain("z-[2201]");
    expect(document.body.textContent).toContain("Choose Instagram Size");
  });
});
