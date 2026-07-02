import { ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router";
import { APP_CONFIG } from "../lib/app-config";

export function PrivacyPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const sectionTitle = "text-sm text-[#0F172A] font-bold mt-6 mb-2";
  const para = "text-xs text-[#64748B] leading-relaxed font-normal mb-3";
  const subTitle = "text-xs text-[#0F172A] font-bold mt-4 mb-1.5";

  return (
    <div
      className="size-full bg-white flex flex-col"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div className="border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1E40AF] rounded-lg flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm text-[#0F172A] font-bold">
            Privacy Policy
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Preamble */}
        <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/15 rounded-xl p-4 mb-5">
          <p className="text-[10px] tracking-wide uppercase text-[#1E40AF] font-medium mb-1">
            Privacy Policy
          </p>
          <p className="text-xs text-[#0F172A] font-bold">
            {APP_CONFIG.legalName}
          </p>
          <div className="mt-2 pt-2 border-t border-[#1E40AF]/10">
            <p className="text-[10px] text-[#64748B] font-normal leading-relaxed">
              <span className="font-medium text-[#0F172A]">Company:</span>{" "}
              What's On! Campus Pty Ltd
            </p>
            <p className="text-[10px] text-[#64748B] font-normal leading-relaxed">
              <span className="font-medium text-[#0F172A]">Effective:</span>{" "}
              March 16, 2026
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <h2 className={sectionTitle}>1. Information We Collect</h2>
        <p className={para}>
          To provide a secure and functional experience, What's On! Campus Pty
          Ltd collects the following data:
        </p>

        <h3 className={subTitle}>Account Data</h3>
        <p className={para}>
          Your name, email address, and university affiliation details that you
          provide during onboarding.
        </p>

        <h3 className={subTitle}>Rental History & Evidence</h3>
        <p className={para}>
          Property addresses you link to your profile, tenancy checklists, and
          files (photos, PDFs, documents) you upload to the Evidence Vault.
        </p>
        <p className={para}>
          If you use native device features, {APP_CONFIG.displayName} may also
          request access to your camera or photo library so you can capture or
          attach housing evidence directly.
        </p>

        <h3 className={subTitle}>Location Data</h3>
        <p className={para}>
          If granted permission, we use your device's GPS to center the map and
          show nearby transport and safety alerts.
        </p>

        {APP_CONFIG.showOfficialEventsFeature ||
        APP_CONFIG.showPublicPlansFeature ? (
          <>
            <h3 className={subTitle}>Official Event and Plan Data</h3>
            <p className={para}>
              {APP_CONFIG.displayName} may ingest public official-event metadata
              from City of Sydney What&apos;s On through our own server-side
              cache so we can render nearby official listings on the map and
              event detail screens.
            </p>
            <p className={para}>
              If you create or join a public plan, we store the meetup details
              you provide, your attendee status, and any public comments you
              post in that plan&apos;s thread.
            </p>
          </>
        ) : null}

        <h3 className={subTitle}>Notifications</h3>
        <p className={para}>
          If granted permission, {APP_CONFIG.displayName} may send local
          reminder notifications for incomplete tenancy health checks and
          similar in-app follow-ups. On native devices, {APP_CONFIG.displayName}{" "}
          may also register a push notification token so we can deliver
          account-relevant alerts and route them to the right state, university,
          or suburb audience.
        </p>

        <h3 className={subTitle}>Chat Logs</h3>
        <p className={para}>
          Conversations with the in-app guidance tools to provide context-aware
          triage and resource routing.
        </p>

        {/* Section 2 */}
        <h2 className={sectionTitle}>2. How We Use Your Data</h2>

        <h3 className={subTitle}>Public Map Blips</h3>
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 mb-3">
          <p className="text-xs text-[#64748B] leading-relaxed font-normal">
            When you report a Scam or Maintenance issue, the{" "}
            <span className="font-medium text-[#0F172A]">building address</span>{" "}
            and the{" "}
            <span className="font-medium text-[#0F172A]">
              category of the issue
            </span>{" "}
            are displayed publicly. Your name, unit number, and specific
            uploaded evidence remain{" "}
            <span className="font-medium text-[#16A34A]">strictly private</span>{" "}
            and are not visible to the public.
          </p>
        </div>

        <h3 className={subTitle}>Legal Dossiers</h3>
        <p className={para}>
          Your private evidence and profile details are only compiled into a PDF
          dossier when you explicitly trigger the "Generate Legal Dossier"
          action.
        </p>

        <h3 className={subTitle}>Service Improvement</h3>
        <p className={para}>
          To maintain platform security, prevent abuse, and improve AI triage
          accuracy.
        </p>

        {APP_CONFIG.showPublicPlansFeature ? (
          <>
            <h3 className={subTitle}>Public Plan Visibility</h3>
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 mb-3">
              <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                Public plans are visible to signed-in users across supported app
                variants. When you create or join a plan, other users can see
                your display name in the format{" "}
                <span className="font-medium text-[#0F172A]">First L.</span>,
                the meetup details, the attendee count, and any public comments
                in that thread. Your email address is not shown publicly in the
                event experience.
              </p>
            </div>
          </>
        ) : null}

        {/* Section 3 */}
        <h2 className={sectionTitle}>3. Data Sharing & Disclosure</h2>
        <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/15 rounded-xl p-3 mb-3">
          <p className="text-xs text-[#1E40AF] font-bold mb-1">
            We do not sell your personal data.
          </p>
          <p className="text-xs text-[#64748B] leading-relaxed font-normal">
            We will only share your information under the following
            circumstances:
          </p>
        </div>

        <h3 className={subTitle}>With Your Consent</h3>
        <p className={para}>
          When you choose to export and share your Legal Dossier with third
          parties (e.g., a tribunal or university).
        </p>

        <h3 className={subTitle}>Legal Compliance</h3>
        <p className={para}>
          If required by Australian law, a court order, or a valid request from
          law enforcement or regulatory authorities.
        </p>

        {APP_CONFIG.showPublicPlansFeature ? (
          <>
            <h3 className={subTitle}>Moderation and Reports</h3>
            <p className={para}>
              If a plan or comment is reported, we may retain the report
              details, the associated public content, and the account-level
              identifiers necessary to investigate, respond to complaints, and
              take moderation or takedown action.
            </p>
          </>
        ) : null}

        {/* Section 4 */}
        <h2 className={sectionTitle}>4. Data Security</h2>
        <p className={para}>
          We utilize industry-standard encryption (via Supabase) to protect your
          Evidence Vault and account details. However, no digital transmission
          is entirely secure, and we cannot guarantee absolute security.
        </p>

        {/* Section 5 */}
        <h2 className={sectionTitle}>5. Your Rights</h2>
        <div className="border border-[#E2E8F0] rounded-xl p-3 mb-3">
          <p className="text-xs text-[#64748B] leading-relaxed font-normal">
            You have the right to{" "}
            <span className="font-medium text-[#0F172A]">access</span>,{" "}
            <span className="font-medium text-[#0F172A]">modify</span>, or{" "}
            <span className="font-medium text-[#0F172A]">
              permanently delete
            </span>{" "}
            your account and all associated data (including map blips and
            evidence) through your {APP_CONFIG.displayName} account controls or
            by contacting our support team from the email address associated
            with your account.
          </p>
        </div>

        {/* Section 6 */}
        <h2 className={sectionTitle}>6. Contact Us</h2>
        <p className={para}>
          For privacy concerns, data deletion requests, or to dispute a map
          marker, please contact our support team:
        </p>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-center">
          <p className="text-[10px] tracking-wide uppercase text-[#94A3B8] font-medium mb-1">
            Email
          </p>
          <a
            href={APP_CONFIG.supportMailto}
            className="text-sm text-[#1E40AF] font-bold hover:underline"
          >
            {APP_CONFIG.supportEmail}
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#E2E8F0]">
          <p className="text-[10px] text-[#94A3B8] text-center font-normal">
            {APP_CONFIG.legalName}
          </p>
          <p className="text-[10px] text-[#94A3B8] text-center font-normal mt-0.5">
            What's On! Campus Pty Ltd
          </p>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}
