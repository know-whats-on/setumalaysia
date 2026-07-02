import { Browser } from '@capacitor/browser';
import { PlayCircle } from 'lucide-react';
import { Children } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isNativeShell } from '../../lib/platform';
import {
  normalizeSetuMarkdownContent,
  parseSetuYouTubeToken,
} from '../../lib/setu-utils';

interface SetuMarkdownProps {
  content: string;
}

function readChildrenText(children: ReactNode) {
  const nodes = Children.toArray(children);
  if (nodes.length === 0) return '';
  if (nodes.every((node) => typeof node === 'string')) {
    return nodes.join('');
  }
  return null;
}

function SetuVideoBlock({ videoId, title }: { videoId: string; title: string }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (isNativeShell()) {
    return (
      <button
        type="button"
        onClick={() => {
          void Browser.open({ url: watchUrl });
        }}
        className="my-4 block w-full overflow-hidden rounded-2xl border border-[#DBEAFE] bg-white text-left shadow-sm transition-colors hover:bg-[#F8FBFF]"
      >
        <span className="relative block overflow-hidden bg-[#EFF6FF]">
          <img
            src={thumbnailUrl}
            alt={title}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/20">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#1D4ED8] shadow-lg">
              <PlayCircle className="h-8 w-8" />
            </span>
          </span>
        </span>
        <span className="flex items-center justify-between gap-4 px-4 py-4">
          <span>
            <span className="block text-base font-semibold text-[#0F172A]">{title}</span>
            <span className="mt-1 block text-sm text-[#64748B]">
              Open video in YouTube for reliable mobile playback.
            </span>
          </span>
          <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8]">
            Watch
          </span>
        </span>
      </button>
    );
  }

  return (
    <span className="my-4 block overflow-hidden rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-2">
      <span className="relative block h-0 overflow-hidden rounded-xl pb-[56.25%]">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </span>
    </span>
  );
}

function maybeRenderVideo(children: ReactNode) {
  const token = parseSetuYouTubeToken(readChildrenText(children) || '');
  if (!token) return null;
  return <SetuVideoBlock videoId={token.videoId} title={token.title} />;
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (!href) return null;

    return (
      <a
        href={href}
        {...props}
        className="font-medium text-[#1D4ED8] underline decoration-[#93C5FD] underline-offset-4 hover:text-[#1E3A8A]"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (!src) return null;
    return (
      <span className="my-4 block overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-2">
        <img src={src} alt={alt || 'FAQ illustration'} className="w-full rounded-xl object-cover" loading="lazy" />
      </span>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#F8FAFC] text-[#0F172A]">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-t border-[#E2E8F0]">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top text-[#334155]">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-2xl border-l-4 border-[#1D4ED8] bg-[#EFF6FF] px-4 py-3 text-[#1E3A8A]">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => maybeRenderVideo(children) || <h1 className="mt-6 text-2xl font-bold text-[#0F172A] first:mt-0">{children}</h1>,
  h2: ({ children }) => maybeRenderVideo(children) || <h2 className="mt-6 text-xl font-semibold text-[#0F172A] first:mt-0">{children}</h2>,
  h3: ({ children }) => maybeRenderVideo(children) || <h3 className="mt-5 text-lg font-semibold text-[#0F172A] first:mt-0">{children}</h3>,
  p: ({ children }) => maybeRenderVideo(children) || <p className="mt-3 leading-7 text-[#334155] first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-2 pl-5 text-[#334155]">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 pl-5 text-[#334155]">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  hr: () => <hr className="my-6 border-[#E2E8F0]" />,
  code: ({ children }) => (
    <code className="rounded bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[0.92em] text-[#0F172A]">{children}</code>
  ),
};

export function SetuMarkdown({ content }: SetuMarkdownProps) {
  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml={false}>
        {normalizeSetuMarkdownContent(content)}
      </ReactMarkdown>
    </div>
  );
}
