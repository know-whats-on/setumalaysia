import type {
  ApplicationKitDraft,
  ApplicationKitReference,
  ApplicationKitReferenceType,
  ApplicationWorkStatus,
  HoodieSupportLetterSettings,
} from './prepare-types';

export const APPLICATION_KIT_TARGET_ADDRESS_PLACEHOLDER = '{{TARGET_ADDRESS}}';

export const APPLICATION_KIT_REFERENCE_TYPE_LABELS: Record<ApplicationKitReferenceType, string> = {
  'previous-landlord': 'Previous landlord',
  employer: 'Employer or manager',
  teacher: 'Teacher',
  lecturer: 'Lecturer',
  'university-staff': 'University staff',
  personal: 'Personal reference',
  'family-supporter': 'Family or supporter',
  other: 'Other',
};

export const APPLICATION_KIT_REFERENCE_SUGGESTIONS: Array<{ type: ApplicationKitReferenceType; label: string }> = [
  { type: 'previous-landlord', label: 'Previous landlord' },
  { type: 'employer', label: 'Employer or manager' },
  { type: 'teacher', label: 'Teacher' },
  { type: 'lecturer', label: 'Lecturer' },
  { type: 'university-staff', label: 'University staff' },
  { type: 'personal', label: 'Personal reference' },
  { type: 'family-supporter', label: 'Family or supporter' },
];

export const HOODIE_SUPPORT_LETTER_DEFAULTS: HoodieSupportLetterSettings = {
  include_in_export: false,
  share_student_details_consent: false,
};

const APPLICATION_KIT_REFERENCE_TYPES: ApplicationKitReferenceType[] = [
  'previous-landlord',
  'employer',
  'teacher',
  'lecturer',
  'university-staff',
  'personal',
  'family-supporter',
  'other',
];

const APPLICATION_WORK_STATUS_VALUES: ApplicationWorkStatus[] = [
  'student',
  'part-time',
  'full-time',
  'casual',
  'seeking-work',
  'other',
];

function createReferenceId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asNumberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function isReferenceType(value: unknown): value is ApplicationKitReferenceType {
  return typeof value === 'string' && APPLICATION_KIT_REFERENCE_TYPES.includes(value as ApplicationKitReferenceType);
}

function isWorkStatus(value: unknown): value is ApplicationWorkStatus {
  return typeof value === 'string' && APPLICATION_WORK_STATUS_VALUES.includes(value as ApplicationWorkStatus);
}

export function createApplicationKitReference(type: ApplicationKitReferenceType = 'personal'): ApplicationKitReference {
  return {
    id: createReferenceId(),
    type,
    name: '',
    role: APPLICATION_KIT_REFERENCE_TYPE_LABELS[type],
    contact: '',
    note: '',
  };
}

