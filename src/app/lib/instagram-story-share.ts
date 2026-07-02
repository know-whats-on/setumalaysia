import { registerPlugin } from "@capacitor/core";
import { APP_CONFIG } from "./app-config";
import { getNativePlatform, isNativeShell } from "./platform";
import type { HoodieShareDescriptor } from "./hoodie-share";
import { renderHoodieShareCardAsset } from "./hoodie-share-media";

type InstagramStoryShareOptions = {
  imageUri: string;
  facebookAppId: string;
  backgroundTopColor?: string;
  backgroundBottomColor?: string;
  attributionUrl?: string;
};

type InstagramStorySharePlugin = {
  shareToInstagramStory(options: InstagramStoryShareOptions): Promise<void>;
};

type ShareErrorLike = {
  message?: unknown;
  code?: unknown;
  errorCode?: unknown;
  name?: unknown;
};

export type HoodieShareResultStatus =
  | "shared"
  | "cancelled"
  | "fallback_opened"
  | "failed";

export type HoodieShareResult = {
  status: HoodieShareResultStatus;
  message: string;
};

export type InstagramShareFormat = "feed" | "story";

type NativeSharePayload = {
  title?: string;
  dialogTitle?: string;
  text?: string;
  url?: string;
  files?: string[];
};

const InstagramStoryShare = registerPlugin<InstagramStorySharePlugin>(
  "InstagramStoryShare",
);

function getShareAppName() {
  return APP_CONFIG.displayName;
}

function getShareErrorDetails(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as ShareErrorLike).message || "")
          : "";
  const code =
    error &&
    typeof error === "object" &&
    ("code" in error || "errorCode" in error)
      ? String(
          (error as ShareErrorLike).code ||
            (error as ShareErrorLike).errorCode ||
            "",
        )
      : "";
  const name =
    error instanceof Error
      ? error.name
      : error && typeof error === "object" && "name" in error
        ? String((error as ShareErrorLike).name || "")
        : "";

  return { message, code, name };
}

function buildCancelledShareResult(
  message = `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`,
): HoodieShareResult {
  return {
    status: "cancelled",
    message,
  };
}

function buildFailedShareResult(message: string): HoodieShareResult {
  return {
    status: "failed",
    message,
  };
}

async function openNativeShareSheet(payload: NativeSharePayload) {
  const { Share } = await import("@capacitor/share");
  await Share.share(payload);
}

function buildNativeLinkSharePayload(
  descriptor: Pick<
    HoodieShareDescriptor,
    "shareTitle" | "shareCaption" | "canonicalShareUrl"
  >,
): NativeSharePayload {
  return {
    title: descriptor.shareTitle,
    dialogTitle: descriptor.shareTitle,
    text: descriptor.shareCaption,
    url: descriptor.canonicalShareUrl,
  };
}

export function isInstagramStoryShareConfigured(
  appId = APP_CONFIG.instagramStoriesAppId,
) {
  return Boolean(String(appId || "").trim());
}

export function isShareCanceledError(error: unknown) {
  const { message, code, name } = getShareErrorDetails(error);
  const normalizedMessage = message.trim();
  const normalizedCode = code.trim().toLowerCase();
  const normalizedName = name.trim().toLowerCase();

  return (
    /share cancel(?:ed|led)/i.test(normalizedMessage) ||
    /cancel(?:ed|led)/i.test(normalizedMessage) ||
    /user aborted/i.test(normalizedMessage) ||
    /user did not share/i.test(normalizedMessage) ||
    normalizedCode === "cancelled" ||
    normalizedCode === "canceled" ||
    normalizedCode === "err_canceled" ||
    normalizedName === "aborterror"
  );
}

export function buildInstagramSharePayload(
  descriptor: Pick<HoodieShareDescriptor, "shareTitle" | "shareCaption">,
  renderedUri: string,
  platform = getNativePlatform(),
): NativeSharePayload {
  const basePayload: NativeSharePayload = {
    title: descriptor.shareTitle,
    dialogTitle: "Share to Instagram",
    text: descriptor.shareCaption,
    files: [renderedUri],
  };

  if (platform === "ios") {
    return basePayload;
  }

  return basePayload;
}

