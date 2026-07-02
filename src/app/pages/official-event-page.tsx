import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Share2,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  checkInviteContactsPermission,
  loadInviteContactPhoneEntries,
  requestInviteContactsPermission,
  type InviteContactPhoneEntry,
  type InviteContactsPermissionState,
} from "../lib/contacts";
import {
  createPublicPlan,
  createPublicPlanComment,
  deletePublicPlan,
  deletePublicPlanComment,
  addEventToItinerary,
  fetchOfficialEvent,
  fetchMyItinerary,
  fetchPublicPlanComments,
  fetchPublicPlansForEvent,
  joinPublicPlan,
  leavePublicPlan,
  reportPublicPlanContent,
  removeEventFromItinerary,
  updatePublicPlan,
  type ItineraryEvent,
  type OfficialEvent,
  type PublicPlan,
  type PublicPlanComment,
} from "../lib/api";
import { APP_CONFIG } from "../lib/app-config";
import { buildOfficialEventMapSearch } from "../lib/official-event-map";
import { HOODIE_FEATURED_NAV_GEOMETRY } from "../lib/hoodie-nav-geometry";
import { HoodieShareActions } from "../components/share/hoodie-share-actions";
import {
  buildOfficialEventShareDescriptor,
  buildPublicPlanInviteShareDescriptor,
  buildPublicPlanShareDescriptor,
  type HoodieShareDescriptor,
} from "../lib/hoodie-share";
import { buildPublicPlanInviteLink } from "../lib/public-plan-links";
import {
  getPublicPlanActionGridClass,
  getPublicPlanPersonInitials,
} from "../lib/public-plan-ui";
import { isNativeShell } from "../lib/platform";
import { clearNativeOpenRoute, consumeNativeOpenRouteIfCurrent, isExternalRouteSource } from "../lib/native-open-route";
import { isCuratedSydneyEventSource } from "../lib/curated-sydney-events";

type PlanDraft = {
  title: string;
  note: string;
  meeting_point: string;
  meetup_at: string;
  attendee_cap: string;
};

const MOBILE_PLAN_SHEET_BOTTOM_CLEARANCE_PX =
  HOODIE_FEATURED_NAV_GEOMETRY.footerClearancePx + 12;

const MOBILE_PLAN_SHEET_STYLE = {
  "--plan-sheet-bottom-clearance": `calc(var(--native-safe-area-bottom) + ${MOBILE_PLAN_SHEET_BOTTOM_CLEARANCE_PX}px)`,
  "--plan-sheet-mobile-max-height": `calc(100dvh - var(--native-safe-area-top) - var(--native-safe-area-bottom) - ${MOBILE_PLAN_SHEET_BOTTOM_CLEARANCE_PX}px)`,
} as CSSProperties;