export function normalizeDateInputValue(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function isValidDateInputValue(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(asString(value).trim());
}

export function isEduEmail(email: string) {
  return email.trim().toLowerCase().endsWith('.edu.au');
}

export function isHoodieSupportLetterEligible(kit: ApplicationKitDraft) {
  return (
    Boolean(kit.applicant.student_id.trim()) && (
      isEduEmail(kit.applicant.email) ||
      Boolean(kit.applicant.university.trim() && kit.applicant.course_name.trim())
    )
  );
}

export function buildApplicationKitReferenceSummary(reference: ApplicationKitReference) {
  return [
    reference.name,
    reference.role,
    reference.contact,
    reference.note,
  ].filter(Boolean).join(' • ');
}

export function getApplicationKitAddressLabel(kit: Pick<ApplicationKitDraft, 'housing'>) {
  return [
    kit.housing.target_display_address.trim(),
    kit.housing.target_address.trim(),
    kit.housing.target_suburb.trim(),
  ].find(Boolean) || '';
}

export function getApplicationKitAppliedAddressLabel(kit: Pick<ApplicationKitDraft, 'housing'>) {
  return getApplicationKitAddressLabel(kit) || 'the property listed in this application';
}

export function applyApplicationLetterAddress(template: string, kit: Pick<ApplicationKitDraft, 'housing'>) {
  return template.replaceAll(APPLICATION_KIT_TARGET_ADDRESS_PLACEHOLDER, getApplicationKitAppliedAddressLabel(kit));
}

export function buildApplicationLetterSourceSignature(kit: ApplicationKitDraft) {
  return JSON.stringify({
    applicant: {
      first_name: kit.applicant.first_name.trim(),
      last_name: kit.applicant.last_name.trim(),
      phone: kit.applicant.phone.trim(),
      email: kit.applicant.email.trim(),
      citizenship: kit.applicant.citizenship.trim(),
      visa_status: kit.applicant.visa_status.trim(),
      university: kit.applicant.university.trim(),
      course_name: kit.applicant.course_name.trim(),
      student_id: kit.applicant.student_id.trim(),
      work_status: kit.applicant.work_status,
      employer_name: kit.applicant.employer_name.trim(),
      work_address: kit.applicant.work_address.trim(),
      weekly_income: kit.applicant.weekly_income,
    },
    housing: {
      move_in_date: normalizeDateInputValue(kit.housing.move_in_date),
      weekly_budget: kit.housing.weekly_budget,
      occupants: kit.housing.occupants,
      pets: kit.housing.pets,
      smoking: kit.housing.smoking,
      lease_length: kit.housing.lease_length.trim(),
    },
    strengths: {
      no_australian_rental_history: kit.strengths.no_australian_rental_history,
      savings_amount: kit.strengths.savings_amount,
      guarantor_name: kit.strengths.guarantor_name.trim(),
      guarantor_contact: kit.strengths.guarantor_contact.trim(),
      supporting_references: kit.strengths.supporting_references.map((reference) => ({
        type: reference.type,
        name: reference.name.trim(),
        role: reference.role.trim(),
        contact: reference.contact.trim(),
        note: reference.note.trim(),
      })),
      additional_support: kit.strengths.additional_support.trim(),
    },
    document_item_ids: [...kit.document_item_ids].sort(),
  });
}

export function normalizeApplicationKitDraft(rawDraft: Partial<ApplicationKitDraft> | null | undefined, emailFallback = ''): ApplicationKitDraft {
  const raw = rawDraft || {};
  const rawApplicant = (raw.applicant || {}) as Partial<ApplicationKitDraft['applicant']>;
  const rawHousing = (raw.housing || {}) as Partial<ApplicationKitDraft['housing']>;
  const rawStrengths = (raw.strengths || {}) as Partial<ApplicationKitDraft['strengths']>;
  const rawSupportLetter = (raw.hoodie_support_letter || {}) as Partial<HoodieSupportLetterSettings>;

  const supportingReferences = Array.isArray(rawStrengths.supporting_references)
    ? rawStrengths.supporting_references
      .map((reference) => {
        if (!reference || typeof reference !== 'object') return null;
        const typedReference = reference as Partial<ApplicationKitReference>;
        return {
          id: asString(typedReference.id) || createReferenceId(),
          type: isReferenceType(typedReference.type) ? typedReference.type : 'personal',
          name: asString(typedReference.name),
          role: asString(typedReference.role),
          contact: asString(typedReference.contact),
          note: asString(typedReference.note),
        } satisfies ApplicationKitReference;
      })
      .filter(Boolean) as ApplicationKitReference[]
    : [];

  if (supportingReferences.length === 0) {
    const overseasLandlord = asString(rawStrengths.overseas_landlord_reference).trim();
    if (overseasLandlord) {
      supportingReferences.push({
        id: createReferenceId(),
        type: 'previous-landlord',
        name: overseasLandlord,
        role: APPLICATION_KIT_REFERENCE_TYPE_LABELS['previous-landlord'],
        contact: '',
        note: '',
      });
    }

    const personalName = asString(rawStrengths.personal_reference_name).trim();
    const personalContact = asString(rawStrengths.personal_reference_contact).trim();
    if (personalName || personalContact) {
      supportingReferences.push({
        id: createReferenceId(),
        type: 'personal',
        name: personalName,
        role: APPLICATION_KIT_REFERENCE_TYPE_LABELS.personal,
        contact: personalContact,
        note: '',
      });
    }
  }

  return {
    id: asString(raw.id),
    kit_number: asString(raw.kit_number),
    email: asString(raw.email) || emailFallback,
    applicant: {
      first_name: asString(rawApplicant.first_name),
      last_name: asString(rawApplicant.last_name),
      phone: asString(rawApplicant.phone),
      email: asString(rawApplicant.email) || asString(raw.email) || emailFallback,
      citizenship: asString(rawApplicant.citizenship),
      visa_status: asString(rawApplicant.visa_status),
      university: asString(rawApplicant.university),
      course_name: asString(rawApplicant.course_name),
      student_id: asString(rawApplicant.student_id),
      work_status: isWorkStatus(rawApplicant.work_status) ? rawApplicant.work_status : 'student',
      employer_name: asString(rawApplicant.employer_name),
      work_address: asString(rawApplicant.work_address),
      weekly_income: asNumberOrNull(rawApplicant.weekly_income),
    },
    housing: {
      target_suburb: asString(rawHousing.target_suburb),
      target_address: asString(rawHousing.target_address),
      target_display_address: asString(rawHousing.target_display_address) || asString(rawHousing.target_address),
      target_unit_number: asString(rawHousing.target_unit_number),
      target_building_id: asString(rawHousing.target_building_id),
      target_postcode: asString(rawHousing.target_postcode),
      target_state: asString(rawHousing.target_state),
      target_lat: asNumberOrNull(rawHousing.target_lat),
      target_lng: asNumberOrNull(rawHousing.target_lng),
      target_address_verified: asBoolean(rawHousing.target_address_verified),
      move_in_date: normalizeDateInputValue(rawHousing.move_in_date),
      weekly_budget: asNumberOrNull(rawHousing.weekly_budget),
      occupants: asNumberOrNull(rawHousing.occupants) ?? 1,
      pets: rawHousing.pets === 'yes' ? 'yes' : 'none',
      smoking: rawHousing.smoking === 'yes' ? 'yes' : 'no',
      lease_length: asString(rawHousing.lease_length) || '12 months',
    },
    strengths: {
      no_australian_rental_history: Boolean(rawStrengths.no_australian_rental_history),
      savings_amount: asNumberOrNull(rawStrengths.savings_amount),
      guarantor_name: asString(rawStrengths.guarantor_name),
      guarantor_contact: asString(rawStrengths.guarantor_contact),
      supporting_references: supportingReferences,
      additional_support: asString(rawStrengths.additional_support),
      overseas_landlord_reference: asString(rawStrengths.overseas_landlord_reference),
      personal_reference_name: asString(rawStrengths.personal_reference_name),
      personal_reference_contact: asString(rawStrengths.personal_reference_contact),
    },
    document_item_ids: Array.isArray(raw.document_item_ids) ? raw.document_item_ids.filter((item) => typeof item === 'string') : [],
    application_letter: asString(raw.application_letter) || asString(raw.personal_note),
    application_letter_template: asString((raw as any).application_letter_template) || asString(raw.application_letter) || asString(raw.personal_note),
    application_letter_generated_at: asString((raw as any).application_letter_generated_at),
    application_letter_source_signature: asString((raw as any).application_letter_source_signature),
    application_letter_customized: typeof (raw as any).application_letter_customized === 'boolean'
      ? Boolean((raw as any).application_letter_customized)
      : Boolean(asString(raw.application_letter).trim()),
    personal_note: asString(raw.personal_note),
    hoodie_support_letter: {
      include_in_export: Boolean(rawSupportLetter.include_in_export),
      share_student_details_consent: Boolean(rawSupportLetter.share_student_details_consent),
    },
    status: 'draft',
    created_at: asString(raw.created_at),
    updated_at: asString(raw.updated_at),
  };
}
