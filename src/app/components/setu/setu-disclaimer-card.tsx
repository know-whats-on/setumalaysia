import { AlertTriangle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { APP_CONFIG } from '../../lib/app-config';

export function SetuDisclaimerCard() {
  const supportMailto = `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent('Re: FAQs & Resources Page')}`;

  return (
    <div className="rounded-[28px] border border-[#FDE68A] bg-[#FFFBEA] p-1">
      <Accordion type="single" collapsible className="rounded-[24px] bg-white px-5">
        <AccordionItem value="disclaimer" className="border-b-0">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-semibold text-[#0F172A]">Disclaimer</span>
                <span className="block text-sm font-normal text-[#64748B]">
                  How SETU compiles this guide and where to verify decisions.
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-7 text-[#334155]">
            <p>
              This guide is designed to simplify your transition to life in Australia by consolidating
              helpful information from multiple sources. Generative AI has been used to assist with
              the curation, compilation, and rephrasing of some content. While every effort has been
              made to ensure accuracy, details may change due to updated laws, university procedures,
              or government policies.
            </p>
            <p className="mt-3">
              This guide is not a substitute for professional or legal advice, and we strongly
              encourage you to verify all information using official links before making decisions.
            </p>
            <p className="mt-3">
              Neither What&apos;s On! Campus nor its endorsers, promoters, or affiliates accept responsibility
              for discrepancies, outdated links, or data mismatches. If you notice an error or outdated
              link, please contact{' '}
              <a
                href={supportMailto}
                className="font-medium text-[#1D4ED8] underline underline-offset-4"
              >
                {APP_CONFIG.supportEmail}
              </a>
              .
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
