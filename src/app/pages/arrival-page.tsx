import {
  ArrowRight,
  Compass,
  FileCheck,
  Home,
  LifeBuoy,
  MapPin,
  Shield,
} from 'lucide-react';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { TriageCenter } from '../components/triage-center';
import { useLocation } from 'react-router';

const sections = [
  {
    icon: Home,
    title: 'Before You Sign',
    body: 'Check the suburb, review reported issues, confirm the address details, and save any inspection notes before you commit.',
  },
  {
    icon: FileCheck,
    title: 'Your Arrival Kit',
    body: 'Keep your lease, bond details, receipts, screenshots, and key conversations together so you can find them quickly later.',
  },
  {
    icon: MapPin,
    title: 'Settle Into The Area',
    body: 'Use local alerts, grocery tools, transport coverage, and neighbourhood context to decide if a suburb fits your routine.',
  },
  {
    icon: Shield,
    title: 'If Something Goes Wrong',
    body: 'Document problems early, build an evidence trail, and keep the details you may need for tenancy support or dispute resolution.',
  },
];

export function ArrivalPage() {
  const location = useLocation();
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';

  if (APP_VARIANT === 'setu_china' || isHoodieExperience) {
    const focusLandingToken = typeof location.state === 'object' && location.state && 'hoodienieLandingToken' in location.state
      ? Number((location.state as { hoodienieLandingToken?: number }).hoodienieLandingToken)
      : undefined;
    return <TriageCenter surface="arrival" initialCategory="arrival" focusLandingToken={focusLandingToken} />;
  }

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-[#E2E8F0] px-4 py-4 native-safe-area-top bg-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1D4ED8]">
          Australia Arrival
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Move in with fewer surprises</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          {APP_CONFIG.displayName} keeps the practical pieces together while you settle into a new suburb in Australia.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div className="rounded-3xl border border-[#DBEAFE] bg-[linear-gradient(135deg,#EFF6FF_0%,#F8FAFC_100%)] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1D4ED8] text-white">
              <Compass className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Your arrival hub</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                Use the map, alerts, vault, and legal tools together. If you are a student, you can still save your university details. If not, the app stays useful without them.
              </p>
            </div>
          </div>
        </div>

        {sections.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#1D4ED8]">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{body}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0F172A]">
              <LifeBuoy className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#0F172A]">Need help?</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#64748B]">
                Reach out if you need support with account access, evidence uploads, or settling into the app.
              </p>
              <a
                href={APP_CONFIG.supportMailto}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8] hover:underline"
              >
                {APP_CONFIG.supportEmail}
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
