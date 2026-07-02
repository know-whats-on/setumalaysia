// @vitest-environment jsdom

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfCanvasViewer } from './pdf-canvas-viewer';
import { SignedHouseRulesPdfViewer } from './signed-house-rules-pdf-viewer';
import { downloadAppFile } from '../lib/file-download';
import { generateSignedHouseRulesPdf } from '../lib/household-rules-pdf';

const pdfMocks = vi.hoisted(() => {
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const cleanup = vi.fn();
  const getPage = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({
      width: 200 * scale,
      height: 100 * scale,
    }),
    render,
    cleanup,
  }));
  const destroy = vi.fn();
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage,
      destroy,
    }),
  }));
  return { cleanup, destroy, getDocument, getPage, render };
});

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'pdf-worker.js',
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: pdfMocks.getDocument,
}));

vi.mock('../lib/file-download', () => ({
  downloadAppFile: vi.fn(),
}));

vi.mock('../lib/household-rules-pdf', () => ({
  generateSignedHouseRulesPdf: vi.fn(),
}));

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

const mountedComponents: MountedComponent[] = [];

async function flushPdfViewer() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function renderComponent(children: ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  await act(async () => {
    root.render(<>{children}</>);
    await Promise.resolve();
  });
  await flushPdfViewer();
  await flushPdfViewer();

  return container;
}

async function clickElement(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

function getButtonByText(container: HTMLElement, fragment: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    String(button.textContent || '').replace(/\s+/g, ' ').trim().includes(fragment),
  );
}

describe('PdfCanvasViewer', () => {
  let clientWidthSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.mocked(generateSignedHouseRulesPdf).mockResolvedValue({
      blob: new Blob(['signed house rules pdf'], { type: 'application/pdf' }),
      fileName: 'campus-house-rules-v1-rushi-vyas.pdf',
    });
    vi.mocked(downloadAppFile).mockResolvedValue(undefined);
    clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(424);
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        clearRect: vi.fn(),
        setTransform: vi.fn(),
      }),
    });
    class MockResizeObserver {
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: MockResizeObserver,
    });
  });

  afterEach(async () => {
    while (mountedComponents.length > 0) {
      const mounted = mountedComponents.pop();
      if (!mounted) break;
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }
    clientWidthSpy.mockRestore();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('loads and renders a PDF blob', async () => {
    const loadPdf = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

    const container = await renderComponent(
      <PdfCanvasViewer
        title="Test PDF"
        fileName="test.pdf"
        loadPdf={loadPdf}
        testIdPrefix="test-pdf"
      />,
    );

    expect(loadPdf).toHaveBeenCalled();
    expect(pdfMocks.getDocument).toHaveBeenCalled();
    expect(pdfMocks.getPage).toHaveBeenCalledWith(1);
    expect(container.querySelector('[data-testid="test-pdf-canvas"]')).toBeTruthy();
  });

  it('renders compact page and zoom controls in separate rows without truncating page count', async () => {
    const container = await renderComponent(
      <PdfCanvasViewer
        title="Compact PDF"
        fileName="compact.pdf"
        loadPdf={() => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' }))}
        compact
        testIdPrefix="compact-pdf"
      />,
    );

    const pageRow = container.querySelector('[data-testid="compact-pdf-compact-page-row"]');
    const zoomRow = container.querySelector('[data-testid="compact-pdf-compact-zoom-row"]');
    const pageCount = container.querySelector('[data-testid="compact-pdf-page-count"]') as HTMLElement | null;

    expect(pageRow).toBeTruthy();
    expect(zoomRow).toBeTruthy();
    expect(pageCount?.textContent).toContain('Page 1 of 2');
    expect(pageCount?.className).not.toContain('truncate');
  });

  it('shrinks the viewport to the rendered page height when the page is shorter than the max', async () => {
    const container = await renderComponent(
      <PdfCanvasViewer
        title="Short PDF"
        fileName="short.pdf"
        loadPdf={() => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' }))}
        minViewportHeight={180}
        maxViewportHeight={720}
        testIdPrefix="short-pdf"
      />,
    );

    const viewport = container.querySelector('[data-testid="short-pdf-viewport"]') as HTMLElement | null;
    expect(viewport).toBeTruthy();
    expect(viewport?.style.height).toBe('232px');
  });

  it('downloads a generated signed House Rules PDF from the embedded viewer', async () => {
    const household = {
      id: 'household-1',
      name: 'Campus House',
      address_snapshot: { display_address: '12 Hoodie Street' },
    } as any;
    const version = {
      id: 'rules-v1',
      version_number: 1,
      sections: [],
    } as any;
    const acknowledgement = {
      id: 'ack-rushi',
      member_display_name: 'Rushi Vyas',
    } as any;
    const container = await renderComponent(
      <SignedHouseRulesPdfViewer
        household={household}
        version={version}
        acknowledgement={acknowledgement}
      />,
    );

    await clickElement(getButtonByText(container, 'Download PDF'));

    expect(generateSignedHouseRulesPdf).toHaveBeenCalledWith({ household, version, acknowledgement });
    expect(downloadAppFile).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'campus-house-rules-v1-rushi-vyas.pdf',
      title: 'Signed House Rules',
      directoryName: 'house-rules',
    }));
  });
});
