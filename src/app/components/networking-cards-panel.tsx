import { Browser } from "@capacitor/browser";
import {
  ExternalLink,
  Pencil,
  QrCode,
  Save,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createNetworkingCard,
  deleteNetworkingCard,
  fetchMyLinkedInProfile,
  fetchNetworkingCards,
  saveMyLinkedInProfile,
  updateNetworkingCard,
  type MyLinkedInProfile,
  type NetworkingCard,
  type NetworkingCardPayload,
} from "../lib/api";

type NetworkingCardDraft = {
  linkedin_url: string;
  display_name: string;
  notes: string;
};

type Html5QrcodeInstance = {
  start: (
    cameraConfig: unknown,
    config: unknown,
    onSuccess: (decodedText: string) => void,
    onError?: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

const EMPTY_DRAFT: NetworkingCardDraft = {
  linkedin_url: "",
  display_name: "",
  notes: "",
};

const QUICK_NOTE_PLACEHOLDER =
  'Met at Founders event, introduced by Nina. Is a super connector, goes by "Dan". Said he might know someone for GTM interns.';

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]";

function normalizeLinkedInUrl(value: string) {
  let raw = value.trim();
  if (!raw) return "";
  raw = raw.replace(/^linkedin\.com/i, "https://www.linkedin.com");
  raw = raw.replace(/^www\.linkedin\.com/i, "https://www.linkedin.com");
  raw = raw.replace(/^https?:\/\/linkedin\.com/i, "https://www.linkedin.com");
  if (!/^https?:\/\//i.test(raw)) return "";

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const isLinkedInHost =
      host === "linkedin.com" ||
      host === "www.linkedin.com" ||
      host.endsWith(".linkedin.com");
    if (!isLinkedInHost) return "";
    const path = url.pathname.replace(/\/{2,}/g, "/");
    if (!/^\/(in|company)\//i.test(path)) return "";
    url.protocol = "https:";
    url.hostname = "www.linkedin.com";
    url.pathname = path.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function getLinkedInAccountSlug(value: string) {
  const normalized = normalizeLinkedInUrl(value);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(1) || "").trim();
  } catch {
    return "";
  }
}

function guessDisplayNameFromLinkedIn(value: string) {
  const slug = getLinkedInAccountSlug(value);
  if (!slug) return "";
  try {
    const cleanParts: string[] = [];
    for (const part of slug.split(/[-_\s]+/).filter(Boolean)) {
      if (/\d/.test(part) && cleanParts.length > 0) break;
      cleanParts.push(part);
    }
    const formatted = cleanParts
      .slice(0, 4)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return formatted || slug;
  } catch {
    return slug;
  }
}

function inferDisplayNameFromNote(note: string, fallback = "") {
  const aliasMatch = note.match(/\b(?:goes by|called|known as)\s+([A-Z][A-Za-z'’-]*(?:\s+[A-Z][A-Za-z'’-]*)?)/);
  if (aliasMatch?.[1]) return aliasMatch[1].trim();
  return fallback;
}

function draftFromCard(card: NetworkingCard): NetworkingCardDraft {
  return {
    linkedin_url: card.linkedin_url,
    display_name: card.display_name || guessDisplayNameFromLinkedIn(card.linkedin_url),
    notes: card.notes || "",
  };
}

function payloadFromDraft(email: string, draft: NetworkingCardDraft): NetworkingCardPayload {
  const linkedinUrl = normalizeLinkedInUrl(draft.linkedin_url);
  const note = draft.notes.trim();
  const displayName = draft.display_name.trim() ||
    inferDisplayNameFromNote(note, guessDisplayNameFromLinkedIn(linkedinUrl));
  const payload: NetworkingCardPayload = {
    email,
    linkedin_url: linkedinUrl,
    notes: note,
  };
  if (displayName) payload.display_name = displayName;
  return payload;
}

function displayNameForCard(card: NetworkingCard) {
  return card.display_name || guessDisplayNameFromLinkedIn(card.linkedin_url) || "LinkedIn contact";
}

function cardMeta(card: NetworkingCard) {
  return [card.role, card.company, card.headline].filter(Boolean).join(" • ");
}

function cardContext(card: NetworkingCard) {
  return [card.met_event_title, card.met_context, card.met_at].filter(Boolean).join(" • ");
}

function cardSummary(card: NetworkingCard) {
  return card.notes || cardContext(card) || cardMeta(card) || "Saved LinkedIn link";
}

function getCardDisplayTags(card: NetworkingCard) {
  const source = Array.isArray(card.display_tags) && card.display_tags.length > 0
    ? card.display_tags
    : card.tags;
  return Array.from(new Set((source || []).filter(Boolean))).slice(0, 8);
}

export function NetworkingCardsPanel({ email }: { email: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const [cards, setCards] = useState<NetworkingCard[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NetworkingCardDraft>(EMPTY_DRAFT);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [myLinkedIn, setMyLinkedIn] = useState<MyLinkedInProfile | null>(null);
  const [myLinkedInDraft, setMyLinkedInDraft] = useState("");
  const [myLinkedInFormOpen, setMyLinkedInFormOpen] = useState(false);
  const [myLinkedInQrUrl, setMyLinkedInQrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMyLinkedIn, setSavingMyLinkedIn] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [expandedTagCardIds, setExpandedTagCardIds] = useState<Set<string>>(() => new Set());
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const readerIdRef = useRef(`networking-card-reader-${Math.random().toString(36).slice(2)}`);

  const loadCards = useCallback(async () => {
    if (!normalizedEmail) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNetworkingCards({
        email: normalizedEmail,
        q: query,
        limit: 50,
      });
      setCards(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load My Network.");
    } finally {
      setLoading(false);
    }
  }, [normalizedEmail, query]);

  const loadMyLinkedIn = useCallback(async () => {
    if (!normalizedEmail) return;
    try {
      const profile = await fetchMyLinkedInProfile(normalizedEmail);
      setMyLinkedIn(profile);
      setMyLinkedInDraft(profile?.linkedin_url || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load your LinkedIn QR.");
    }
  }, [normalizedEmail]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadCards(), query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadCards, query]);

  useEffect(() => {
    void loadMyLinkedIn();
  }, [loadMyLinkedIn]);

  useEffect(() => {
    let cancelled = false;
    if (!myLinkedIn?.linkedin_url) {
      setMyLinkedInQrUrl("");
      return;
    }
    QRCode.toDataURL(myLinkedIn.linkedin_url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#061B18",
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (!cancelled) setMyLinkedInQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setMyLinkedInQrUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [myLinkedIn?.linkedin_url]);

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setScannerActive(false);
    if (!instance) return;
    try {
      await instance.stop();
    } catch {
      // Scanner may already be stopped.
    }
    try {
      await instance.clear();
    } catch {
      // Ignore cleanup errors from detached video nodes.
    }
  }, []);

  useEffect(() => () => {
    void stopScanner();
  }, [stopScanner]);

  const openBlankForm = useCallback(() => {
    void stopScanner();
    setDraft(EMPTY_DRAFT);
    setEditingCardId(null);
    setFormOpen(true);
    setScanError(null);
    setError(null);
  }, [stopScanner]);

  const scrollToForm = useCallback(() => {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }, []);

  const handleManualAdd = useCallback(() => {
    openBlankForm();
    scrollToForm();
  }, [openBlankForm, scrollToForm]);

  const openFormFromLinkedIn = useCallback((value: string) => {
    const linkedinUrl = normalizeLinkedInUrl(value);
    if (!linkedinUrl) {
      setScanError("That QR code was not a LinkedIn profile or company URL. Paste the LinkedIn URL instead.");
      return false;
    }
    setDraft({
      linkedin_url: linkedinUrl,
      display_name: guessDisplayNameFromLinkedIn(linkedinUrl),
      notes: "",
    });
    setEditingCardId(null);
    setFormOpen(true);
    setScanError(null);
    scrollToForm();
    return true;
  }, [scrollToForm]);

  const startScanner = useCallback(async () => {
    setScanError(null);
    setError(null);
    if (!normalizedEmail) {
      setScanError("Sign in with your email before saving My Network entries.");
      return;
    }
    try {
      await stopScanner();
      setScannerActive(true);
      const module = await import("html5-qrcode");
      const Html5Qrcode = (module as any).Html5Qrcode;
      const scanner = new Html5Qrcode(readerIdRef.current) as Html5QrcodeInstance;
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (openFormFromLinkedIn(decodedText)) {
            void stopScanner();
          }
        },
      );
    } catch (scanStartError) {
      setScannerActive(false);
      scannerRef.current = null;
      setScanError(
        scanStartError instanceof Error
          ? scanStartError.message
          : "Camera scanner could not start. Paste the LinkedIn URL instead.",
      );
    }
  }, [normalizedEmail, openFormFromLinkedIn, stopScanner]);

  const handleEdit = useCallback((card: NetworkingCard) => {
    void stopScanner();
    setDraft(draftFromCard(card));
    setEditingCardId(card.id);
    setFormOpen(true);
    setError(null);
    setScanError(null);
  }, [stopScanner]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!normalizedEmail) {
      setError("Sign in with your email before saving My Network entries.");
      return;
    }
    if (!normalizeLinkedInUrl(draft.linkedin_url)) {
      setError("Paste a valid LinkedIn profile or company URL.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = payloadFromDraft(normalizedEmail, draft);
      if (editingCardId) {
        await updateNetworkingCard(editingCardId, payload);
      } else {
        await createNetworkingCard(payload);
      }
      setFormOpen(false);
      setEditingCardId(null);
      setDraft(EMPTY_DRAFT);
      await loadCards();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save My Network.");
    } finally {
      setSaving(false);
    }
  }, [draft, editingCardId, loadCards, normalizedEmail]);

  const updateLinkedInUrl = useCallback((value: string) => {
    setDraft((current) => {
      const previousAutoName = guessDisplayNameFromLinkedIn(current.linkedin_url);
      const nextAutoName = guessDisplayNameFromLinkedIn(value);
      const shouldUseAutoName =
        !current.display_name.trim() ||
        current.display_name.trim() === previousAutoName;
      return {
        ...current,
        linkedin_url: value,
        display_name: shouldUseAutoName ? nextAutoName : current.display_name,
      };
    });
  }, []);

  const handleMyLinkedInSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!normalizedEmail) {
      setError("Sign in with your email before saving your LinkedIn QR.");
      return;
    }
    const linkedinUrl = normalizeLinkedInUrl(myLinkedInDraft);
    if (!linkedinUrl) {
      setError("Paste a valid LinkedIn profile or company URL for your QR.");
      return;
    }
    setSavingMyLinkedIn(true);
    setError(null);
    try {
      const profile = await saveMyLinkedInProfile({
        email: normalizedEmail,
        linkedin_url: linkedinUrl,
        display_name: guessDisplayNameFromLinkedIn(linkedinUrl),
      });
      setMyLinkedIn(profile);
      setMyLinkedInDraft(profile.linkedin_url);
      setMyLinkedInFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save your LinkedIn QR.");
    } finally {
      setSavingMyLinkedIn(false);
    }
  }, [myLinkedInDraft, normalizedEmail]);

  const handleDelete = useCallback(async (card: NetworkingCard) => {
    setDeletingId(card.id);
    setError(null);
    try {
      await deleteNetworkingCard(card.id, normalizedEmail);
      await loadCards();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete My Network.");
    } finally {
      setDeletingId(null);
    }
  }, [loadCards, normalizedEmail]);

  const toggleCardTags = useCallback((cardId: string) => {
    setExpandedTagCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const cardCountLabel = useMemo(() => {
    if (loading) return "Loading";
    if (cards.length === 1) return "1 saved link";
    return `${cards.length} saved links`;
  }, [cards.length, loading]);

  if (!normalizedEmail) {
    return (
      <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 text-sm text-[#475569] shadow-sm">
        Sign in with your email to save LinkedIn links and follow-up notes.
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="My Network builder">
      <div className="overflow-hidden rounded-3xl border border-[#123B35] bg-[#061B18] text-white shadow-[0_14px_44px_rgba(6,27,24,0.16)]">
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F6C453] text-[#061B18]">
              <QrCode className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8BE0C6]">
                My Network
              </p>
              <h2 className="mt-1 text-xl font-bold leading-tight">
                Network now. Follow up like you meant it.
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-white/72">
                Scan someone’s LinkedIn QR, save one sharp note, and find them later.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void startScanner()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#F6C453] px-3 py-2.5 text-sm font-bold text-[#061B18] transition hover:bg-[#FFD66E]"
            >
              <QrCode className="h-4 w-4" />
              Scan LinkedIn QR
            </button>
            <button
              type="button"
              onClick={handleManualAdd}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/8 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/14"
            >
              <UserPlus className="h-4 w-4" />
              Add manually
            </button>
            <button
              type="button"
              onClick={() => {
                setMyLinkedInDraft(myLinkedIn?.linkedin_url || "");
                setMyLinkedInFormOpen(true);
                setError(null);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#F6C453]/50 bg-[#F6C453]/12 px-3 py-2.5 text-sm font-bold text-[#FDE68A] transition hover:bg-[#F6C453]/18"
            >
              <QrCode className="h-4 w-4" />
              Add my LinkedIn
            </button>
          </div>

          {scannerActive ? (
            <div className="rounded-3xl border border-white/12 bg-black/30 p-3">
              <div id={readerIdRef.current} className="overflow-hidden rounded-2xl" />
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/14 px-4 py-3 text-sm font-bold text-white/86"
              >
                <X className="h-4 w-4" />
                Stop scanner
              </button>
            </div>
          ) : null}

          {scanError ? (
            <p className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#991B1B]">
              {scanError}
            </p>
          ) : null}
        </div>
      </div>

      {myLinkedIn || myLinkedInFormOpen ? (
        <div className="rounded-[28px] border border-[#DBEAFE] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F766E]">
                Your QR
              </p>
              <h3 className="mt-1 text-base font-bold text-[#0F172A]">
                Add my LinkedIn
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#475569]">
                Let someone scan this and open your LinkedIn on their phone.
              </p>
            </div>
            {myLinkedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMyLinkedInDraft(myLinkedIn.linkedin_url);
                  setMyLinkedInFormOpen((open) => !open);
                }}
                className="rounded-full p-2 text-[#475569] hover:bg-[#F1F5F9]"
                aria-label="Edit my LinkedIn QR"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {myLinkedInFormOpen ? (
            <form onSubmit={handleMyLinkedInSubmit} className="mt-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#334155]">
                My LinkedIn URL
              </label>
              <input
                value={myLinkedInDraft}
                onChange={(event) => setMyLinkedInDraft(event.target.value)}
                placeholder="https://www.linkedin.com/in/your-name"
                className={`${FIELD_CLASS} h-12`}
              />
              <button
                type="submit"
                disabled={savingMyLinkedIn}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 text-sm font-bold text-white transition hover:bg-[#1E293B] disabled:cursor-wait disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {savingMyLinkedIn ? "Saving..." : "Save my LinkedIn QR"}
              </button>
            </form>
          ) : null}

          {myLinkedIn && !myLinkedInFormOpen ? (
            <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-[#F8FAFC] p-3 sm:flex-row sm:items-center">
              <div
                className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-3xl border border-[#E2E8F0] bg-white sm:mx-0 sm:w-44"
                data-testid="my-linkedin-qr-frame"
              >
                {myLinkedInQrUrl ? (
                  <img
                    src={myLinkedInQrUrl}
                    alt="My LinkedIn QR code"
                    className="h-[78%] w-[78%]"
                  />
                ) : (
                  <QrCode className="h-12 w-12 text-[#94A3B8]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0F172A]">
                  {myLinkedIn.display_name || guessDisplayNameFromLinkedIn(myLinkedIn.linkedin_url) || "My LinkedIn"}
                </p>
                <p className="mt-1 break-all text-xs font-semibold text-[#64748B]">
                  {myLinkedIn.linkedin_url}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    Browser.open({ url: myLinkedIn.linkedin_url }).catch(() => {
                      window.open(myLinkedIn.linkedin_url, "_blank", "noopener,noreferrer");
                    })
                  }
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#2563EB]"
                >
                  Open my LinkedIn
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search names, companies, notes, tags"
          className={`${FIELD_CLASS} h-12 pl-11`}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0F172A]">{cardCountLabel}</p>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-xs font-semibold text-[#2563EB]"
          >
            Clear search
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="scroll-mt-[220px] space-y-4 rounded-[28px] border border-[#DBEAFE] bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold text-[#0F172A]">
                {editingCardId ? "Edit saved link" : "Save a LinkedIn link"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#475569]">
                One note is enough. Add names, context, and what they can help with.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingCardId(null);
                setDraft(EMPTY_DRAFT);
              }}
              className="rounded-full p-2 text-[#475569] hover:bg-[#F1F5F9]"
              aria-label="Close My Network form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#334155]">
              LinkedIn URL
            </label>
            <input
              value={draft.linkedin_url}
              onChange={(event) => updateLinkedInUrl(event.target.value)}
              placeholder="https://www.linkedin.com/in/their-name"
              className={`${FIELD_CLASS} h-12`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#334155]">
              Name
            </label>
            <input
              value={draft.display_name}
              onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="Account name"
              className={`${FIELD_CLASS} h-12`}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#334155]">
              Quick note
            </label>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder={QUICK_NOTE_PLACEHOLDER}
              rows={5}
              className={`${FIELD_CLASS} min-h-32 resize-none py-3 font-medium leading-6`}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 text-sm font-bold text-white transition hover:bg-[#1E293B] disabled:cursor-wait disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : editingCardId ? "Save changes" : "Save My Network"}
          </button>
        </form>
      ) : null}

      {cards.length === 0 && !loading ? (
        <div className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#475569]">
          No saved LinkedIn links yet. Scan a QR code or paste a LinkedIn URL after your next conversation.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const displayTags = getCardDisplayTags(card);
            const tagsExpanded = expandedTagCardIds.has(card.id);
            const renderedTags = tagsExpanded ? displayTags : displayTags.slice(0, 2);
            const hiddenTagCount = Math.max(0, displayTags.length - 2);
            return (
              <article
                key={card.id}
                className="rounded-[28px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
              >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-[#0F172A]">
                    {displayNameForCard(card)}
                  </h3>
                  {cardMeta(card) ? (
                    <p className="mt-1 text-sm font-semibold text-[#475569]">
                      {cardMeta(card)}
                    </p>
                  ) : null}
                  {cardContext(card) ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
                      {cardContext(card)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(card)}
                    className="rounded-full p-2 text-[#475569] hover:bg-[#F1F5F9]"
                    aria-label={`Edit ${displayNameForCard(card)}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(card)}
                    disabled={deletingId === card.id}
                    className="rounded-full p-2 text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-50"
                    aria-label={`Delete ${displayNameForCard(card)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#334155]">{cardSummary(card)}</p>

              {displayTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {renderedTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#EEF2FF] px-2 py-1 text-xs font-semibold text-[#4338CA]"
                    >
                      {tag}
                    </span>
                  ))}
                  {hiddenTagCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleCardTags(card.id)}
                      className="rounded-full bg-[#F1F5F9] px-2 py-1 text-xs font-bold text-[#475569] transition hover:bg-[#E2E8F0]"
                      aria-expanded={tagsExpanded}
                      aria-label={`${tagsExpanded ? "Collapse" : "Show"} ${hiddenTagCount} more tags for ${displayNameForCard(card)}`}
                    >
                      {tagsExpanded ? "Show less" : `+${hiddenTagCount}`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  Browser.open({ url: card.linkedin_url }).catch(() => {
                    window.open(card.linkedin_url, "_blank", "noopener,noreferrer");
                  })
                }
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#2563EB]"
              >
                Open LinkedIn
                <ExternalLink className="h-4 w-4" />
              </button>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
