import { ArrowLeft, LifeBuoy, Mail } from 'lucide-react';
import { useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';

export function SupportPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1E40AF] rounded-lg flex items-center justify-center">
            <LifeBuoy className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">Support</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-2xl mx-auto w-full">
        <h1 className="text-lg font-bold text-[#0F172A] mb-4">{APP_CONFIG.displayName} Support</h1>
        <p className="text-xs text-[#64748B] leading-relaxed mb-6">
          If you need help with your account, reporting a housing issue, evidence uploads, or app access, contact us at:
        </p>

        <a
          href={APP_CONFIG.supportMailto}
          className="flex items-center gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-6 hover:border-[#1E40AF]/30 transition-colors"
        >
          <div className="w-8 h-8 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-[#1E40AF]">{APP_CONFIG.supportEmail}</span>
        </a>

        <p className="text-xs text-[#64748B] leading-relaxed">
          We use this inbox for user support, review follow-up, and account assistance.
        </p>
      </div>
    </div>
  );
}
