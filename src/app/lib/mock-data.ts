export interface Listing {
  id: string;
  listing_id_public: string;
  address: string;
  suburb?: string;
  postcode: string;
  lat: number;
  lng: number;
  category: 'scam' | 'maintenance';
  status: 'active';
  confidence_score: number;
  reported_by: string;
  created_at: string;
  description: string;
  source?: 'report' | 'timeline';
  unit_number?: string;
  building_id?: string;
  rental_entry_id?: string;
  nearest_transit?: { name: string; type: string; distance_m: number; walk_min: number }[];
}

export interface Bulletin {
  id: string;
  title: string;
  body: string;
  postcode_target: string;
  is_urgent: boolean;
  created_at: string;
  app_variant?: 'all' | 'ghar' | 'burb_mate' | 'setu_china' | 'jom_settle' | 'wheres_wolli';
}

export interface Evidence {
  id: string;
  listing_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  associated_address: string;
  associated_address_label: string;
  external_link: string;
  created_at: string;
  notes: string;
}

export const categoryLabels: Record<string, string> = {
  scam: 'SCAM ALERT',
  maintenance: 'MAINTENANCE',
};

export const categoryColors: Record<string, string> = {
  scam: '#B91C1C',
  maintenance: '#EA580C',
};

export const statusLabels: Record<string, string> = {
  active: 'ACTIVE',
  // Legacy compat
  unresolved: 'ACTIVE',
};

// ─── RENTAL HISTORY ─────────────────────────────────────────────

export interface RiskAssessment {
  written_lease: boolean | null;        // "Did you sign a formal, written tenancy agreement?"
  bond_lodged: boolean | null;          // "Has your bond been officially lodged with the state authority?"
  condition_report_received: boolean | null; // "Did the landlord/agent provide a Move-In Condition Report?"
  pre_existing_damage: boolean | null;  // "Are there pre-existing damages you noticed upon moving in?"
  rent_receipts: boolean | null;        // "Are you receiving formal receipts for rent payments?"
}

export interface RentalEntry {
  id: string;
  email: string;
  address: string;
  display_address: string;
  unit_number: string;
  building_id: string;
  suburb: string;
  postcode: string;
  state: string;
  lat?: number;
  lng?: number;
  address_verified?: boolean;
  start_date: string;
  end_date: string;
  is_current: boolean;
  landlord_name: string;
  landlord_contact: string;
  monthly_rent: number | null;
  review_category: 'maintenance' | 'scam' | null;
  review_text: string;
  review_rating: number | null;
  risk_assessment?: RiskAssessment | null;
  risk_score?: string; // 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Pending'
  created_at: string;
}

// ─── LEGAL CASES ────────────────────────────────────────────────

export type CaseStatus = 'draft' | 'submitted' | 'advocate_review' | 'resolved';

export interface LegalCase {
  id: string;
  case_number: string;
  email: string;
  case_title: string;
  associated_listing_id: string | null;
  associated_listing_public_id: string | null;
  vault_item_ids: string[];
  rental_history_id: string | null;
  case_status: CaseStatus;
  case_notes: string;
  applicable_law: string;
  created_at: string;
  updated_at: string;
}

export const caseStatusLabels: Record<CaseStatus, string> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  advocate_review: 'REVIEWING BY ADVOCATE',
  resolved: 'RESOLVED',
};

export const caseStatusColors: Record<CaseStatus, string> = {
  draft: '#94A3B8',
  submitted: '#1E40AF',
  advocate_review: '#EE811A',
  resolved: '#16A34A',
};