export function buildInstagramShareFallbackPayload(
  descriptor: Pick<HoodieShareDescriptor, "shareTitle" | "shareCaption">,
  renderedUri: string,
  platform = getNativePlatform(),
): NativeSharePayload {
  if (platform === "ios") {
    return {
      title: descriptor.shareTitle,
      text: descriptor.shareCaption,
      files: [renderedUri],
    };
  }

  return {
    title: descriptor.shareTitle,
    dialogTitle: "Share to Instagram",
    text: descriptor.shareCaption,
    url: renderedUri,
  };
}

function getStoryShareColors(kind: HoodieShareDescriptor["kind"]) {
  switch (kind) {
    case "event":
      return { top: "#0F172A", bottom: "#38BDF8" };
    case "public_plan":
      return { top: "#022C22", bottom: "#5EEAD4" };
    case "city_guide":
      return { top: "#3B0764", bottom: "#F472B6" };
    case "suburb_snapshot":
      return { top: "#312E81", bottom: "#A855F7" };
    case "address_check_snapshot":
      return { top: "#451A03", bottom: "#FDBA74" };
    case "scam_check_summary":
      return { top: "#3F0D12", bottom: "#FCA5A5" };
    default:
      return { top: "#0F172A", bottom: "#38BDF8" };
  }
}

async function copyTextToClipboard(text: string) {
  const value = String(text || "").trim();
  if (!value || typeof document === "undefined") return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn(
        `${getShareAppName()} share clipboard write failed, trying the textarea fallback instead:`,
        error,
      );
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch (error) {
    console.warn(
      `${getShareAppName()} share clipboard fallback failed:`,
      error,
    );
    return false;
  }
}

function getClipboardFallbackText(
  descriptor: Pick<
    HoodieShareDescriptor,
    "clipboardFallbackText" | "shareCaption" | "canonicalShareUrl"
  >,
) {
  return (
    String(descriptor.clipboardFallbackText || "").trim() ||
    String(descriptor.shareCaption || "").trim() ||
    descriptor.canonicalShareUrl
  );
}

function hasRichClipboardFallbackText(
  descriptor: Pick<HoodieShareDescriptor, "clipboardFallbackText">,
) {
  return Boolean(String(descriptor.clipboardFallbackText || "").trim());
}

function hasCaptionClipboardFallbackText(
  descriptor: Pick<HoodieShareDescriptor, "shareCaption">,
) {
  return Boolean(String(descriptor.shareCaption || "").trim());
}

function buildShareFileName(
  descriptor: HoodieShareDescriptor,
  format: "story" | "feed",
) {
  return `${descriptor.kind.replace(/_/g, "-")}-${format}.png`;
}

