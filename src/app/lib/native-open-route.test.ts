// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearNativeOpenRoute,
  consumeNativeOpenRouteIfCurrent,
  isExternalRouteSource,
  rememberNativeOpenRoute,
} from './native-open-route';

describe('native open route helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('consumes the remembered route only once when it matches', () => {
    rememberNativeOpenRoute('/plans/plan-1?source=imessage');

    expect(consumeNativeOpenRouteIfCurrent('/plans/plan-2')).toBe(false);
    expect(consumeNativeOpenRouteIfCurrent('/plans/plan-1?source=imessage')).toBe(true);
    expect(consumeNativeOpenRouteIfCurrent('/plans/plan-1?source=imessage')).toBe(false);
  });

  it('clears a remembered external route when the user navigates away', () => {
    rememberNativeOpenRoute('/events/cityofsydney/event?source=imessage');
    clearNativeOpenRoute();

    expect(consumeNativeOpenRouteIfCurrent('/events/cityofsydney/event?source=imessage')).toBe(false);
  });

  it('recognizes iMessage and push as external route sources', () => {
    expect(isExternalRouteSource('imessage')).toBe(true);
    expect(isExternalRouteSource('push')).toBe(true);
    expect(isExternalRouteSource('')).toBe(false);
    expect(isExternalRouteSource('browser')).toBe(false);
  });
});
