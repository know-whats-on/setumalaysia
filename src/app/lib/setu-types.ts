export interface SetuCategory {
  id: number;
  name: string;
  category_order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SetuFaq {
  id: string;
  title: string;
  content: string;
  category_id: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SetuUniversity {
  id: number;
  name: string;
}

export type SetuContentType =
  | 'checklist_item'
  | 'resource_link'
  | 'tip'
  | 'contact';

export type SetuPriority = 'high' | 'medium' | 'low';

export interface SetuLocationInfo {
  city: string;
  state: string;
  stateCode: string;
  climate: 'temperate' | 'tropical' | 'mediterranean' | 'arid';
  majorCity: boolean;
}

export interface SetuPersonalizedContent {
  id: string;
  content_type: SetuContentType;
  title: string;
  description?: string | null;
  url?: string | null;
  category: string;
  subcategory?: string | null;
  priority: SetuPriority;
  is_essential: boolean;
  applies_to_states?: string[] | null;
  applies_to_universities?: number[] | null;
  applies_to_citizenship?: string[] | null;
  metadata?: Record<string, unknown> | null;
  source_faq_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_critical?: boolean | null;
  sequence_order?: number | null;
  timeline?: string | null;
  personalization_reason?: string | null;
}

export interface SetuGeneratedChecklist {
  checklist_items: SetuPersonalizedContent[];
  resource_links: SetuPersonalizedContent[];
  tips: SetuPersonalizedContent[];
  contacts: SetuPersonalizedContent[];
  metadata: {
    total_items: number;
    essential_items: number;
    personalization_factors: {
      state?: string;
      university_id?: number;
      citizenship?: string;
    };
    generated_at: string;
  };
}

export interface SetuChecklistProgressResponse {
  completed_items: string[];
  total_progress_entries: number;
}

export interface SetuChecklistProgress {
  checklistId: string;
  universityId: number;
  completedItems: string[];
  totalItems: number;
  lastUpdated: string;
  universityName: string;
  location: string;
}

export interface SetuGenerateChecklistInput {
  university_id: number;
  state?: string;
  citizenship?: string;
  app_variant?: string;
}

export interface SetuResolvedUniversity {
  university: SetuUniversity;
  location: SetuLocationInfo | null;
}