export async function shareHoodieDescriptorToInstagramStory(
  descriptor: HoodieShareDescriptor,
): Promise<HoodieShareResult> {
  if (!isNativeShell()) {
    return buildFailedShareResult(
      "Instagram Story sharing is only available in the mobile app.",
    );
  }

  const facebookAppId = String(APP_CONFIG.instagramStoriesAppId || "").trim();
  if (!facebookAppId) {
    return buildFailedShareResult(
      "Instagram Story sharing is not configured for this build yet.",
    );
  }

  const rendered = await renderHoodieShareCardAsset({
    cardData: descriptor.storyCardData,
    format: "story",
    fileName: buildShareFileName(descriptor, "story"),
  });

  const colors = getStoryShareColors(descriptor.kind);
  const copiedLink = await copyTextToClipboard(
    getClipboardFallbackText(descriptor),
  );
  const copiedInviteText = hasRichClipboardFallbackText(descriptor);
  const copiedCaptionText = !copiedInviteText &&
    hasCaptionClipboardFallbackText(descriptor);

  try {
    await InstagramStoryShare.shareToInstagramStory({
      imageUri: rendered.uri,
      facebookAppId,
      backgroundTopColor: colors.top,
      backgroundBottomColor: colors.bottom,
      attributionUrl: descriptor.canonicalShareUrl,
    });

    return {
      status: "shared",
      message: copiedLink
        ? copiedInviteText
          ? "Story card ready. Invite text and link copied so you can paste them into Instagram."
          : copiedCaptionText
            ? "Story card ready. Caption copied so you can paste it into Instagram."
            : "Story card ready. Link copied so you can add it with Instagram’s link sticker."
        : `Story card ready. Add your ${getShareAppName()} link with Instagram’s link sticker if you want it clickable.`,
    };
  } catch (error) {
    if (isShareCanceledError(error)) {
      return buildCancelledShareResult(
        copiedLink
          ? copiedInviteText
            ? "Instagram Story composer closed. Your invite text and link are still copied if you want to paste them manually."
            : copiedCaptionText
              ? "Instagram Story composer closed. Your caption is still copied if you want to paste it manually."
              : `Instagram Story composer closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
          : "Instagram Story composer closed.",
      );
    }

    console.error(`${getShareAppName()} Instagram Story share failed:`, error);
    return buildFailedShareResult(
        copiedLink
          ? copiedInviteText
            ? "Instagram Story did not open this time. Your invite text and link are still copied if you want to paste them manually."
            : copiedCaptionText
              ? "Instagram Story did not open this time. Your caption is still copied if you want to paste it manually."
              : `Instagram Story did not open this time. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
          : "Instagram Story did not open this time.",
    );
  }
}

export async function shareHoodieDescriptorToInstagram(
  descriptor: HoodieShareDescriptor,
  options: {
    format?: InstagramShareFormat;
  } = {},
): Promise<HoodieShareResult> {
  const requestedFormat = options.format || "feed";
  const isStoryFormat = requestedFormat === "story";

  if (isStoryFormat && isInstagramStoryShareConfigured()) {
    return shareHoodieDescriptorToInstagramStory(descriptor);
  }

  if (!isNativeShell()) {
    const copiedLink = await copyTextToClipboard(
      getClipboardFallbackText(descriptor),
    );
    const copiedInviteText = hasRichClipboardFallbackText(descriptor);
    const copiedCaptionText = !copiedInviteText &&
      hasCaptionClipboardFallbackText(descriptor);
    return {
      status: "fallback_opened",
      message: copiedLink
        ? copiedInviteText
          ? "Invite text and link copied. Instagram handoff works best from the mobile app."
          : copiedCaptionText
            ? "Caption copied. Instagram handoff works best from the mobile app."
            : "Link copied. Instagram handoff works best from the mobile app."
        : "Instagram handoff works best from the mobile app.",
    };
  }

  const renderFormat = isStoryFormat ? "story" : "feed";
  const rendered = await renderHoodieShareCardAsset({
    cardData: isStoryFormat
      ? descriptor.storyCardData
      : descriptor.feedCardData,
    format: renderFormat,
    fileName: buildShareFileName(descriptor, renderFormat),
  });

  const platform = getNativePlatform();
  const copiedLink = await copyTextToClipboard(
    getClipboardFallbackText(descriptor),
  );
  const copiedInviteText = hasRichClipboardFallbackText(descriptor);
  const copiedCaptionText = !copiedInviteText &&
    hasCaptionClipboardFallbackText(descriptor);
  const successMessage = isStoryFormat
    ? copiedLink
      ? copiedInviteText
        ? "Story-size image ready. Invite text and link copied so you can paste them into Instagram."
        : copiedCaptionText
          ? "Story-size image ready. Caption copied so you can paste it into Instagram."
          : `Story-size image ready. ${getShareAppName()} link copied if you want to paste it into Instagram.`
      : "Story-size image ready for Instagram."
    : copiedLink
      ? copiedInviteText
        ? "Image ready. Invite text and link copied as a backup."
        : copiedCaptionText
          ? "Image ready. Caption is included in the share text when supported, and copied as a backup."
          : `Image ready. ${getShareAppName()} link is included in the share text when supported, and copied as a backup.`
      : `Image ready. ${getShareAppName()} link is included in the share text when supported.`;
  const fallbackLinkMessage = isStoryFormat
    ? copiedLink
      ? copiedInviteText
        ? "Story-size image share did not open, but your invite text and link are ready to share."
        : copiedCaptionText
          ? "Story-size image share did not open, but your caption is ready to share."
          : `Story-size image share did not open, but your ${getShareAppName()} link is ready to share.`
      : `Story-size image share did not open, but the ${getShareAppName()} link share sheet is ready.`
    : copiedLink
      ? copiedInviteText
        ? "Image share did not open, but your invite text and link are ready to share."
        : copiedCaptionText
          ? "Image share did not open, but your caption is ready to share."
          : `Image share did not open, but your ${getShareAppName()} link is ready to share.`
      : `Image share did not open, but the ${getShareAppName()} link share sheet is ready.`;
  const failedMessage = isStoryFormat
    ? copiedLink
      ? copiedInviteText
        ? "Instagram story-size share did not open this time. Your invite text and link are copied, so you can still paste them manually."
        : copiedCaptionText
          ? "Instagram story-size share did not open this time. Your caption is copied, so you can still paste it manually."
          : `Instagram story-size share did not open this time. Your ${getShareAppName()} link is copied, so you can still paste it manually.`
      : "Instagram story-size share did not open this time."
    : copiedLink
      ? copiedInviteText
        ? "Instagram share did not open this time. Your invite text and link are copied, so you can still paste them manually."
        : copiedCaptionText
          ? "Instagram share did not open this time. Your caption is copied, so you can still paste it manually."
          : `Instagram share did not open this time. Your ${getShareAppName()} link is copied, so you can still paste it manually.`
      : "Instagram share did not open this time.";

  if (platform === "ios") {
    try {
      await openNativeShareSheet(
        buildInstagramSharePayload(descriptor, rendered.uri, platform),
      );
      return {
        status: "fallback_opened",
        message: successMessage,
      };
    } catch (error) {
      if (isShareCanceledError(error)) {
        return buildCancelledShareResult(
          copiedLink
            ? copiedInviteText
              ? "Share sheet closed. Your invite text and link are still copied if you want to paste them manually."
              : copiedCaptionText
                ? "Share sheet closed. Your caption is still copied if you want to paste it manually."
                : `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
            : "Share sheet closed.",
        );
      }
      console.warn(
        `${getShareAppName()} Instagram share with dialog title failed on iPhone, retrying with a file-only payload:`,
        error,
      );
    }

    try {
      await openNativeShareSheet(
        buildInstagramShareFallbackPayload(descriptor, rendered.uri, platform),
      );
      return {
        status: "fallback_opened",
        message: successMessage,
      };
    } catch (error) {
      if (isShareCanceledError(error)) {
        return buildCancelledShareResult(
          copiedLink
            ? copiedInviteText
              ? "Share sheet closed. Your invite text and link are still copied if you want to paste them manually."
              : copiedCaptionText
                ? "Share sheet closed. Your caption is still copied if you want to paste it manually."
                : `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
            : "Share sheet closed.",
        );
      }
      console.warn(
        `${getShareAppName()} Instagram image share failed on iPhone, falling back to a plain link share sheet:`,
        error,
      );
    }

    try {
      await openNativeShareSheet(buildNativeLinkSharePayload(descriptor));
      return {
        status: "fallback_opened",
        message: fallbackLinkMessage,
      };
    } catch (error) {
      if (isShareCanceledError(error)) {
        return buildCancelledShareResult(
          copiedLink
            ? copiedInviteText
              ? "Share sheet closed. Your invite text and link are still copied if you want to paste them manually."
              : copiedCaptionText
                ? "Share sheet closed. Your caption is still copied if you want to paste it manually."
                : `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
            : "Share sheet closed.",
        );
      }

      console.error(
        `${getShareAppName()} Instagram share failed after iPhone fallbacks:`,
        error,
      );
      return buildFailedShareResult(failedMessage);
    }
  }

  try {
    await openNativeShareSheet(
      buildInstagramSharePayload(descriptor, rendered.uri, platform),
    );
    return {
      status: "shared",
      message: isStoryFormat
        ? copiedLink
          ? copiedCaptionText
            ? "Instagram share sheet opened with a story-size image. Caption copied if you want to paste it into Instagram."
            : "Instagram share sheet opened with a story-size image. Link copied if you want to paste it into the caption."
          : "Instagram share sheet opened with a story-size image."
        : copiedLink
          ? copiedCaptionText
            ? "Instagram share sheet opened. Caption is included in the share text when supported, and copied as a backup."
            : `Instagram share sheet opened. ${getShareAppName()} link is included in the share text when supported, and copied as a backup.`
          : `Instagram share sheet opened. ${getShareAppName()} link is included in the share text when supported.`,
    };
  } catch (error) {
    if (isShareCanceledError(error)) {
      return buildCancelledShareResult(
          copiedLink
            ? copiedInviteText
              ? "Share sheet closed. Your invite text and link are still copied if you want to paste them manually."
              : copiedCaptionText
                ? "Share sheet closed. Your caption is still copied if you want to paste it manually."
                : `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
            : "Share sheet closed.",
        );
    }

    console.warn(
      `${getShareAppName()} Instagram share with file failed, retrying with the share image only:`,
      error,
    );
  }

  try {
    await openNativeShareSheet(
      buildInstagramShareFallbackPayload(descriptor, rendered.uri, platform),
    );
    return {
      status: "fallback_opened",
      message: isStoryFormat
        ? copiedLink
          ? copiedCaptionText
            ? "Instagram share sheet opened with a story-size image. Caption copied if you want to paste it into Instagram."
            : "Instagram share sheet opened with a story-size image. Link copied if you want to paste it into the caption."
          : "Instagram share sheet opened with a story-size image."
        : copiedLink
          ? copiedCaptionText
            ? "Instagram share sheet opened. Caption is included in the share text when supported, and copied as a backup."
            : `Instagram share sheet opened. ${getShareAppName()} link is included in the share text when supported, and copied as a backup.`
          : `Instagram share sheet opened. ${getShareAppName()} link is included in the share text when supported.`,
    };
  } catch (error) {
    if (isShareCanceledError(error)) {
      return buildCancelledShareResult(
          copiedLink
            ? copiedInviteText
              ? "Share sheet closed. Your invite text and link are still copied if you want to paste them manually."
              : copiedCaptionText
                ? "Share sheet closed. Your caption is still copied if you want to paste it manually."
                : `Share sheet closed. Your ${getShareAppName()} link is still copied if you want to paste it manually.`
            : "Share sheet closed.",
        );
    }

    console.error(
      `${getShareAppName()} Instagram share failed after native retry:`,
      error,
    );
    return buildFailedShareResult(failedMessage);
  }
}

export async function shareHoodieDescriptorGeneric(
  descriptor: HoodieShareDescriptor,
): Promise<HoodieShareResult> {
  if (isNativeShell()) {
    try {
      await openNativeShareSheet({
        title: descriptor.shareTitle,
        text: descriptor.shareText,
        url: descriptor.canonicalShareUrl,
        dialogTitle: descriptor.shareTitle,
      });
      return {
        status: "shared",
        message: "Share link ready.",
      };
    } catch (error) {
      if (isShareCanceledError(error)) {
        return {
          status: "cancelled",
          message: "Share sheet closed.",
        };
      }

      const copiedLink = await copyTextToClipboard(
        descriptor.canonicalShareUrl,
      );
      console.error(`${getShareAppName()} generic native share failed:`, error);
      return buildFailedShareResult(
        copiedLink
          ? `Sharing did not finish this time. Your ${getShareAppName()} link is copied to the clipboard.`
          : "Sharing did not finish this time.",
      );
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: descriptor.shareTitle,
        text: descriptor.shareText,
        url: descriptor.canonicalShareUrl,
      });
      return {
        status: "shared",
        message: "Share link ready.",
      };
    } catch (error) {
      if (isShareCanceledError(error)) {
        return {
          status: "cancelled",
          message: "Share sheet closed.",
        };
      }

      const copiedLink = await copyTextToClipboard(
        descriptor.canonicalShareUrl,
      );
      console.error(`${getShareAppName()} web share failed:`, error);
      return buildFailedShareResult(
        copiedLink
          ? `Sharing did not finish this time. Your ${getShareAppName()} link is copied to the clipboard.`
          : "Sharing did not finish this time.",
      );
    }
  }

  const copiedLink = await copyTextToClipboard(descriptor.canonicalShareUrl);
  return {
    status: "shared",
    message: copiedLink
      ? "Link copied to your clipboard."
      : "Sharing is not available here right now.",
  };
}
