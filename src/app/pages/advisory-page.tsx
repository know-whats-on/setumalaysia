import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';

type AdvisoryBlockType = 'h1' | 'h2' | 'h3' | 'note' | 'link' | 'p';

interface AdvisoryBlock {
  type: AdvisoryBlockType;
  text: string;
}

const ADVISORY_CONTENT_URL = '/content/official-advisory.md';
const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

function parseAdvisoryMarkdown(markdown: string): AdvisoryBlock[] {
  return markdown
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2).trim() };
      if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3).trim() };
      if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4).trim() };
      if (line.startsWith('_') && line.endsWith('_')) return { type: 'note', text: line.slice(1, -1).trim() };
      if (/^https?:\/\//.test(line)) return { type: 'link', text: line };
      return { type: 'p', text: line };
    });
}

function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="break-words font-semibold text-[#1D4ED8] underline underline-offset-2"
            >
              {part}
            </a>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function AdvisoryBlockView({ block }: { block: AdvisoryBlock }) {
  if (block.type === 'h1') {
    return (
      <h1 className="text-3xl font-black leading-tight tracking-tight text-[#0F172A]">
        {block.text}
      </h1>
    );
  }

  if (block.type === 'h2') {
    return (
      <h2 className="mt-8 border-t border-[#E2E8F0] pt-6 text-xl font-black leading-tight text-[#0F172A]">
        {block.text}
      </h2>
    );
  }

  if (block.type === 'h3') {
    return <h3 className="mt-5 text-base font-bold text-[#1E40AF]">{block.text}</h3>;
  }

  if (block.type === 'note') {
    return <p className="mt-2 text-sm font-medium leading-relaxed text-[#475569]">{block.text}</p>;
  }

  if (block.type === 'link') {
    return (
      <a
        href={block.text}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex max-w-full items-center gap-2 break-all rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm font-semibold text-[#1D4ED8]"
      >
        <span>{block.text}</span>
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
      </a>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-[#334155]">
      <LinkedText text={block.text} />
    </p>
  );
}

export function AdvisoryPage() {
  if (APP_VARIANT === 'setu_china' || APP_VARIANT === 'jom_settle') {
    return <Navigate to="/vibe?section=alerts" replace />;
  }

  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const blocks = useMemo(() => parseAdvisoryMarkdown(markdown), [markdown]);

  useEffect(() => {
    let cancelled = false;
    void fetch(ADVISORY_CONTENT_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load advisory');
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setMarkdown(text);
        setError('');
      })
      .catch((err) => {
        console.error('SETU advisory load error:', err);
        if (cancelled) return;
        setError('The advisory could not be loaded right now.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="size-full overflow-y-auto bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur native-safe-area-top">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm"
            aria-label={`Back to ${APP_CONFIG.displayName}`}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1D4ED8]">Official Advisory</p>
            <p className="truncate text-sm font-bold text-[#0F172A]">{APP_CONFIG.displayName}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-10 pt-5">
        <section className="rounded-[28px] border border-[#DBEAFE] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3 rounded-3xl bg-[#EFF6FF] p-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1D4ED8] text-white">
              <FileText className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">High Commission of India, Canberra</p>
              <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                Official guidance for Indian students coming to Australia, formatted for mobile reading.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-medium text-[#B91C1C]">
              {error}
            </div>
          ) : blocks.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1D4ED8] border-t-transparent" />
            </div>
          ) : (
            <article className="space-y-3">
              {blocks.map((block, index) => (
                <AdvisoryBlockView key={`${block.type}-${index}-${block.text.slice(0, 24)}`} block={block} />
              ))}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
