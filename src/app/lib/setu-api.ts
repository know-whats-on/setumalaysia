import { projectId, publicAnonKey } from '/utils/supabase/info';
import type {
  SetuCategory,
  SetuChecklistProgressResponse,
  SetuFaq,
  SetuGenerateChecklistInput,
  SetuGeneratedChecklist,
  SetuUniversity,
} from './setu-types';
import { APP_VARIANT } from './app-variant';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1d591b90`;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  });
  const json = await readJson(response);
  if (!response.ok) {
    throw new Error(json.error || `SETU request failed for ${path}`);
  }
  return json as T;
}

export async function fetchSetuFaqCategories() {
  const json = await request<{ data?: { categories?: SetuCategory[] } }>('/setu/faq-categories', {
    cache: 'no-store',
  });
  return json.data?.categories || [];
}

export async function fetchSetuFaqs() {
  const json = await request<{ data?: { faqs?: SetuFaq[] } }>('/setu/faqs', {
    cache: 'no-store',
  });
  return json.data?.faqs || [];
}

export async function fetchSetuUniversities() {
  const json = await request<{ data?: { universities?: SetuUniversity[] } }>('/setu/universities', {
    cache: 'no-store',
  });
  return json.data?.universities || [];
}

export async function generateSetuChecklist(input: SetuGenerateChecklistInput) {
  const json = await request<{ data?: SetuGeneratedChecklist }>('/setu/personalized-content/generate', {
    method: 'POST',
    body: JSON.stringify({ ...input, app_variant: input.app_variant || APP_VARIANT }),
  });
  if (!json.data) {
    throw new Error('SETU checklist response was empty');
  }
  return json.data;
}

export async function fetchSetuChecklistProgress(email: string) {
  const json = await request<{ data?: SetuChecklistProgressResponse }>(
    `/setu/checklist-progress/${encodeURIComponent(email)}`,
    { cache: 'no-store' },
  );
  return json.data || { completed_items: [], total_progress_entries: 0 };
}

export async function syncSetuChecklistProgress(email: string, completedItems: string[]) {
  const json = await request<{ data?: { synced_items: number; completed_items: string[] } }>(
    `/setu/checklist-progress/${encodeURIComponent(email)}/sync`,
    {
      method: 'POST',
      body: JSON.stringify({ completed_items: completedItems }),
    },
  );
  return json.data || { synced_items: 0, completed_items: [] };
}

export async function clearSetuChecklistProgress(email: string) {
  const json = await request<{ data?: { message: string } }>(
    `/setu/checklist-progress/${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
    },
  );
  return json.data || { message: 'Progress cleared' };
}
