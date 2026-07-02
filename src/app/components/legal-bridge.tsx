import { useState } from 'react';
import { ArrowLeft, FileText, Download, Clock, ExternalLink, CheckCircle, Shield } from 'lucide-react';
import { categoryLabels, categoryColors } from '../lib/mock-data';
import { format } from 'date-fns';
import type { Listing } from '../lib/mock-data';
import { APP_CONFIG } from '../lib/app-config';

interface LegalBridgeProps {
  onBack: () => void;
  listing?: Listing | null;
}

export function LegalBridge({ onBack, listing }: LegalBridgeProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const activeListing = listing || {
    id: 'placeholder',
    listing_id_public: 'GHAR-0000',
    address: 'No case selected',
    postcode: '',
    lat: 0,
    lng: 0,
    category: 'scam' as const,
    status: 'active' as const,
    confidence_score: 0,
    reported_by: '',
    created_at: new Date().toISOString(),
    description: 'Select a case from the map dashboard to view legal details.',
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-xs tracking-wide font-medium">Back</span>
        </button>
        <span className="text-xs tracking-wide text-[#64748B] font-medium">
          Legal Bridge
        </span>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Case Header */}
        <div className="px-4 py-6 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] tracking-wide uppercase px-3 py-1 text-white rounded-md font-medium"
              style={{ backgroundColor: categoryColors[activeListing.category] }}
            >
              {categoryLabels[activeListing.category]}
            </span>
            <span className="text-[10px] tracking-wide uppercase text-[#94A3B8] font-medium">
              {activeListing.status.toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg text-[#0F172A] mb-1 font-bold">
            {activeListing.listing_id_public}
          </h2>
          <p className="text-sm text-[#64748B] font-normal">
            {activeListing.address}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <span className="text-4xl text-[#0F172A]" style={{ fontWeight: 100 }}>
                {activeListing.confidence_score}
              </span>
              <span className="text-[10px] tracking-wide uppercase text-[#94A3B8] ml-1 font-medium">
                Confidence
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#94A3B8]">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              <span className="text-[10px] tracking-wide font-medium">
                {format(new Date(activeListing.created_at), 'dd MMM yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Case Brief */}
        <div className="px-4 py-4">
          <p className="text-xs tracking-wide text-[#64748B] mb-3 font-medium">
            Case Brief
          </p>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
            <div>
              <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Summary</p>
              <p className="text-sm text-[#0F172A] font-normal">{activeListing.description}</p>
            </div>
            <div className="w-full h-px bg-[#E2E8F0]" />
            <div>
              <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Applicable Law</p>
              <p className="text-sm text-[#0F172A] font-normal">
                Residential Tenancies Act 2026 (amended) — {activeListing.address.includes('VIC') ? 'VIC Fixed-Heater Standards' : activeListing.address.includes('SA') ? 'SA Form A1 Mandates' : activeListing.address.includes('NSW') ? 'NSW 90-day Rent Increase Notice' : 'Federal Renter Protection Standards'}
              </p>
            </div>
            <div className="w-full h-px bg-[#E2E8F0]" />
            <div>
              <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Evidence Items</p>
              <p className="text-sm text-[#0F172A] font-normal">
                2 screenshots, 1 conversation transcript, GPS coordinates logged
              </p>
            </div>
            <div className="w-full h-px bg-[#E2E8F0]" />
            <div>
              <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] mb-1 font-medium">Recommendation</p>
              <p className="text-sm text-[#0F172A] font-normal">
                File complaint with Fair Trading. Confidence score qualifies for expedited review.
              </p>
            </div>
          </div>
        </div>

        {/* Generate PDF */}
        <div className="px-4 py-4">
          <p className="text-xs tracking-wide text-[#64748B] mb-3 font-medium">
            Incident Documentation
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full py-4 flex items-center justify-center gap-2 transition-all cursor-pointer rounded-xl font-medium ${
              generated
                ? 'bg-[#16A34A] text-white shadow-lg shadow-[#16A34A]/20'
                : generating
                ? 'bg-[#94A3B8] text-white'
                : 'bg-[#0F172A] text-white hover:bg-[#1E293B] shadow-lg'
            }`}
          >
            {generated ? (
              <>
                <CheckCircle className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-xs tracking-wide">PDF Ready — Download</span>
                <Download className="w-4 h-4 ml-1" strokeWidth={1.5} />
              </>
            ) : generating ? (
              <span className="text-xs tracking-wide">Compiling Evidence...</span>
            ) : (
              <>
                <FileText className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-xs tracking-wide">Generate Incident PDF</span>
              </>
            )}
          </button>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] text-center mt-2 font-medium">
            Includes Timestamps • GPS • AI Transcript • Evidence
          </p>
        </div>

        {/* Legal Consult */}
        <div className="px-4 py-4 border-t border-[#E2E8F0]">
          <p className="text-xs tracking-wide text-[#64748B] mb-3 font-medium">
            Professional Consultation
          </p>
          <div className="border border-[#1E40AF] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
              <span className="text-sm text-[#0F172A] font-bold">
                {APP_CONFIG.experienceMode === 'hoodie' ? `${APP_CONFIG.displayName} Support Network` : `${APP_CONFIG.displayName} Partner Network`}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mb-4 font-normal">
              {APP_CONFIG.experienceMode === 'hoodie'
                ? `Book a 15-minute consultation with a verified tenancy lawyer and get newcomer-friendly guidance tailored to your situation.`
                : `Book a 15-minute consultation with a verified tenancy lawyer. First consultation discounted for ${APP_CONFIG.displayName} verified students.`}
            </p>
            <button className="w-full py-3.5 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E3A8A] transition-all shadow-lg shadow-[#1E40AF]/20 cursor-pointer">
              <span className="text-xs tracking-wide font-medium">
                Book 15-min Consult
              </span>
              <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] text-center mt-2 font-medium">
              Redirects to Partner Law Firm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
