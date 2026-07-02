// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  get: vi.fn(),
  nativeShell: true,
}));

vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    request: mocks.request,
    get: mocks.get,
  },
}));

vi.mock('/utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'anon-key',
}));

vi.mock('./platform', () => ({
  isNativeShell: () => mocks.nativeShell,
}));

import {
  buildPublicToiletArcgisQueryUrl,
  buildPublicToiletsQueryParams,
  fetchHoodieSponsorCompaniesPdf,
  fetchOfficialNews,
  fetchPublicToilets,
  normalizeArcgisPublicToiletFeature,
  parsePublicToiletBoolean,
  sendTriageMessage,
  updateHouseholdRules,
} from './api';

describe('api native transport', () => {
  beforeEach(() => {
    mocks.request.mockReset();
    mocks.get.mockReset();
    mocks.nativeShell = true;
  });

  it('parses native JSON success responses from text', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        data: {
          household: null,
          house_rules: { current_version_id: 'rules-v2', versions: [], acknowledgements: [] },
          version: { id: 'rules-v2' },
          acknowledgement: { id: 'ack-1' },
        },
      }),
    });

    const result = await updateHouseholdRules({
      householdId: 'household-1',
      actorEmail: 'owner@hoodie.app',
      rulesDraft: {
        title: 'House Rules Declaration',
        description: 'Signed record',
        sections: [],
      },
      acknowledgement: {
        checked_item_ids: [],
        signature: {
          method: 'drawn_signature',
          typed_value: 'Owner Name',
          strokes: [{ points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }],
        },
      },
    });

    expect(result.version?.id).toBe('rules-v2');
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
      responseType: 'text',
      data: expect.objectContaining({
        actor_email: 'owner@hoodie.app',
      }),
    }));
  });

  it('surfaces non-JSON native error bodies as readable messages', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 400,
      headers: { 'content-type': 'text/plain' },
      data: 'Backend exact publish error',
    });

    await expect(updateHouseholdRules({
      householdId: 'household-1',
      actorEmail: 'owner@hoodie.app',
      rulesDraft: {
        title: 'House Rules Declaration',
        description: 'Signed record',
        sections: [],
      },
      acknowledgement: {
        checked_item_ids: [],
        signature: {
          method: 'drawn_signature',
          typed_value: 'Owner Name',
          strokes: [{ points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }],
        },
      },
    })).rejects.toThrow('Backend exact publish error');
  });

  it('keeps native PDF downloads on arraybuffer transport', async () => {
    mocks.get.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      data: new Uint8Array([37, 80, 68, 70]).buffer,
    });

    const blob = await fetchHoodieSponsorCompaniesPdf();

    expect(blob.type).toBe('application/pdf');
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({
      responseType: 'arraybuffer',
    }));
  });

  it('sends SETU China as the top-level triage app variant', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        data: {
          text: 'TFN 是澳洲税号，兼职和报税时通常会用到。\nSource: ATO - https://www.ato.gov.au/\n[TRIGGER:OPEN_RESOURCES]\nConfidence score: 90%',
        },
      }),
    });

    const result = await sendTriageMessage(
      [{ role: 'user', text: 'TFN 是什么？' }],
      'arrival',
      {
        known_addresses: [],
        uploaded_evidence: 0,
        state: null,
        user_name: 'Lin',
        app_variant: 'setu_china',
        preferred_language: 'zh-CN',
        surface: 'arrival',
      },
    );

    expect(result).toContain('TFN 是澳洲税号');
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      responseType: 'text',
      data: expect.objectContaining({
        app_variant: 'setu_china',
        category: 'arrival',
        context: expect.objectContaining({
          app_variant: 'setu_china',
          preferred_language: 'zh-CN',
          surface: 'arrival',
        }),
      }),
    }));
  });

  it('fetches Bayside official news with clamped pagination params', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        data: [
          {
            source: 'bayside',
            slug: 'local-update',
            title: ' Local update ',
            summary: 'Bayside service notice',
            published_at: '2026-06-25',
            image_url: 'https://www.bayside.nsw.gov.au/sites/default/files/news.jpg',
            source_url: 'https://www.bayside.nsw.gov.au/your-council/latest-news/local-update',
            tags: ['Bayside', 'Council'],
          },
          {
            source: 'bayside',
            slug: 'missing-url',
            title: 'Missing URL',
            source_url: '',
          },
        ],
        meta: { source: 'bayside', refreshed_at: '2026-06-25T00:00:00.000Z' },
      }),
    });

    const result = await fetchOfficialNews({ limit: 2.9, offset: -10 });

    expect(result.data).toEqual([
      expect.objectContaining({
        source: 'bayside',
        slug: 'local-update',
        title: 'Local update',
        source_url: 'https://www.bayside.nsw.gov.au/your-council/latest-news/local-update',
      }),
    ]);
    expect(result.meta.source).toBe('bayside');
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      responseType: 'text',
      url: expect.stringContaining('/official-news?source=bayside&limit=2&offset=0'),
    }));
  });

  it('throws detailed triage errors for non-2xx responses', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 500,
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ error: 'Anthropic API key not configured' }),
    });

    await expect(sendTriageMessage(
      [{ role: 'user', text: 'OSHC 怎么用？' }],
      'arrival',
      {
        known_addresses: [],
        uploaded_evidence: 0,
        state: null,
        user_name: 'Lin',
        app_variant: 'setu_china',
        preferred_language: 'zh-CN',
      },
    )).rejects.toThrow('Triage request failed (500): Anthropic API key not configured');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('public toilet API helpers', () => {
  it('builds and caps public toilet query params', () => {
    const params = buildPublicToiletsQueryParams({
      west: 150,
      south: -34,
      east: 151,
      north: -33,
    }, 50000);

    expect(params.toString()).toBe('west=150&south=-34&east=151&north=-33&limit=30000');
  });

  it('rejects invalid public toilet bounds before fetching', () => {
    expect(() => buildPublicToiletsQueryParams({
      west: 151,
      south: -34,
      east: 150,
      north: -33,
    })).toThrow('Invalid public toilet map bounds');
  });

  it('builds ArcGIS public toilet query URLs', () => {
    const url = new URL(buildPublicToiletArcgisQueryUrl({
      west: 151.18,
      south: -33.88,
      east: 151.23,
      north: -33.84,
    }, 5000));

    expect(url.origin + url.pathname).toContain('/National_Public_Toilet_Map/FeatureServer/0/query');
    expect(url.searchParams.get('geometryType')).toBe('esriGeometryEnvelope');
    expect(url.searchParams.get('resultRecordCount')).toBe('2000');
    expect(JSON.parse(url.searchParams.get('geometry') || '{}')).toMatchObject({
      xmin: 151.18,
      ymin: -33.88,
      xmax: 151.23,
      ymax: -33.84,
    });
  });

  it('normalizes ArcGIS public toilet feature records', () => {
    expect(parsePublicToiletBoolean('TRUE')).toBe(true);
    expect(parsePublicToiletBoolean('No')).toBe(false);

    const toilet = normalizeArcgisPublicToiletFeature({
      attributes: {
        objectid: 3530,
        facilityid: 4709,
        name: 'Balls Head Reserve',
        address1: 'Balls Head Drive',
        town: 'Waverton',
        state: 'NSW',
        openinghours: 'OPEN: 24 hours',
        accessible: 'TRUE',
        babychange: 'FALSE',
        url: 'https://toiletmap.gov.au/facility/4709',
      },
      geometry: {
        x: 151.196351,
        y: -33.84679345,
      },
    });

    expect(toilet).toMatchObject({
      id: 'toilet-4709',
      facilityId: 4709,
      name: 'Balls Head Reserve',
      address: 'Balls Head Drive',
      accessible: true,
      babyChange: false,
      lat: -33.84679345,
      lng: 151.196351,
    });
  });

  it('falls back to ArcGIS when public toilet proxy route is stale', async () => {
    mocks.request.mockResolvedValueOnce({
      status: 404,
      headers: { 'content-type': 'text/plain' },
      data: '404 Not Found',
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      features: [
        {
          attributes: {
            objectid: 1,
            facilityid: 2,
            name: 'Fallback Toilet',
            accessible: 'YES',
          },
          geometry: { x: 151.2, y: -33.86 },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchPublicToilets({
      west: 151.18,
      south: -33.88,
      east: 151.23,
      north: -33.84,
    }, { limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'toilet-2', name: 'Fallback Toilet', accessible: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/National_Public_Toilet_Map/FeatureServer/0/query?'),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });
});
