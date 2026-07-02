import { describe, expect, it, vi } from 'vitest';
import { resolveHoodieShareBackgroundImage } from './hoodie-share-media';

describe('hoodie share media background resolution', () => {
  it('materializes remote images with native http on mobile shells', async () => {
    const nativeGet = vi.fn(async () => ({
      status: 200,
      data: new Uint8Array([1, 2, 3, 4]),
      headers: {
        'content-type': 'image/jpeg',
      },
    }));
    const createObjectUrl = vi.fn(() => 'blob:native-share-banner');
    const revokeObjectUrl = vi.fn();

    const resolved = await resolveHoodieShareBackgroundImage('https://images.example.com/banner.jpg', {
      nativeShell: true,
      nativeGet,
      fetchImpl: vi.fn(),
      createObjectUrl,
      revokeObjectUrl,
    });

    expect(nativeGet).toHaveBeenCalledWith('https://images.example.com/banner.jpg');
    expect(resolved.originalUrl).toBe('https://images.example.com/banner.jpg');
    expect(resolved.resolvedUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(resolved.fallbackReason).toBeUndefined();
    expect(createObjectUrl).toHaveBeenCalledTimes(1);

    resolved.revoke();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:native-share-banner');
  });

  it('materializes remote images with browser fetch on the web', async () => {
    const fetchImpl = vi.fn(async () => new Response(new Blob(['image-bytes'], { type: 'image/png' }), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    }));
    const createObjectUrl = vi.fn(() => 'blob:web-share-banner');
    const revokeObjectUrl = vi.fn();

    const resolved = await resolveHoodieShareBackgroundImage('https://images.example.com/web-banner.jpg', {
      nativeShell: false,
      fetchImpl,
      createObjectUrl,
      revokeObjectUrl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://images.example.com/web-banner.jpg', {
      mode: 'cors',
      credentials: 'omit',
    });
    expect(resolved.resolvedUrl).toMatch(/^data:image\/png;base64,/);
    expect(resolved.fallbackReason).toBeUndefined();
    expect(createObjectUrl).toHaveBeenCalledTimes(1);

    resolved.revoke();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:web-share-banner');
  });

  it('falls back to branded art only after native and browser image resolution fail', async () => {
    const resolved = await resolveHoodieShareBackgroundImage('https://images.example.com/missing-banner.jpg', {
      nativeShell: true,
      nativeGet: vi.fn(async () => {
        throw new Error('native request blocked');
      }),
      fetchImpl: vi.fn(async () => new Response(null, { status: 403 })),
      createObjectUrl: vi.fn(() => 'blob:unused'),
      revokeObjectUrl: vi.fn(),
    });

    expect(resolved.resolvedUrl).toBeUndefined();
    expect(resolved.fallbackReason).toContain('native fetch failed: native request blocked');
    expect(resolved.fallbackReason).toContain('browser fetch failed: Background image request failed (403)');
  });
});
