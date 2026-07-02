export type PrepareTab = 'checklist' | 'application-kit' | 'scam-checker' | 'nsw-rent-check';

export type NswRentCheckPropertyType = 'house' | 'unit';
export type NswRentCheckBedrooms = '1' | '2' | '3' | '4' | '5';
export type NswRentCheckResultState = 'withinMedian' | 'aboveMedian' | 'belowMedian' | 'noResult' | 'error';

export interface NswRentCheckAddress {
  formatted_address: string;
  display_address: string;
  suburb: string;
  postcode: string;
  state: string;
  lat: number | null;
  lng: number | null;
  building_id: string;
  unit_number: string;
}

export interface NswRentCheckCreatePayload {
  email: string;
  address: NswRentCheckAddress;
  postcode: string;
  property_type: NswRentCheckPropertyType;
  bedrooms: NswRentCheckBedrooms;
  weekly_rent: number;
}

export interface NswRentCheckSavedRecord {
  id: string;
  check_number: string;
  email: string;
  address: NswRentCheckAddress;
  postcode: string;
  property_type: NswRentCheckPropertyType;
  bedrooms: NswRentCheckBedrooms;
  weekly_rent: number;
  median_rent_lower: number | null;
  median_rent_upper: number | null;
  source_extraction_date: string;
  result_state: NswRentCheckResultState;
  percent_difference: number | null;
  result_message: string;
  created_at: string;
  updated_at: string;
}

export interface NswRentCheckListResponse {
  data: NswRentCheckSavedRecord[];
  error?: string;
}

export interface NswRentCheckMutationResponse {
  data: NswRentCheckSavedRecord;
  error?: string;
}

export type ApplicationWorkStatus =
  | 'student'
  | 'part-time'
  | 'full-time'
  | 'casual'
  | 'seeking-work'
  | 'other';

export type ApplicationKitReferenceType =
  | 'previous-landlord'
  | 'employer'
  | 'teacher'
  | 'lecturer'
  | 'university-staff'
  | 'personal'
  | 'family-supporter'
  | 'other';

export interface ApplicationKitReference {
  id: string;
  type: ApplicationKitReferenceType;
  name: string;
  role: string;
  contact: string;
  note: string;
}

export interface HoodieSupportLetterSettings {
  include_in_export: boolean;
  share_student_details_consent: boolean;
}

export interface ApplicationKitApplicant {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  citizenship: string;
  visa_status: string;
  university: string;
  course_name: string;
  student_id: string;
  work_status: ApplicationWorkStatus;
  employer_name: string;
  work_address: string;
  weekly_income: number | null;
}

export interface ApplicationKitHousing {
  target_suburb: string;
  target_address: string;
  target_display_address: string;
  target_unit_number: string;
  target_building_id: string;
  target_postcode: string;
  target_state: string;
  target_lat: number | null;
  target_lng: number | null;
  target_address_verified: boolean;
  move_in_date: string;
  weekly_budget: number | null;
  occupants: number | null;
  pets: 'none' | 'yes';
  smoking: 'no' | 'yes';
  lease_length: string;
}

export interface ApplicationKitStrengths {
  no_australian_rental_history: boolean;
  savings_amount: number | null;
  guarantor_name: string;
  guarantor_contact: string;
  supporting_references: ApplicationKitReference[];
  additional_support: string;
  overseas_landlord_reference?: string;
  personal_reference_name?: string;
  personal_reference_contact?: string;
}

export interface ApplicationKitDraft {
  id: string;
  kit_number: string;
  email: string;
  applicant: ApplicationKitApplicant;
  housing: ApplicationKitHousing;
  strengths: ApplicationKitStrengths;
  document_item_ids: string[];
  application_letter: string;
  application_letter_template: string;
  application_letter_generated_at: string;
  application_letter_source_signature: string;
  application_letter_customized: boolean;
  personal_note: string;
  hoodie_support_letter: HoodieSupportLetterSettings;
  status: 'draft';
  created_at: string;
  updated_at: string;
}

export type ScamInspectionType =
  | 'in-person-available'
  | 'video-only'
  | 'not-offered'
  | 'unclear';

export type ScamContactType =
  | 'landlord'
  | 'agent'
  | 'current-tenant'
  | 'unknown';

export type ScamPaymentMethod =
  | 'bank-transfer'
  | 'cash'
  | 'crypto'
  | 'gift-card'
  | 'deposit-app'
  | 'other'
  | 'not-specified';

export type ScamProofStatus =
  | 'verified-agency'
  | 'owner-proof-shown'
  | 'unclear'
  | 'refused';

export type ScamContractStatus =
  | 'lease-shared'
  | 'promised-after-approval'
  | 'unclear'
  | 'refused';

export type ScamPaymentTiming =
  | 'none'
  | 'before-inspection'
  | 'after-inspection'
  | 'unclear';

export type ScamPressureSignal =
  | 'urgent-payment'
  | 'many-people-waiting'
  | 'limited-time-discount'
  | 'won-t-answer-questions'
  | 'pushes-off-platform';

export interface ScamCheckDraft {
  id: string;
  check_number: string;
  email: string;
  listing_url: string;
  listing_platform: string;
  contact_name: string;
  weekly_rent: number | null;
  bond_amount: number | null;
  upfront_payment_amount: number | null;
  payment_timing: ScamPaymentTiming;
  inspection_type: ScamInspectionType;
  contact_type: ScamContactType;
  payment_method: ScamPaymentMethod;
  proof_status: ScamProofStatus;
  contract_status: ScamContractStatus;
  pressure_signals: ScamPressureSignal[];
  notes: string;
  external_link: string;
  document_item_ids: string[];
  ai_analysis: ScamCheckAiReport | null;
  created_at: string;
  updated_at: string;
}

export type ScamRiskBand = 'low' | 'medium' | 'high';

export interface ScamCheckFlag {
  key: string;
  label: string;
  score: number;
  hard_stop?: boolean;
}

export interface ScamCheckResult {
  safety_score: number;
  risk_band: ScamRiskBand;
  score: number;
  hard_stop: boolean;
  flags: ScamCheckFlag[];
  rubric_breakdown: ScamRubricScore[];
  reasons: string[];
  next_steps: string[];
}

export interface ScamRubricScore {
  key: string;
  label: string;
  score: number;
  max_score: number;
  summary: string;
}

export interface ScamCheckAiReport {
  safety_score: number;
  headline: string;
  executive_summary: string;
  overall_assessment: string;
  risk_explanation: string;
  positive_signals: string[];
  watchouts: string[];
  rubric_breakdown: ScamRubricScore[];
  verification_steps: string[];
  recommended_actions: string[];
  generated_at: string;
  fallback: boolean;
}
