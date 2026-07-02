// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInstagramShareFallbackPayload,
  buildInstagramSharePayload,
  isInstagramStoryShareConfigured,
  isShareCanceledError,
  shareHoodieDescriptorToInstagram,
} from "./instagram-story-share";

const {
  clipboardWriteTextMock,
  mockAppConfig,
  nativeShareMock,
  renderHoodieShareCardAssetMock,
  shareToInstagramStoryMock,
} = vi.hoisted(() => ({
  clipboardWriteTextMock: vi.fn(),
  mockAppConfig: {
    displayName: "SETU India AU",
    instagramStoriesAppId: undefined as string | undefined,
  },
  nativeShareMock: vi.fn(),
  renderHoodieShareCardAssetMock: vi.fn(),
  shareToInstagramStoryMock: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({
    shareToInstagramStory: shareToInstagramStoryMock,
  }),
}));

vi.mock("@capacitor/share", () => ({
  Share: {
    share: nativeShareMock,
  },
}));

vi.mock("./app-config", () => ({
  APP_CONFIG: mockAppConfig,
}));

vi.mock("./platform", () => ({
  getNativePlatform: () => "ios",
  isNativeShell: () => true,
}));

vi.mock("./hoodie-share-media", () => ({
  renderHoodieShareCardAsset: renderHoodieShareCardAssetMock,
}));