function slugToLabel(value: string) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toLocalDateTimeInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function parseEventTimeToLocalTime(value?: string) {
  const match = String(value || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return "18:00";
  const rawHours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toLowerCase();
  let hours = rawHours % 12;
  if (meridiem === "pm") hours += 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function resolveDefaultMeetupAt(event?: OfficialEvent) {
  const date = event?.upcoming_date || event?.dates?.[0] || "";
  if (!date) return "";
  return `${date}T${parseEventTimeToLocalTime(event?.upcoming_time)}`;
}

function resolveDefaultMeetingPoint(event?: OfficialEvent) {
  return [event?.venue_name, event?.address || event?.suburb]
    .filter(Boolean)
    .join(" · ");
}

function defaultPlanDraft(event?: OfficialEvent): PlanDraft {
  return {
    title: event?.title?.slice(0, 80) || "",
    note: "",
    meeting_point: resolveDefaultMeetingPoint(event),
    meetup_at: resolveDefaultMeetupAt(event),
    attendee_cap: "",
  };
}

function draftFromPlan(plan: PublicPlan): PlanDraft {
  return {
    title: plan.title,
    note: plan.note,
    meeting_point: plan.meeting_point,
    meetup_at: toLocalDateTimeInputValue(plan.meetup_at),
    attendee_cap: plan.attendee_cap != null ? String(plan.attendee_cap) : "",
  };
}

function normalizeInvitePhoneNumber(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

function buildInviteSmsHref(recipients: string[], message: string) {
  const separator =
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)
      ? "?"
      : "&";
  const recipientList = recipients.join(",");
  return `sms:${recipientList}${separator}body=${encodeURIComponent(message)}`;
}

function buildPlanInviteMessage(plan: PublicPlan) {
  const inviteLink = buildPublicPlanInviteLink(
    plan.event_source,
    plan.event_slug,
    plan.id,
  );
  return [
    `Join my ${APP_CONFIG.displayName} plan for ${plan.source_event.title}.`,
    `${plan.title} • ${formatDateTime(plan.meetup_at)}`,
    inviteLink,
  ]
    .filter(Boolean)
    .join("\n");
}

function isInviteCancellationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /cancel/i.test(message);
}

function PlanComposerFields({
  draft,
  onChange,
  readOnlyTitle = false,
  showAttendeeCap = true,
  titleLabel = "Plan title",
  titlePlaceholder = "After-work drinks, gallery visit, coffee first...",
  meetingPointLabel = "Meeting point",
  noteLabel = "Short note",
  notePlaceholder = "What kind of hang, what to bring, how to find you...",
}: {
  draft: PlanDraft;
  onChange: (field: keyof PlanDraft, value: string) => void;
  readOnlyTitle?: boolean;
  showAttendeeCap?: boolean;
  titleLabel?: string;
  titlePlaceholder?: string;
  meetingPointLabel?: string;
  noteLabel?: string;
  notePlaceholder?: string;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
          {titleLabel}
        </label>
        <input
          value={draft.title}
          readOnly={readOnlyTitle}
          onChange={(event) => onChange("title", event.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0F172A] outline-none ${
            readOnlyTitle
              ? "border-[#E2E8F0] bg-[#F8FAFC]"
              : "border-[#CBD5E1] bg-white focus:border-[#0F766E]"
          }`}
          placeholder={titlePlaceholder}
        />
      </div>
      <div className={`grid gap-3 ${showAttendeeCap ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
            Meetup time
          </label>
          <input
            type="datetime-local"
            value={draft.meetup_at}
            onChange={(event) => onChange("meetup_at", event.target.value)}
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
          />
        </div>
        {showAttendeeCap ? (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              Attendee cap
            </label>
            <input
              type="number"
              min={2}
              max={100}
              value={draft.attendee_cap}
              onChange={(event) => onChange("attendee_cap", event.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
              placeholder="Optional"
            />
          </div>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
          {meetingPointLabel}
        </label>
        <input
          value={draft.meeting_point}
          onChange={(event) => onChange("meeting_point", event.target.value)}
          className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
          placeholder="Front entrance, box office, cafe inside..."
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
          {noteLabel}
        </label>
        <textarea
          value={draft.note}
          onChange={(event) => onChange("note", event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
          placeholder={notePlaceholder}
        />
      </div>
    </div>
  );
}

function PlanComposerActions({
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
  className = "mt-4 flex flex-wrap gap-2",
}: {
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="rounded-lg bg-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={submitting}
        className="rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  );
}

function PlanComposerSheet({
  open,
  title,
  subtitle,
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
  readOnlyTitle = false,
  showAttendeeCap = true,
  titleLabel = "Plan title",
  meetingPointLabel = "Meeting point",
  noteLabel = "Short note",
  notePlaceholder = "What kind of hang, what to bring, how to find you...",
}: {
  open: boolean;
  title: string;
  subtitle: string;
  draft: PlanDraft;
  onChange: (field: keyof PlanDraft, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
  readOnlyTitle?: boolean;
  showAttendeeCap?: boolean;
  titleLabel?: string;
  meetingPointLabel?: string;
  noteLabel?: string;
  notePlaceholder?: string;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[2100] bg-[rgba(15,23,42,0.38)]"
        onClick={onCancel}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[2101] mx-auto w-full max-w-2xl px-3 pb-[var(--plan-sheet-bottom-clearance)] pt-3 md:inset-0 md:flex md:items-center md:justify-center md:px-6 md:pb-6 md:pt-6"
        style={MOBILE_PLAN_SHEET_STYLE}
      >
        <div
          data-testid="plan-composer-sheet"
          className="flex max-h-[var(--plan-sheet-mobile-max-height)] w-full flex-col overflow-hidden rounded-[28px] border border-[#D9E4DC] bg-white shadow-2xl shadow-[#0F172A]/20 md:max-h-[calc(100dvh-var(--native-safe-area-top)-48px)] md:max-w-2xl md:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 md:px-6">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
              <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
            </div>
            <button
              onClick={onCancel}
              className="rounded-lg border border-[#CBD5E1] p-2 text-[#64748B] transition hover:bg-[#F8FAFC]"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <PlanComposerFields
              draft={draft}
              onChange={onChange}
              readOnlyTitle={readOnlyTitle}
              showAttendeeCap={showAttendeeCap}
              titleLabel={titleLabel}
              meetingPointLabel={meetingPointLabel}
              noteLabel={noteLabel}
              notePlaceholder={notePlaceholder}
            />
          </div>
          <PlanComposerActions
            onSubmit={onSubmit}
            onCancel={onCancel}
            submitLabel={submitLabel}
            submitting={submitting}
            className="border-t border-[#E2E8F0] bg-white/95 px-4 py-4 backdrop-blur md:px-6"
          />
        </div>
      </div>
    </>
  );
}

function PlanInviteSheet({
  open,
  plan,
  shareDescriptor,
  phoneInput,
  phones,
  contactPermission,
  contactEntries,
  contactsLoading,
  contactQuery,
  onPhoneInputChange,
  onAddPhone,
  onToggleContactPhone,
  onContactQueryChange,
  onRequestContacts,
  onRemovePhone,
  onOpenSms,
  onSystemShare,
  onCopy,
  onClose,
  smsSupported,
  contactPickerSupported,
}: {
  open: boolean;
  plan: PublicPlan | null;
  shareDescriptor: HoodieShareDescriptor | null;
  phoneInput: string;
  phones: string[];
  contactPermission: InviteContactsPermissionState;
  contactEntries: InviteContactPhoneEntry[];
  contactsLoading: boolean;
  contactQuery: string;
  onPhoneInputChange: (value: string) => void;
  onAddPhone: () => void;
  onToggleContactPhone: (phone: string) => void;
  onContactQueryChange: (value: string) => void;
  onRequestContacts: () => void;
  onRemovePhone: (phone: string) => void;
  onOpenSms: () => void;
  onSystemShare: () => void;
  onCopy: () => void;
  onClose: () => void;
  smsSupported: boolean;
  contactPickerSupported: boolean;
}) {
  if (!open || !plan) return null;
  const hasBannerShare = Boolean(shareDescriptor);
  const inviteActionCount =
    (smsSupported ? 1 : 0) + (hasBannerShare ? 1 : 0) + 3;
  const contactsGranted =
    contactPermission === "granted" || contactPermission === "limited";

  return (
    <>
      <div
        className="fixed inset-0 z-[2100] bg-[rgba(15,23,42,0.38)]"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[2101] mx-auto w-full max-w-2xl px-3 pb-[var(--plan-sheet-bottom-clearance)] pt-3 md:inset-0 md:flex md:items-center md:justify-center md:px-6 md:pb-6 md:pt-6"
        style={MOBILE_PLAN_SHEET_STYLE}
      >
        <div
          data-testid="plan-invite-sheet"
          className="flex max-h-[var(--plan-sheet-mobile-max-height)] w-full flex-col overflow-hidden rounded-[28px] border border-[#D9E4DC] bg-white shadow-2xl shadow-[#0F172A]/20 md:max-h-[calc(100dvh-var(--native-safe-area-top)-48px)] md:max-w-2xl md:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 md:px-6">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Invite Friends
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Share this exact plan by text, share sheet, or copy link.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#CBD5E1] p-2 text-[#64748B] transition hover:bg-[#F8FAFC]"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                Plan
              </p>
              <p className="mt-2 text-base font-bold text-[#0F172A]">
                {plan.title}
              </p>
              <p className="mt-1 text-sm text-[#475569]">
                {plan.source_event.title}
              </p>
              <p className="mt-2 text-sm text-[#64748B]">
                {formatDateTime(plan.meetup_at)}
              </p>
            </div>

            <div className="mt-4">
              {contactPickerSupported ? (
                <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                        Contacts
                      </p>
                      <p className="mt-1 text-sm text-[#475569]">
                        {contactsGranted
                          ? "Select one or more people to add them to the invite."
                          : "Allow contacts to pull phone numbers in automatically."}
                      </p>
                    </div>
                    {!contactsGranted ? (
                      <button
                        type="button"
                        onClick={onRequestContacts}
                        className="shrink-0 rounded-lg border border-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                      >
                        Add Contacts
                      </button>
                    ) : null}
                  </div>

                  {contactsGranted ? (
                    <div className="mt-4">
                      <input
                        value={contactQuery}
                        onChange={(event) =>
                          onContactQueryChange(event.target.value)
                        }
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                        placeholder="Search contacts"
                      />
                      <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white">
                        {contactsLoading ? (
                          <div className="px-4 py-6 text-sm text-[#64748B]">
                            Loading contacts…
                          </div>
                        ) : contactEntries.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-[#64748B]">
                            No phone numbers found in contacts yet.
                          </div>
                        ) : (
                          contactEntries.map((entry) => {
                            const normalizedPhone = normalizeInvitePhoneNumber(
                              entry.phoneNumber,
                            );
                            const selected = normalizedPhone
                              ? phones.includes(normalizedPhone)
                              : false;
                            return (
                              <button
                                key={entry.contactId}
                                type="button"
                                onClick={() =>
                                  onToggleContactPhone(entry.phoneNumber)
                                }
                                className="flex w-full items-center justify-between gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F8FAFC]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#0F172A]">
                                    {entry.displayName}
                                  </p>
                                  <p className="truncate text-xs text-[#64748B]">
                                    {entry.phoneNumber}
                                    {entry.label ? ` · ${entry.label}` : ""}
                                  </p>
                                </div>
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    selected
                                      ? "border-[#0F766E] bg-[#0F766E] text-white"
                                      : "border-[#CBD5E1] bg-white text-transparent"
                                  }`}
                                >
                                  <Check
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.2}
                                  />
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#64748B]">
                      No contacts permission yet. You can still add numbers
                      manually below.
                    </p>
                  )}
                </div>
              ) : null}

              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Phone numbers
              </label>
              <div className="flex gap-2">
                <input
                  value={phoneInput}
                  onChange={(event) => onPhoneInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      onAddPhone();
                    }
                  }}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                  placeholder="+61 4xx xxx xxx"
                />
                <button
                  type="button"
                  onClick={onAddPhone}
                  className="shrink-0 rounded-lg border border-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                >
                  Add
                </button>
              </div>
              {phones.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {phones.map((phone) => (
                    <span
                      key={phone}
                      className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#4338CA]"
                    >
                      {phone}
                      <button
                        type="button"
                        onClick={() => onRemovePhone(phone)}
                        className="text-[#6366F1] transition hover:text-[#312E81]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.9} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#64748B]">
                  Add one or more numbers to open a prefilled SMS composer.
                </p>
              )}
            </div>
          </div>

          <div
            className={`grid gap-2 border-t border-[#E2E8F0] bg-white/95 px-4 py-4 backdrop-blur md:px-6 ${getPublicPlanActionGridClass(inviteActionCount)}`}
          >
            {smsSupported ? (
              <button
                type="button"
                onClick={onOpenSms}
                disabled={phones.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" strokeWidth={1.7} />
                Open SMS
              </button>
            ) : null}
            {shareDescriptor ? (
              <HoodieShareActions
                descriptor={shareDescriptor}
                variant="invite"
                showGenericAction={false}
                className="w-full [&>div:first-child]:w-full [&>div:first-child>button]:w-full [&>div:first-child>button]:justify-center"
              />
            ) : null}
            <button
              type="button"
              onClick={onSystemShare}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.7} />
              System Share
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
            >
              <Copy className="h-4 w-4" strokeWidth={1.7} />
              Copy Invite
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC] ${
                inviteActionCount >= 4 ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function OfficialEventPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSetuChina = APP_CONFIG.variant === "setu_china";
  const usesDashboardHome = isSetuChina || APP_CONFIG.variant === "jom_settle";
  const email = localStorage.getItem("ghar_email") || "";
  const source = params.source || "";
  const slug = params.slug || "";

  const [event, setEvent] = useState<OfficialEvent | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [commentsByPlan, setCommentsByPlan] = useState<
    Record<string, PublicPlanComment[]>
  >({});
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>(
    {},
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itinerarySubmitting, setItinerarySubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(
    searchParams.get("compose") === "1",
  );
  const [createDraft, setCreateDraft] = useState<PlanDraft>(defaultPlanDraft());
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanDraft>(defaultPlanDraft());
  const [plansView, setPlansView] = useState<"public" | "my">("public");
  const [invitePlan, setInvitePlan] = useState<PublicPlan | null>(null);
  const [invitePhoneInput, setInvitePhoneInput] = useState("");
  const [invitePhones, setInvitePhones] = useState<string[]>([]);
  const [inviteContactsPermission, setInviteContactsPermission] =
    useState<InviteContactsPermissionState>("unavailable");
  const [inviteContacts, setInviteContacts] = useState<
    InviteContactPhoneEntry[]
  >([]);
  const [inviteContactsLoading, setInviteContactsLoading] = useState(false);
  const [inviteContactQuery, setInviteContactQuery] = useState("");
  const [focusedPlanId, setFocusedPlanId] = useState<string | null>(null);
  const planRefs = useRef<Record<string, HTMLElement | null>>({});
  const handledPlanFocusRef = useRef<string>("");
  const handledInvitePlanRef = useRef<string>("");
  const targetedPlanId = searchParams.get("plan") || "";
  const inviteRequested = searchParams.get("invite") === "1";
  const smsSupported =
    typeof navigator !== "undefined" &&
    (isNativeShell() || /iphone|ipad|ipod|android/i.test(navigator.userAgent));
  const contactPickerSupported = isNativeShell();
  const plansSupported = !isCuratedSydneyEventSource(event?.source || source);
  const itineraryEventMatch = useMemo(() => {
    if (!event) return null;
    return (
      itineraryEvents.find(
        (item) =>
          item.event_source === event.source && item.event_slug === event.slug,
      ) || null
    );
  }, [event, itineraryEvents]);
  const isAttendingEvent = Boolean(itineraryEventMatch);

  const signedInCopy = !plansSupported
    ? "Public plans are not available for this external event listing yet."
    : email
      ? null
      : `Sign in with your ${APP_CONFIG.displayName} profile to make a plan, join one, or post in the public thread.`;
  const setPageSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          nextParams.delete(key);
          return;
        }
        nextParams.set(key, value);
      });
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const refreshPlans = useCallback(async () => {
    if (!source || !slug) return;
    setPlansLoading(true);
    try {
      const nextPlans = await fetchPublicPlansForEvent({
        eventSource: source,
        eventSlug: slug,
        viewerEmail: email,
      });
      setPlans(nextPlans);
      return nextPlans;
    } finally {
      setPlansLoading(false);
    }
  }, [email, slug, source]);

  const loadComments = useCallback(
    async (planId: string, force = false) => {
      if (!force && commentsByPlan[planId]) return;
      const comments = await fetchPublicPlanComments(planId, email);
      setCommentsByPlan((current) => ({ ...current, [planId]: comments }));
    },
    [commentsByPlan, email],
  );

  useEffect(() => {
    if (!APP_CONFIG.showOfficialEventsFeature) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchOfficialEvent(source, slug)
      .then(async (eventData) => {
        if (cancelled) return;
        setEvent(eventData);
        setCreateDraft(defaultPlanDraft(eventData));

        try {
          const planData = await fetchPublicPlansForEvent({
            eventSource: source,
            eventSlug: slug,
            viewerEmail: email,
          });
          if (cancelled) return;
          setPlans(planData);
        } catch (plansError) {
          console.warn("GHAR OfficialEventPage plans load error:", plansError);
          if (cancelled) return;
          setPlans([]);
        }
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("GHAR OfficialEventPage load error:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load the official event",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, slug, source]);

  useEffect(() => {
    if (!email || !event) {
      setItineraryEvents([]);
      setItineraryLoading(false);
      return;
    }

    let cancelled = false;
    setItineraryLoading(true);
    fetchMyItinerary({ email, appVariant: APP_CONFIG.variant })
      .then((items) => {
        if (cancelled) return;
        setItineraryEvents(items);
      })
      .catch((itineraryError) => {
        if (cancelled) return;
        console.warn("GHAR OfficialEventPage itinerary load error:", itineraryError);
        setItineraryEvents([]);
      })
      .finally(() => {
        if (!cancelled) setItineraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, event]);

  useEffect(() => {
    if (!event || !source || !slug) return;
    if (event.source === source && event.slug === slug) return;
    const search = searchParams.toString();
    navigate(
      `/events/${encodeURIComponent(event.source)}/${encodeURIComponent(event.slug)}${search ? `?${search}` : ""}`,
      { replace: true },
    );
  }, [event, navigate, searchParams, slug, source]);

  useEffect(() => {
    setShowComposer(plansSupported && searchParams.get("compose") === "1");
  }, [plansSupported, searchParams]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    if (!invitePlan) {
      setInviteContacts([]);
      setInviteContactsLoading(false);
      setInviteContactsPermission(
        contactPickerSupported ? "prompt" : "unavailable",
      );
      return;
    }
    if (!contactPickerSupported) {
      setInviteContactsPermission("unavailable");
      setInviteContacts([]);
      setInviteContactsLoading(false);
      return;
    }

    let cancelled = false;

    const hydrateInviteContacts = async () => {
      try {
        const permission = await checkInviteContactsPermission();
        if (cancelled) return;
        setInviteContactsPermission(permission);

        if (permission !== "granted" && permission !== "limited") {
          setInviteContacts([]);
          setInviteContactsLoading(false);
          return;
        }

        setInviteContactsLoading(true);
        const entries = await loadInviteContactPhoneEntries();
        if (cancelled) return;
        setInviteContacts(entries);
      } catch (contactError) {
        if (cancelled) return;
        console.error("GHAR invite contacts load error:", contactError);
        setInviteContacts([]);
      } finally {
        if (!cancelled) setInviteContactsLoading(false);
      }
    };

    void hydrateInviteContacts();

    return () => {
      cancelled = true;
    };
  }, [contactPickerSupported, invitePlan]);

  const eventMeta = useMemo(() => {
    if (!event) return [];
    return [
      event.dates_humanized ||
        (event.upcoming_date
          ? formatDateTime(`${event.upcoming_date}T10:00`)
          : ""),
      [event.venue_name, event.suburb].filter(Boolean).join(" · "),
    ].filter(Boolean);
  }, [event]);
  const eventMapSearch = useMemo(
    () =>
      buildOfficialEventMapSearch(event, {
        returnRoute: `${location.pathname}${location.search}`,
      }),
    [event, location.pathname, location.search],
  );
  const editingPlan = useMemo(
    () => plans.find((plan) => plan.id === editingPlanId) || null,
    [editingPlanId, plans],
  );
  const myPlans = useMemo(
    () => plans.filter((plan) => plan.is_creator || plan.viewer_joined),
    [plans],
  );
  const shareEnabled = Boolean(APP_CONFIG.shareBaseUrl);
  const visiblePlans = plansView === "my" ? myPlans : plans;
  const showComposerSheet =
    plansSupported && (showComposer || Boolean(editingPlan));
  const filteredInviteContacts = useMemo(() => {
    const query = inviteContactQuery.trim().toLowerCase();
    if (!query) return inviteContacts;
    return inviteContacts.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(query) ||
        entry.phoneNumber.toLowerCase().includes(query),
    );
  }, [inviteContactQuery, inviteContacts]);
  const inviteBannerDescriptor = useMemo(
    () =>
      invitePlan ? buildPublicPlanInviteShareDescriptor(invitePlan) : null,
    [invitePlan],
  );

  const handleBack = () => {
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    if (isExternalRouteSource(searchParams.get("source")) || consumeNativeOpenRouteIfCurrent(currentRoute)) {
      clearNativeOpenRoute();
      navigate("/dashboard", { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleOpenEventMap = useCallback(() => {
    if (!eventMapSearch) return;
    navigate(usesDashboardHome ? "/dashboard?view=map" : "/dashboard", {
      state: {
        hoodienieMapSearch: eventMapSearch,
      },
    });
  }, [eventMapSearch, navigate, usesDashboardHome]);

  const updateCreateDraft = (field: keyof PlanDraft, value: string) => {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  };

  const updateEditDraft = (field: keyof PlanDraft, value: string) => {
    setEditDraft((current) => ({ ...current, [field]: value }));
  };

  const focusPlan = useCallback(
    (planId: string, view: "public" | "my" = "public") => {
      if (!planId) return;
      handledPlanFocusRef.current = "";
      setPlansView(view);
      setFocusedPlanId(planId);
      setExpandedPlans((current) =>
        current[planId] ? current : { ...current, [planId]: true },
      );
      setPageSearchParams({
        compose: null,
        plan: planId,
      });
    },
    [setPageSearchParams],
  );

  const openInviteSheet = useCallback(
    (plan: PublicPlan) => {
      setInvitePlan(plan);
      setInvitePhoneInput("");
      setInvitePhones([]);
      setInviteContactQuery("");
      focusPlan(plan.id, "my");
    },
    [focusPlan],
  );

  const closeInviteSheet = useCallback(() => {
    setInvitePlan(null);
    setInvitePhoneInput("");
    setInvitePhones([]);
    setInviteContactQuery("");
  }, []);

  const openCreateComposer = useCallback(() => {
    if (!plansSupported) return;
    setCreateDraft(defaultPlanDraft(event || undefined));
    setEditingPlanId(null);
    setShowComposer(true);
    setInvitePlan(null);
    setPageSearchParams({ compose: "1" });
  }, [event, plansSupported, setPageSearchParams]);

  const handleToggleItineraryAttendance = useCallback(async () => {
    if (!event || !email) return;
    setItinerarySubmitting(true);
    setError(null);
    try {
      if (itineraryEventMatch) {
        await removeEventFromItinerary({
          email,
          eventSource: event.source,
          eventSlug: event.slug,
          appVariant: APP_CONFIG.variant,
        });
        setItineraryEvents((current) =>
          current.filter(
            (item) =>
              !(item.event_source === event.source && item.event_slug === event.slug),
          ),
        );
        setActionMessage("Removed from My Itinerary.");
      } else {
        const added = await addEventToItinerary({
          email,
          event,
          appVariant: APP_CONFIG.variant,
        });
        setItineraryEvents((current) => [
          ...current.filter((item) => item.event_key !== added.event_key),
          added,
        ]);
        setActionMessage("Added to My Itinerary.");
      }
    } catch (itineraryError) {
      console.error("GHAR itinerary attendance error:", itineraryError);
      setError(
        itineraryError instanceof Error
          ? itineraryError.message
          : "Failed to update your itinerary",
      );
    } finally {
      setItinerarySubmitting(false);
    }
  }, [email, event, itineraryEventMatch]);

  const closeComposerSheet = useCallback(() => {
    setShowComposer(false);
    setEditingPlanId(null);
    setCreateDraft(defaultPlanDraft(event || undefined));
    setPageSearchParams({ compose: null });
  }, [event, setPageSearchParams]);

  const handleCreatePlan = async () => {
    if (!event || !email || !plansSupported) return;
    setSubmitting(true);
    setError(null);
    try {
      const createdPlan = await createPublicPlan({
        email,
        event_source: event.source,
        event_slug: event.slug,
        title: event.title.slice(0, 80),
        note: createDraft.note,
        meeting_point: createDraft.meeting_point,
        meetup_at: createDraft.meetup_at,
        attendee_cap: null,
      });
      const nextPlans = await refreshPlans();
      const resolvedPlan =
        nextPlans?.find((plan) => plan.id === createdPlan.id) || createdPlan;
      setCreateDraft(defaultPlanDraft(event));
      closeComposerSheet();
      openInviteSheet(resolvedPlan);
      setActionMessage("Plan created. Invite friends next.");
    } catch (submitError) {
      console.error("GHAR handleCreatePlan error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create plan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEditingPlan = (plan: PublicPlan) => {
    setShowComposer(false);
    setInvitePlan(null);
    setPageSearchParams({ compose: null });
    setEditingPlanId(plan.id);
    setEditDraft(draftFromPlan(plan));
  };

  const handleSavePlanEdit = async (plan: PublicPlan) => {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      await updatePublicPlan(plan.id, {
        email,
        title: editDraft.title,
        note: editDraft.note,
        meeting_point: editDraft.meeting_point,
        meetup_at: editDraft.meetup_at,
        attendee_cap: editDraft.attendee_cap
          ? Number(editDraft.attendee_cap)
          : null,
      });
      await refreshPlans();
      closeComposerSheet();
      setActionMessage("Plan updated.");
    } catch (submitError) {
      console.error("GHAR handleSavePlanEdit error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update plan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan: PublicPlan) => {
    if (
      !email ||
      !window.confirm(
        "Delete this plan permanently? This removes the plan, attendees, and comments.",
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deletePublicPlan(plan.id, email);
      if (invitePlan?.id === plan.id) {
        closeInviteSheet();
      }
      if (editingPlanId === plan.id) {
        closeComposerSheet();
      }
      await refreshPlans();
      if (targetedPlanId === plan.id) {
        setPageSearchParams({ plan: null, invite: null, compose: null });
      }
      setActionMessage("Plan deleted.");
    } catch (submitError) {
      console.error("GHAR handleDeletePlan error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to delete plan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinLeave = async (plan: PublicPlan) => {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    try {
      if (plan.viewer_joined && plan.can_leave) {
        await leavePublicPlan(plan.id, email);
        setActionMessage("You left the plan.");
      } else {
        await joinPublicPlan(plan.id, email);
        setActionMessage("You joined the plan.");
      }
      await refreshPlans();
    } catch (submitError) {
      console.error("GHAR handleJoinLeave error:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update attendance",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInvitePhone = () => {
    const normalizedPhone = normalizeInvitePhoneNumber(invitePhoneInput);
    if (!normalizedPhone) {
      setError("Add a valid phone number to send an invite.");
      return;
    }
    setError(null);
    setInvitePhones((current) =>
      current.includes(normalizedPhone)
        ? current
        : [...current, normalizedPhone],
    );
    setInvitePhoneInput("");
  };

  const handleRemoveInvitePhone = (phone: string) => {
    setInvitePhones((current) => current.filter((value) => value !== phone));
  };

  const handleToggleInviteContactPhone = (phone: string) => {
    const normalizedPhone = normalizeInvitePhoneNumber(phone);
    if (!normalizedPhone) return;
    setInvitePhones((current) =>
      current.includes(normalizedPhone)
        ? current.filter((value) => value !== normalizedPhone)
        : [...current, normalizedPhone],
    );
  };

  const handleRequestInviteContacts = async () => {
    if (!contactPickerSupported) return;
    setError(null);
    setInviteContactsLoading(true);
    try {
      const permission = await requestInviteContactsPermission();
      setInviteContactsPermission(permission);
      if (permission !== "granted" && permission !== "limited") {
        setInviteContacts([]);
        return;
      }
      const entries = await loadInviteContactPhoneEntries();
      setInviteContacts(entries);
      setActionMessage(
        entries.length > 0
          ? "Contacts ready to invite."
          : "Contacts allowed. Add a number manually if needed.",
      );
    } catch (contactError) {
      if (isInviteCancellationError(contactError)) return;
      console.error("GHAR request invite contacts error:", contactError);
      setError(
        contactError instanceof Error
          ? contactError.message
          : "Unable to load contacts right now.",
      );
    } finally {
      setInviteContactsLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!invitePlan) return;
    const inviteMessage = buildPlanInviteMessage(invitePlan);
    try {
      await navigator.clipboard.writeText(inviteMessage);
      focusPlan(invitePlan.id, "my");
      closeInviteSheet();
      setActionMessage("Invite copied.");
    } catch (copyError) {
      console.error("GHAR invite copy error:", copyError);
      setError("Failed to copy the invite. Please try again.");
    }
  };

  const handleShareInvite = async () => {
    if (!invitePlan) return;
    const inviteMessage = buildPlanInviteMessage(invitePlan);
    try {
      if (isNativeShell()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: `Invite friends to ${invitePlan.title}`,
          text: inviteMessage,
          dialogTitle: "Share invite",
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Invite friends to ${invitePlan.title}`,
          text: inviteMessage,
          url: buildPublicPlanInviteLink(
            invitePlan.event_source,
            invitePlan.event_slug,
            invitePlan.id,
          ),
        });
      } else {
        await handleCopyInvite();
        return;
      }
      focusPlan(invitePlan.id, "my");
      closeInviteSheet();
      setActionMessage("Invite ready to share.");
    } catch (shareError) {
      console.error("GHAR invite share error:", shareError);
      setError("Failed to share the invite. Please try again.");
    }
  };

  const handleOpenInviteSms = () => {
    if (!invitePlan) return;
    if (invitePhones.length === 0) {
      setError("Add at least one phone number to open SMS.");
      return;
    }
    setError(null);
    const inviteMessage = buildPlanInviteMessage(invitePlan);
    focusPlan(invitePlan.id, "my");
    closeInviteSheet();
    window.location.href = buildInviteSmsHref(invitePhones, inviteMessage);
  };

  const handleToggleComments = async (planId: string) => {
    setExpandedPlans((current) => ({ ...current, [planId]: !current[planId] }));
    if (!expandedPlans[planId]) {
      try {
        await loadComments(planId);
      } catch (commentError) {
        console.error("GHAR loadComments error:", commentError);
        setError(
          commentError instanceof Error
            ? commentError.message
            : "Failed to load comments",
        );
      }
    }
  };

  const handleCommentSubmit = async (planId: string) => {
    if (!email) return;
    const body = (commentDrafts[planId] || "").trim();
    if (!body) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPublicPlanComment(planId, { email, body });
      setCommentDrafts((current) => ({ ...current, [planId]: "" }));
      await Promise.all([refreshPlans(), loadComments(planId, true)]);
      setActionMessage("Comment posted.");
    } catch (commentError) {
      console.error("GHAR handleCommentSubmit error:", commentError);
      setError(
        commentError instanceof Error
          ? commentError.message
          : "Failed to post comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (planId: string, commentId: string) => {
    if (!email || !window.confirm("Delete this comment?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await deletePublicPlanComment(planId, commentId, email);
      await Promise.all([refreshPlans(), loadComments(planId, true)]);
      setActionMessage("Comment deleted.");
    } catch (commentError) {
      console.error("GHAR handleDeleteComment error:", commentError);
      setError(
        commentError instanceof Error
          ? commentError.message
          : "Failed to delete comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (
    targetType: "plan" | "comment",
    planId: string,
    commentId?: string,
  ) => {
    if (!email) return;
    const reason = window.prompt("What should moderation know?");
    if (!reason || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportPublicPlanContent({
        email,
        target_type: targetType,
        plan_id: planId,
        comment_id: commentId,
        reason,
      });
      setActionMessage("Report sent.");
    } catch (reportError) {
      console.error("GHAR handleReport error:", reportError);
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Failed to send report",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      !targetedPlanId ||
      loading ||
      plansLoading ||
      plans.length === 0 ||
      handledPlanFocusRef.current === targetedPlanId
    ) {
      return;
    }
    const hasMatch = plans.some((plan) => plan.id === targetedPlanId);
    if (!hasMatch) return;

    handledPlanFocusRef.current = targetedPlanId;
    setFocusedPlanId(targetedPlanId);
    setExpandedPlans((current) =>
      current[targetedPlanId]
        ? current
        : { ...current, [targetedPlanId]: true },
    );
    void loadComments(targetedPlanId).catch((commentError) => {
      console.error("GHAR targeted plan comment load error:", commentError);
    });

    const frame = window.requestAnimationFrame(() => {
      planRefs.current[targetedPlanId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    const timeout = window.setTimeout(
      () =>
        setFocusedPlanId((current) =>
          current === targetedPlanId ? null : current,
        ),
      2800,
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [loadComments, loading, plans, plansLoading, targetedPlanId]);

  useEffect(() => {
    if (!inviteRequested) {
      handledInvitePlanRef.current = "";
      return;
    }
    if (!targetedPlanId || loading || plansLoading) return;
    if (handledInvitePlanRef.current === targetedPlanId) return;

    const match = plans.find((plan) => plan.id === targetedPlanId);
    if (!match) {
      handledInvitePlanRef.current = targetedPlanId;
      setPageSearchParams({ invite: null, plan: null });
      setActionMessage("That plan is no longer available.");
      return;
    }
    if (!match.is_creator) {
      handledInvitePlanRef.current = targetedPlanId;
      setPageSearchParams({ invite: null });
      return;
    }

    handledInvitePlanRef.current = targetedPlanId;
    openInviteSheet(match);
    setPageSearchParams({ invite: null });
  }, [
    inviteRequested,
    loading,
    openInviteSheet,
    plans,
    plansLoading,
    setPageSearchParams,
    targetedPlanId,
  ]);

  if (!APP_CONFIG.showOfficialEventsFeature) {
    return (
      <div className={`${usesDashboardHome ? "flex h-full w-full" : "mx-auto flex h-full max-w-3xl"} items-center justify-center px-6 py-10`}>
        <div className="w-full max-w-lg rounded-lg border border-[#E2E8F0] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#0F172A]">
            Official events and public plans are not enabled in this app
            configuration.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className={`${usesDashboardHome ? "w-full max-w-none" : "mx-auto w-full max-w-5xl"} shrink-0 px-4 pb-3 pt-4 md:px-6`}>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
            Back
          </button>
          {actionMessage ? (
            <p className="text-xs font-medium text-[#0F766E]">
              {actionMessage}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className={`${usesDashboardHome ? "w-full max-w-none" : "mx-auto w-full max-w-5xl"} px-4 pb-[calc(var(--native-safe-area-bottom)+6rem)] md:px-6 md:pb-14`}>
          {loading ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">
              Loading official event…
            </div>
          ) : error && !event ? (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
              {error}
            </div>
          ) : event ? (
            <>
              <section className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                {event.hero_image_url || event.image_url ? (
                  <img
                    src={event.hero_image_url || event.image_url}
                    alt={event.title}
                    className="h-64 w-full object-cover md:h-80"
                  />
                ) : null}
                <div className="p-5 md:p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#E0F2FE] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#075985]">
                      {event.source_label}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${event.free_event ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}
                    >
                      {event.free_event ? "Free event" : "Ticketed"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#0F172A] md:text-3xl">
                    {event.title}
                  </h1>
                  {event.summary ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475569]">
                      {event.summary}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-2 text-sm text-[#475569]">
                    {eventMeta.map((line) => (
                      <div key={line} className="flex items-start gap-2">
                        <CalendarDays
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                          strokeWidth={1.7}
                        />
                        <span>{line}</span>
                      </div>
                    ))}
                    {event.address ? (
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                          strokeWidth={1.7}
                        />
                        <span>{event.address}</span>
                      </div>
                    ) : null}
                  </div>
                  {event.description ? (
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-[#334155]">
                      {event.description}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {event.booking_url ? (
                      <button
                        onClick={() =>
                          window.open(
                            event.booking_url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59]"
                      >
                        <Ticket className="h-4 w-4" strokeWidth={1.7} />
                        Book
                      </button>
                    ) : null}
                    <button
                      onClick={handleToggleItineraryAttendance}
                      disabled={!email || itineraryLoading || itinerarySubmitting}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isAttendingEvent
                          ? "border border-[#0F766E] bg-[#F0FDFA] text-[#0F766E] hover:bg-[#CCFBF1]"
                          : email
                            ? "bg-[#0F766E] text-white hover:bg-[#115E59]"
                            : "border border-[#CBD5E1] text-[#64748B]"
                      }`}
                    >
                      <Check className="h-4 w-4" strokeWidth={1.7} />
                      {!email
                        ? "Sign in to attend"
                        : itineraryLoading || itinerarySubmitting
                          ? "Updating..."
                          : isAttendingEvent
                            ? "Attending"
                            : "Attend"}
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          event.source_url,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={1.7} />
                      Visit Event Page
                    </button>
                    {eventMapSearch ? (
                      <button
                        onClick={handleOpenEventMap}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                      >
                        <Navigation className="h-4 w-4" strokeWidth={1.7} />
                        View on map
                      </button>
                    ) : null}
                    {plansSupported ? (
                      <button
                        onClick={openCreateComposer}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#0F766E] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                      >
                        <Users className="h-4 w-4" strokeWidth={1.7} />
                        Make plan
                      </button>
                    ) : null}
                  </div>
                  {shareEnabled ? (
                    <HoodieShareActions
                      descriptor={buildOfficialEventShareDescriptor(event)}
                      className="mt-4"
                      variant="invite"
                    />
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-md bg-[#F1F5F9] px-2 py-1 text-[11px] font-medium text-[#475569]"
                      >
                        {slugToLabel(category)}
                      </span>
                    ))}
                    {event.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium text-[#4338CA]"
                      >
                        {slugToLabel(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {signedInCopy ? (
                <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                  {signedInCopy}
                </div>
              ) : null}
              {error ? (
                <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                  {error}
                </div>
              ) : null}

              {plansSupported ? (
                <section className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Plans</h2>
                    <p className="text-sm text-[#64748B]">
                      Start one, invite friends, or jump into an existing
                      thread.
                    </p>
                  </div>
                  {plansLoading ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
                      Refreshing…
                    </span>
                  ) : null}
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
                  {[
                    { id: "public" as const, label: "Public Plans" },
                    { id: "my" as const, label: "My Plans" },
                  ].map((tab) => {
                    const active = plansView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPlansView(tab.id)}
                        className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
                          active
                            ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                            : "text-[#64748B] hover:text-[#0F172A]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {plansView === "my" && !email ? (
                  <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
                    Sign in with your {APP_CONFIG.displayName} profile to see
                    the plans you created or joined.
                  </div>
                ) : visiblePlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white p-6 text-sm text-[#64748B]">
                    {plansView === "my"
                      ? "You haven't created or joined a plan for this event yet."
                      : "No public plans yet for this event. Start the first one."}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {visiblePlans.map((plan) => {
                      const comments = commentsByPlan[plan.id] || [];
                      const showComments = Boolean(expandedPlans[plan.id]);
                      const creatorActionCount =
                        2 +
                        (plan.can_leave || plan.can_join ? 1 : 0) +
                        (plan.can_delete ? 1 : 0);
                      return (
                        <article
                          key={plan.id}
                          ref={(node) => {
                            planRefs.current[plan.id] = node;
                          }}
                          className={`rounded-lg border bg-white p-4 transition-shadow md:p-5 ${
                            focusedPlanId === plan.id
                              ? "border-[#0F766E] ring-2 ring-[#99F6E4] shadow-[0_18px_45px_rgba(15,118,110,0.14)]"
                              : "border-[#E2E8F0]"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-[#0F172A]">
                                  {plan.title}
                                </h3>
                                <span
                                  className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                    plan.status === "active"
                                      ? "bg-[#DCFCE7] text-[#166534]"
                                      : plan.status === "full"
                                        ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                        : plan.status === "ended"
                                          ? "bg-[#F1F5F9] text-[#475569]"
                                          : "bg-[#FEE2E2] text-[#B91C1C]"
                                  }`}
                                >
                                  {plan.status.replace("_", " ")}
                                </span>
                                {plansView === "my" ? (
                                  <span className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#4338CA]">
                                    {plan.is_creator ? "Creator" : "Attendee"}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-[#64748B]">
                                Created by{" "}
                                {getPublicPlanPersonInitials(plan.creator_name)}
                              </p>
                            </div>
                            <div
                              className={`grid w-full gap-2 md:w-auto ${getPublicPlanActionGridClass(plan.is_creator ? creatorActionCount : 1)}`}
                            >
                              {plan.is_creator ? (
                                <>
                                  {plan.can_leave || plan.can_join ? (
                                    <button
                                      onClick={() => handleJoinLeave(plan)}
                                      disabled={
                                        !email ||
                                        submitting ||
                                        (!plan.can_join && !plan.can_leave)
                                      }
                                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                                        plan.viewer_joined && plan.can_leave
                                          ? "border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]"
                                          : "bg-[#0F766E] text-white hover:bg-[#115E59]"
                                      } disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                      {plan.viewer_joined
                                        ? "Leave Plan"
                                        : plan.can_join
                                          ? "Join Plan"
                                          : "Unavailable"}
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => openInviteSheet(plan)}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0F766E] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#0F766E] transition hover:bg-[#F0FDFA]"
                                  >
                                    <UserPlus
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.7}
                                    />
                                    Invite Friends
                                  </button>
                                  <button
                                    onClick={() => handleStartEditingPlan(plan)}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#475569] transition hover:bg-[#F8FAFC]"
                                  >
                                    <Pencil
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.7}
                                    />
                                    Edit
                                  </button>
                                  {plan.can_delete ? (
                                    <button
                                      onClick={() => handleDeletePlan(plan)}
                                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#FECACA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#B91C1C] transition hover:bg-[#FEF2F2]"
                                    >
                                      <Trash2
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.7}
                                      />
                                      Delete Plan
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleJoinLeave(plan)}
                                  disabled={
                                    !email ||
                                    submitting ||
                                    (!plan.can_join && !plan.can_leave)
                                  }
                                  className={`inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                                    plan.viewer_joined && plan.can_leave
                                      ? "border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]"
                                      : "bg-[#0F766E] text-white hover:bg-[#115E59]"
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {plan.viewer_joined
                                    ? "Leave plan"
                                    : plan.can_join
                                      ? "Join plan"
                                      : "Unavailable"}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm text-[#475569]">
                            <div className="flex items-start gap-2">
                              <Clock3
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                strokeWidth={1.7}
                              />
                              <span>{formatDateTime(plan.meetup_at)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                strokeWidth={1.7}
                              />
                              <span>{plan.meeting_point}</span>
                            </div>
                            {plan.note ? (
                              <p className="mt-1 text-sm leading-6 text-[#334155]">
                                {plan.note}
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                                <Users
                                  className="h-4 w-4 text-[#0F766E]"
                                  strokeWidth={1.7}
                                />
                                {plan.attendee_count} attending
                                {plan.attendee_cap != null
                                  ? ` / ${plan.attendee_cap}`
                                  : ""}
                              </div>
                              <button
                                onClick={() => handleReport("plan", plan.id)}
                                disabled={!email || submitting}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] transition hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Flag
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.7}
                                />
                                Report
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {plan.attendees.map((attendee) => (
                                <span
                                  key={attendee.id}
                                  className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[#334155]"
                                >
                                  {getPublicPlanPersonInitials(
                                    attendee.display_name,
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                          {shareEnabled ? (
                            <HoodieShareActions
                              descriptor={buildPublicPlanShareDescriptor(plan)}
                              className="mt-4"
                              variant="invite"
                            />
                          ) : null}

                          <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                            <button
                              onClick={() => handleToggleComments(plan.id)}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] transition hover:text-[#0F766E]"
                            >
                              <MessageCircle
                                className="h-4 w-4"
                                strokeWidth={1.7}
                              />
                              Public thread
                              <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#475569]">
                                {plan.comment_count}
                              </span>
                            </button>

                            {showComments ? (
                              <div className="mt-4 space-y-3">
                                {comments.length === 0 ? (
                                  <p className="text-sm text-[#64748B]">
                                    No comments yet.
                                  </p>
                                ) : (
                                  comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-[#0F172A]">
                                            {comment.author_name}
                                          </p>
                                          <p className="text-[11px] uppercase tracking-wide text-[#94A3B8]">
                                            {formatDateTime(comment.created_at)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() =>
                                              handleReport(
                                                "comment",
                                                plan.id,
                                                comment.id,
                                              )
                                            }
                                            disabled={!email || submitting}
                                            className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] transition hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            Report
                                          </button>
                                          {comment.can_delete ? (
                                            <button
                                              onClick={() =>
                                                handleDeleteComment(
                                                  plan.id,
                                                  comment.id,
                                                )
                                              }
                                              disabled={submitting}
                                              className="text-[11px] font-semibold uppercase tracking-wide text-[#B91C1C] transition hover:text-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              Delete
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-[#334155]">
                                        {comment.body}
                                      </p>
                                    </div>
                                  ))
                                )}

                                {plan.can_comment ? (
                                  <div className="rounded-lg border border-[#CBD5E1] bg-white p-3">
                                    <textarea
                                      value={commentDrafts[plan.id] || ""}
                                      onChange={(event) =>
                                        setCommentDrafts((current) => ({
                                          ...current,
                                          [plan.id]: event.target.value,
                                        }))
                                      }
                                      rows={3}
                                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#0F766E]"
                                      placeholder="Say when you're arriving, how to spot you, or what you're keen to do."
                                    />
                                    <div className="mt-3">
                                      <button
                                        onClick={() =>
                                          handleCommentSubmit(plan.id)
                                        }
                                        disabled={
                                          submitting ||
                                          !(commentDrafts[plan.id] || "").trim()
                                        }
                                        className="rounded-lg bg-[#0F766E] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Post comment
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-[#64748B]">
                                    Only joined attendees can post while the
                                    plan is active.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <PlanComposerSheet
        open={showComposerSheet}
        title={editingPlan ? "Edit your plan" : "Plan Details"}
        subtitle={
          editingPlan
            ? "Update the meetup details without leaving the event page."
            : "Step 1 of 2. Confirm the event details, then invite friends."
        }
        draft={editingPlan ? editDraft : createDraft}
        onChange={editingPlan ? updateEditDraft : updateCreateDraft}
        onSubmit={
          editingPlan ? () => handleSavePlanEdit(editingPlan) : handleCreatePlan
        }
        onCancel={closeComposerSheet}
        submitLabel={editingPlan ? "Save changes" : "Next"}
        submitting={submitting}
        readOnlyTitle={!editingPlan}
        showAttendeeCap={Boolean(editingPlan)}
        titleLabel={editingPlan ? "Plan title" : "Event name"}
        meetingPointLabel={editingPlan ? "Meeting point" : "Meeting location"}
        noteLabel={editingPlan ? "Short note" : "Description"}
        notePlaceholder={
          editingPlan
            ? "What kind of hang, what to bring, how to find you..."
            : "Add the meetup spot or anything friends should know."
        }
      />
      <PlanInviteSheet
        open={Boolean(invitePlan)}
        plan={invitePlan}
        shareDescriptor={inviteBannerDescriptor}
        phoneInput={invitePhoneInput}
        phones={invitePhones}
        contactPermission={inviteContactsPermission}
        contactEntries={filteredInviteContacts}
        contactsLoading={inviteContactsLoading}
        contactQuery={inviteContactQuery}
        onPhoneInputChange={setInvitePhoneInput}
        onAddPhone={handleAddInvitePhone}
        onToggleContactPhone={handleToggleInviteContactPhone}
        onContactQueryChange={setInviteContactQuery}
        onRequestContacts={handleRequestInviteContacts}
        onRemovePhone={handleRemoveInvitePhone}
        onOpenSms={handleOpenInviteSms}
        onSystemShare={handleShareInvite}
        onCopy={handleCopyInvite}
        onClose={closeInviteSheet}
        smsSupported={smsSupported}
        contactPickerSupported={contactPickerSupported}
      />
    </div>
  );
}
