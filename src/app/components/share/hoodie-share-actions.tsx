import { useMemo, useState } from "react";
import { Image, LoaderCircle, Share2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { isNativeShell } from "../../lib/platform";
import type { HoodieShareDescriptor } from "../../lib/hoodie-share";
import {
  type InstagramShareFormat,
  shareHoodieDescriptorGeneric,
  shareHoodieDescriptorToInstagram,
} from "../../lib/instagram-story-share";
import { APP_CONFIG } from "../../lib/app-config";

type ShareActionKind = "instagram_feed" | "instagram_story" | "generic";
type HoodieShareActionsVariant = "default" | "invite";

export function HoodieShareActions({
  descriptor,
  confirmation,
  className = "",
  variant = "default",
  showGenericAction = true,
  disabled = false,
  disabledReason = "",
  instagramDisabled,
  instagramDisabledReason,
}: {
  descriptor: HoodieShareDescriptor;
  confirmation?: {
    title: string;
    description: string;
  };
  className?: string;
  variant?: HoodieShareActionsVariant;
  showGenericAction?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  instagramDisabled?: boolean;
  instagramDisabledReason?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [instagramOptionsOpen, setInstagramOptionsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ShareActionKind | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<ShareActionKind | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const showNativeInstagramActions = isNativeShell();
  const isPersonalizedShare =
    descriptor.privacyClass === "personalized_generic_link";
  const shouldConfirm = Boolean(confirmation) || isPersonalizedShare;
  const instagramActionDisabled = Boolean(disabled || instagramDisabled);
  const isInviteVariant = variant === "invite";
  const visibleDisabledReason =
    !disabled && instagramDisabled && showNativeInstagramActions
      ? String(instagramDisabledReason || "").trim()
      : String(disabledReason || "").trim();

  const confirmationCopy = useMemo(
    () =>
      confirmation || {
        title: "Share-safe check",
        description: `This export uses the redacted ${APP_CONFIG.displayName} share card, not your private notes or exact personal details.`,
      },
    [confirmation],
  );

  const runShareAction = async (action: ShareActionKind) => {
    setBusyAction(action);
    setError("");
    setMessage("");

    try {
      const instagramFormat: InstagramShareFormat | null =
        action === "instagram_story"
          ? "story"
          : action === "instagram_feed"
            ? "feed"
            : null;
      const result = instagramFormat
        ? await shareHoodieDescriptorToInstagram(descriptor, {
            format: instagramFormat,
          })
        : await shareHoodieDescriptorGeneric(descriptor);

      if (result.status === "failed") {
        setError(result.message);
      } else {
        setMessage(result.message);
      }
    } catch (shareError) {
      const nextError =
        shareError instanceof Error
          ? shareError.message
          : typeof shareError === "string"
            ? shareError
            : "Sharing did not finish this time.";
      setError(nextError);
    } finally {
      setBusyAction(null);
      setPendingAction(null);
    }
  };

  const handleActionPress = (action: ShareActionKind) => {
    setInstagramOptionsOpen(false);
    if (shouldConfirm) {
      setPendingAction(action);
      setConfirmOpen(true);
      return;
    }

    void runShareAction(action);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {showNativeInstagramActions ? (
          <button
            type="button"
            onClick={() => setInstagramOptionsOpen(true)}
            disabled={busyAction !== null || instagramActionDisabled}
            className="inline-flex items-center gap-2 rounded-[18px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "instagram_feed" ||
            busyAction === "instagram_story" ||
            instagramActionDisabled ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" strokeWidth={1.8} />
            )}
            {isInviteVariant ? "Share as Invite" : "Share to Instagram"}
          </button>
        ) : null}

        {showGenericAction ? (
          <button
            type="button"
            aria-label="Share"
            onClick={() => handleActionPress("generic")}
            disabled={busyAction !== null || disabled}
            className={`inline-flex items-center rounded-[18px] border border-[#CBD5E1] bg-white py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 ${
              isInviteVariant ? "justify-center px-3" : "gap-2 px-4"
            }`}
          >
            {busyAction === "generic" || disabled ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" strokeWidth={1.8} />
            )}
            {isInviteVariant ? <span className="sr-only">Share</span> : "Share"}
          </button>
        ) : null}
      </div>

      {!message && !error && visibleDisabledReason ? (
        <p className="mt-2 text-sm text-[#64748B]">{visibleDisabledReason}</p>
      ) : null}
      {message ? (
        <p className="mt-2 text-sm text-[#0F766E]">{message}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-[#B91C1C]">{error}</p> : null}

      <Dialog
        open={instagramOptionsOpen}
        onOpenChange={setInstagramOptionsOpen}
      >
        <DialogContent className="border-[#E2E8F0] bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">
              Choose Instagram Size
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#475569]">
              Pick the asset size you want to export for Instagram.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleActionPress("instagram_feed")}
              disabled={busyAction !== null || instagramActionDisabled}
              className="rounded-[20px] border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-4 text-left transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-[#1D4ED8]">Post</div>
              <div className="mt-1 text-sm text-[#475569]">1080 x 1350 px</div>
            </button>

            <button
              type="button"
              onClick={() => handleActionPress("instagram_story")}
              disabled={busyAction !== null || instagramActionDisabled}
              className="rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4 text-left transition hover:bg-[#FEF3C7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-[#92400E]">Story</div>
              <div className="mt-1 text-sm text-[#475569]">1080 x 1920 px</div>
              <div className="mt-1 text-xs text-[#78716C]">
                Safe area: centered 1080 x 1610 px
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-[#E2E8F0] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A]">
              {confirmationCopy.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[#475569]">
              {confirmationCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setPendingAction(null)}
              className="border-[#CBD5E1] text-[#475569]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const nextAction = pendingAction;
                setConfirmOpen(false);
                if (nextAction) {
                  void runShareAction(nextAction);
                }
              }}
              className="bg-[#0F172A] text-white hover:bg-[#1E293B]"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