describe("instagram story share configuration", () => {
  beforeEach(() => {
    mockAppConfig.displayName = "SETU India AU";
    mockAppConfig.instagramStoriesAppId = undefined;
    nativeShareMock.mockReset();
    renderHoodieShareCardAssetMock.mockReset();
    shareToInstagramStoryMock.mockReset();
    renderHoodieShareCardAssetMock.mockResolvedValue({
      blob: new Blob(["share-image"], { type: "image/png" }),
      uri: "file:///tmp/share.png",
    });
    clipboardWriteTextMock.mockReset();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
  });

  function buildDescriptor(overrides: Record<string, unknown> = {}) {
    return {
      kind: "event" as const,
      privacyClass: "public_safe" as const,
      canonicalShareUrl:
        "https://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
      appRoute: "/events/cityofsydney/laneway-festival",
      renderStyle: "brand" as const,
      shareTitle: "Laneway Festival on SETU India AU",
      shareText: "Laneway Festival on SETU India AU",
      shareCaption:
        "Laneway Festival\nhttps://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
      storyCardData: {
        tone: "event" as const,
        title: "Laneway Festival",
        renderStyle: "brand" as const,
      },
      feedCardData: {
        tone: "event" as const,
        title: "Laneway Festival",
        renderStyle: "brand" as const,
      },
      ...overrides,
    };
  }

  it("requires a facebook app id before stories are enabled", () => {
    expect(isInstagramStoryShareConfigured()).toBe(false);
    mockAppConfig.instagramStoriesAppId = "";
    expect(isInstagramStoryShareConfigured()).toBe(false);
    mockAppConfig.instagramStoriesAppId = "  ";
    expect(isInstagramStoryShareConfigured()).toBe(false);
    mockAppConfig.instagramStoriesAppId = "1234567890";
    expect(isInstagramStoryShareConfigured()).toBe(true);
  });

  it("includes the Hoodie caption text alongside share images on every platform", () => {
    const descriptor = {
      shareTitle: "Guide",
      shareCaption:
        "Guide\nhttps://suburb.knowwhatson.com/share/guide/adelaide/test",
    };

    expect(
      buildInstagramSharePayload(descriptor, "file:///tmp/share.png", "ios"),
    ).toEqual({
      title: "Guide",
      dialogTitle: "Share to Instagram",
      text: "Guide\nhttps://suburb.knowwhatson.com/share/guide/adelaide/test",
      files: ["file:///tmp/share.png"],
    });

    expect(
      buildInstagramSharePayload(
        descriptor,
        "file:///tmp/share.png",
        "android",
      ),
    ).toEqual({
      title: "Guide",
      dialogTitle: "Share to Instagram",
      text: "Guide\nhttps://suburb.knowwhatson.com/share/guide/adelaide/test",
      files: ["file:///tmp/share.png"],
    });

    expect(
      buildInstagramShareFallbackPayload(
        descriptor,
        "file:///tmp/share.png",
        "android",
      ),
    ).toEqual({
      title: "Guide",
      dialogTitle: "Share to Instagram",
      text: "Guide\nhttps://suburb.knowwhatson.com/share/guide/adelaide/test",
      url: "file:///tmp/share.png",
    });

    expect(
      buildInstagramShareFallbackPayload(
        descriptor,
        "file:///tmp/share.png",
        "ios",
      ),
    ).toEqual({
      title: "Guide",
      text: "Guide\nhttps://suburb.knowwhatson.com/share/guide/adelaide/test",
      files: ["file:///tmp/share.png"],
    });
  });

  it("falls back to the story-sized native share sheet when no story app id is configured", async () => {
    const result = await shareHoodieDescriptorToInstagram(buildDescriptor(), {
      format: "story",
    });

    expect(renderHoodieShareCardAssetMock).toHaveBeenCalledWith({
      cardData: buildDescriptor().storyCardData,
      format: "story",
      fileName: "event-story.png",
    });
    expect(shareToInstagramStoryMock).not.toHaveBeenCalled();
    expect(nativeShareMock).toHaveBeenCalledWith({
      title: "Laneway Festival on SETU India AU",
      dialogTitle: "Share to Instagram",
      text: "Laneway Festival\nhttps://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
      files: ["file:///tmp/share.png"],
    });
    expect(result).toEqual({
      status: "fallback_opened",
      message:
        "Story-size image ready. Caption copied so you can paste it into Instagram.",
    });
  });

  it("copies the full event caption for poster shares without invite fallback text", async () => {
    const result = await shareHoodieDescriptorToInstagram(buildDescriptor(), {
      format: "feed",
    });

    expect(clipboardWriteTextMock).toHaveBeenCalledWith(
      "Laneway Festival\nhttps://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
    );
    expect(nativeShareMock).toHaveBeenCalledWith({
      title: "Laneway Festival on SETU India AU",
      dialogTitle: "Share to Instagram",
      text: "Laneway Festival\nhttps://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
      files: ["file:///tmp/share.png"],
    });
    expect(result).toEqual({
      status: "fallback_opened",
      message:
        "Image ready. Caption is included in the share text when supported, and copied as a backup.",
    });
  });

  it("prefers the direct Instagram Story plugin when a story app id is configured", async () => {
    mockAppConfig.instagramStoriesAppId = "1234567890";
    shareToInstagramStoryMock.mockResolvedValue(undefined);

    const result = await shareHoodieDescriptorToInstagram(buildDescriptor(), {
      format: "story",
    });

    expect(renderHoodieShareCardAssetMock).toHaveBeenCalledWith({
      cardData: buildDescriptor().storyCardData,
      format: "story",
      fileName: "event-story.png",
    });
    expect(shareToInstagramStoryMock).toHaveBeenCalledWith({
      imageUri: "file:///tmp/share.png",
      facebookAppId: "1234567890",
      backgroundTopColor: "#0F172A",
      backgroundBottomColor: "#38BDF8",
      attributionUrl:
        "https://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival",
    });
    expect(nativeShareMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "shared",
      message:
        "Story card ready. Caption copied so you can paste it into Instagram.",
    });
  });

  it("treats share cancellation as a non-error user action", () => {
    expect(isShareCanceledError(new Error("Share canceled"))).toBe(true);
    expect(isShareCanceledError("Share cancelled")).toBe(true);
    expect(isShareCanceledError({ name: "AbortError" })).toBe(true);
    expect(isShareCanceledError({ code: "CANCELLED" })).toBe(true);
    expect(isShareCanceledError(new Error("Error sharing item"))).toBe(false);
  });

  it("copies invite text plus link for banner-style shares when clipboard fallback text is present", async () => {
    const descriptor = buildDescriptor({
      kind: "public_plan",
      clipboardFallbackText:
        "Join me for\nLaneway Festival\nhttps://ghar.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
      shareCaption:
        "Join me for\nLaneway Festival\nhttps://ghar.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
      storyCardData: {
        tone: "plan",
        title: "Laneway Festival",
        eyebrowText: "Join me for",
        renderStyle: "brand",
      },
      feedCardData: {
        tone: "plan",
        title: "Laneway Festival",
        eyebrowText: "Join me for",
        renderStyle: "brand",
      },
    });

    const result = await shareHoodieDescriptorToInstagram(descriptor as any, {
      format: "feed",
    });

    expect(clipboardWriteTextMock).toHaveBeenCalledWith(
      "Join me for\nLaneway Festival\nhttps://ghar.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
    );
    expect(nativeShareMock).toHaveBeenCalledWith({
      title: "Laneway Festival on SETU India AU",
      dialogTitle: "Share to Instagram",
      text: "Join me for\nLaneway Festival\nhttps://ghar.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42",
      files: ["file:///tmp/share.png"],
    });
    expect(result).toEqual({
      status: "fallback_opened",
      message: "Image ready. Invite text and link copied as a backup.",
    });
  });
});
