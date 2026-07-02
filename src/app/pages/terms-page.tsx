import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router";
import { APP_CONFIG } from "../lib/app-config";

export function TermsPage() {
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
            <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm text-[#0F172A] font-bold">
            Terms of Service
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Preamble */}
        <div className="bg-[#1E40AF]/5 border border-[#1E40AF]/15 rounded-xl p-4 mb-5">
          <p className="text-[10px] tracking-wide uppercase text-[#1E40AF] font-medium mb-1">
            Effective Date
          </p>
          <p className="text-xs text-[#0F172A] font-bold">March 16, 2026</p>
          <div className="mt-2 pt-2 border-t border-[#1E40AF]/10">
            <p className="text-[10px] text-[#64748B] font-normal leading-relaxed">
              <span className="font-medium text-[#0F172A]">Company:</span>{" "}
              What's On! Campus Pty Ltd
            </p>
            <p className="text-[10px] text-[#64748B] font-normal leading-relaxed">
              <span className="font-medium text-[#0F172A]">App:</span>{" "}
              {APP_CONFIG.legalName}
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <h2 className={sectionTitle}>1. Acceptance of Terms</h2>
        <p className={para}>
          By creating an account, accessing, or using {APP_CONFIG.displayName}{" "}
          ("the App"), you agree to be bound by these Terms of Service. If you
          do not agree, do not use the App.
        </p>

        {/* Section 2 */}
        <h2 className={sectionTitle}>2. Nature of the Service</h2>
        <p className={para}>
          {APP_CONFIG.displayName} is an informational platform designed to help
          people document, track, and manage housing experiences and supporting
          records in Australia.
        </p>

        <h3 className={subTitle}>Not Legal Advice</h3>
        <p className={para}>
          The App, including the in-app guidance tools and the Legal Dossier
          export feature, provides general informational guidance only. What's
          On! Campus Pty Ltd is not a law firm. Users should consult a qualified
          legal professional or state tenancy tribunal for specific legal
          advice.
        </p>

        <h3 className={subTitle}>Neutral Intermediary</h3>
        <p className={para}>
          We act as a neutral hosting platform for user-generated content. We do
          not independently verify the accuracy of every report placed on the
          map.
        </p>

        {APP_CONFIG.showOfficialEventsFeature ? (
          <>
            <h3 className={subTitle}>Official Event Listings</h3>
            <p className={para}>
              Parts of the map and event detail flow may display official event
              listings sourced from public City of Sydney What&apos;s On pages.
              Those listings are provided for discovery only, may change without
              notice, and remain subject to the source venue&apos;s own booking
              terms, accessibility information, schedules, cancellations, and
              entry conditions.
            </p>
          </>
        ) : null}

        {/* Section 3 */}
        <h2 className={sectionTitle}>3. User Responsibilities & Conduct</h2>
        <p className={para}>
          You are solely responsible for the content, data, and evidence you
          upload. By posting an alert (Scam or Maintenance) to the public map,
          you warrant that:
        </p>
        <ul className="space-y-2 mb-3 ml-1">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-[#1E40AF] mt-1.5 shrink-0" />
            <span className="text-xs text-[#64748B] leading-relaxed font-normal">
              The information is entirely truthful, accurate, and based on your
              direct, personal experience.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-[#1E40AF] mt-1.5 shrink-0" />
            <span className="text-xs text-[#64748B] leading-relaxed font-normal">
              You possess documented evidence (such as photos, emails, or
              receipts) to substantiate your claims.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-[#1E40AF] mt-1.5 shrink-0" />
            <span className="text-xs text-[#64748B] leading-relaxed font-normal">
              Your post does not contain subjective insults, malicious
              falsehoods, or defamatory statements against any individual or
              business.
            </span>
          </li>
        </ul>

        {APP_CONFIG.showPublicPlansFeature ? (
          <>
            <h3 className={subTitle}>Public Plans and Threads</h3>
            <p className={para}>
              If you create or join a public plan under an official event, you
              are responsible for the accuracy of your meetup details, for your
              conduct toward other attendees, and for any comments you post in
              the related public thread. Plans and comments must not include
              harassment, threats, illegal activity, discriminatory content,
              impersonation, or misleading safety information.
            </p>
          </>
        ) : null}

        {/* Section 4 */}
        <h2 className={sectionTitle}>4. User-Generated Content & Defamation</h2>
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 mb-3">
          <p className="text-[10px] tracking-wide uppercase text-[#B91C1C] font-medium mb-1">
            Important Notice
          </p>
          <p className="text-xs text-[#64748B] leading-relaxed font-normal">
            What's On! Campus Pty Ltd claims "Innocent Dissemination" under
            Australian Defamation Law.
          </p>
        </div>

        <h3 className={subTitle}>Liability</h3>
        <p className={para}>
          You retain ownership of your content and assume all legal liability
          for it. If you post false or defamatory information, you may be held
          personally legally responsible by the affected parties.
        </p>

        <h3 className={subTitle}>Takedown Policy</h3>
        <p className={para}>
          We reserve the right to hide, suspend, or delete any map marker,
          alert, or user account if we receive a valid dispute, legal notice, or
          if we determine the content violates these terms.
        </p>

        {APP_CONFIG.showPublicPlansFeature ? (
          <>
            <h3 className={subTitle}>Moderation and Safety Review</h3>
            <p className={para}>
              We may review, limit, cancel, hide, or remove public plans,
              attendee participation, or public comments if we receive a report,
              takedown request, safety concern, or other credible indication
              that the content or meetup violates these terms or creates a risk
              for users or third parties.
            </p>
          </>
        ) : null}

        {/* Section 5 */}
        <h2 className={sectionTitle}>5. Account Termination</h2>
        <p className={para}>
          We reserve the right to suspend or terminate your access to the App at
          our sole discretion, without notice, if you are found to be submitting
          false reports, abusing the AI systems, or violating these Terms.
        </p>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#E2E8F0]">
          <p className="text-[10px] text-[#94A3B8] text-center font-normal">
            {APP_CONFIG.legalName}
          </p>
          <p className="text-[10px] text-[#94A3B8] text-center font-normal mt-0.5">
            What's On! Campus Pty Ltd
          </p>
          <p className="text-[10px] text-[#94A3B8] text-center font-normal mt-0.5">
            {APP_CONFIG.supportEmail}
          </p>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}
