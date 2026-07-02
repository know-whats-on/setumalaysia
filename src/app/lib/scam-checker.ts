import type {
  ScamCheckAiReport,
  ScamCheckDraft,
  ScamCheckFlag,
  ScamCheckResult,
  ScamContractStatus,
  ScamPressureSignal,
  ScamRubricScore,
} from './prepare-types';

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asNumberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeRubricBreakdown(value: unknown): ScamRubricScore[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const typedItem = item as Partial<ScamRubricScore>;
      return {
        key: asString(typedItem.key),
        label: asString(typedItem.label),
        score: asNumberOrNull(typedItem.score) ?? 0,
        max_score: asNumberOrNull(typedItem.max_score) ?? 0,
        summary: asString(typedItem.summary),
      } satisfies ScamRubricScore;
    })
    .filter((item): item is ScamRubricScore => Boolean(item?.key));
}

function hasPressureSignal(signals: ScamPressureSignal[], signal: ScamPressureSignal) {
  return signals.includes(signal);
}

function clampScore(value: number, maxScore: number) {
  return Math.max(0, Math.min(maxScore, Math.round(value)));
}

function hasPaymentRequest(draft: ScamCheckDraft) {
  return draft.payment_timing !== 'none'
    && ((draft.upfront_payment_amount || 0) > 0 || (draft.bond_amount || 0) > 0 || (draft.weekly_rent || 0) > 0);
}

function pushFlag(
  flags: ScamCheckFlag[],
  reasons: Set<string>,
  nextSteps: Set<string>,
  key: string,
  label: string,
  score: number,
  reason: string,
  nextStep: string,
  hardStop = false,
) {
  flags.push({ key, label, score, hard_stop: hardStop });
  reasons.add(reason);
  nextSteps.add(nextStep);
}

function isKnownListingPlatform(draft: ScamCheckDraft) {
  const source = `${draft.listing_platform} ${draft.listing_url}`.toLowerCase();
  return ['domain', 'realestate', 'flatmates'].some((platform) => source.includes(platform));
}

function summarizeSection(label: string, score: number, maxScore: number, positive: string, caution: string) {
  if (score >= maxScore * 0.85) return positive;
  if (score >= maxScore * 0.55) return `${label} needs a few more checks before you rely on it.`;
  return caution;
}

export function normalizeScamCheckDraft(rawDraft: Partial<ScamCheckDraft> | null | undefined, emailFallback = ''): ScamCheckDraft {
  const raw = rawDraft || {};
  const aiAnalysis = raw.ai_analysis && typeof raw.ai_analysis === 'object'
    ? {
        safety_score: asNumberOrNull(raw.ai_analysis.safety_score) ?? 0,
        headline: asString(raw.ai_analysis.headline),
        executive_summary: asString(raw.ai_analysis.executive_summary),
        overall_assessment: asString(raw.ai_analysis.overall_assessment),
        risk_explanation: asString(raw.ai_analysis.risk_explanation),
        positive_signals: asStringArray(raw.ai_analysis.positive_signals),
        watchouts: asStringArray(raw.ai_analysis.watchouts),
        rubric_breakdown: normalizeRubricBreakdown(raw.ai_analysis.rubric_breakdown),
        verification_steps: asStringArray(raw.ai_analysis.verification_steps),
        recommended_actions: asStringArray(raw.ai_analysis.recommended_actions),
        generated_at: asString(raw.ai_analysis.generated_at),
        fallback: Boolean(raw.ai_analysis.fallback),
      } satisfies ScamCheckAiReport
    : null;

  const contractStatus = raw.contract_status;
  const normalizedContractStatus: ScamContractStatus =
    contractStatus === 'lease-shared'
    || contractStatus === 'promised-after-approval'
    || contractStatus === 'refused'
      ? contractStatus
      : 'unclear';

  return {
    id: asString(raw.id),
    check_number: asString(raw.check_number),
    email: asString(raw.email) || emailFallback,
    listing_url: asString(raw.listing_url),
    listing_platform: asString(raw.listing_platform),
    contact_name: asString(raw.contact_name),
    weekly_rent: asNumberOrNull(raw.weekly_rent),
    bond_amount: asNumberOrNull(raw.bond_amount),
    upfront_payment_amount: asNumberOrNull(raw.upfront_payment_amount),
    payment_timing: raw.payment_timing || 'none',
    inspection_type: raw.inspection_type || 'unclear',
    contact_type: raw.contact_type || 'unknown',
    payment_method: raw.payment_method || 'not-specified',
    proof_status: raw.proof_status || 'unclear',
    contract_status: normalizedContractStatus,
    pressure_signals: Array.isArray(raw.pressure_signals) ? raw.pressure_signals.filter(Boolean) as ScamPressureSignal[] : [],
    notes: asString(raw.notes),
    external_link: asString(raw.external_link),
    document_item_ids: asStringArray(raw.document_item_ids),
    ai_analysis: aiAnalysis,
    created_at: asString(raw.created_at),
    updated_at: asString(raw.updated_at),
  };
}

export function evaluateScamCheck(draft: ScamCheckDraft): ScamCheckResult {
  const flags: ScamCheckFlag[] = [];
  const reasons = new Set<string>();
  const nextSteps = new Set<string>();
  const paymentRequested = hasPaymentRequest(draft);
  const deductionNotes: string[] = [];

  let listingScore = 20;
  if (!draft.listing_url.trim() && !draft.listing_platform.trim()) {
    listingScore -= 4;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'no-listing-trail',
      'Limited listing trail',
      2,
      'There is not yet a clear listing link or platform trail to verify independently.',
      'Keep a screenshot or link for the listing so you can cross-check it later.',
    );
  }
  if (hasPressureSignal(draft.pressure_signals, 'pushes-off-platform')) {
    listingScore -= 3;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'off-platform-pressure',
      'Pushed off-platform quickly',
      1,
      'Moving the conversation off-platform too quickly weakens your paper trail.',
      'Keep the conversation on the listing platform until you have verified who you are dealing with.',
    );
  }
  if (!draft.contact_name.trim()) {
    listingScore -= 1;
  }
  if (isKnownListingPlatform(draft)) {
    listingScore += 1;
  }
  listingScore = clampScore(listingScore, 20);

  let inspectionScore = 20;
  if (draft.inspection_type === 'unclear') {
    inspectionScore = 15;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'inspection-unclear',
      'Inspection details still unclear',
      2,
      'You still need a clearer inspection path before treating the listing as settled.',
      'Ask for a written inspection time and the exact access process.',
    );
  } else if (draft.inspection_type === 'video-only') {
    inspectionScore = 12;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'video-only',
      'Video-only inspection',
      2,
      'Video-only inspections can still be genuine, but they need stronger checks before any commitment.',
      'Ask for an in-person inspection or stronger paperwork before you send money.',
    );
  } else if (draft.inspection_type === 'not-offered') {
    inspectionScore = 4;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'no-inspection',
      'No inspection offered',
      4,
      'No inspection path is a serious warning sign for a rental listing.',
      'Do not commit until an in-person inspection or a trusted alternate verification path is provided.',
    );
  }

  let paymentScore = 25;
  let hardStop = false;
  if (draft.payment_timing === 'before-inspection' && paymentRequested) {
    paymentScore = 0;
    hardStop = true;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'money-before-inspection',
      'Money requested before inspection',
      6,
      'Money is being requested before a proper inspection has happened.',
      'Do not transfer money until you have independently verified the property, the person, and the inspection path.',
      true,
    );
  } else if (draft.payment_timing === 'after-inspection') {
    paymentScore -= 3;
  } else if (draft.payment_timing === 'unclear' && paymentRequested) {
    paymentScore -= 7;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'payment-timing-unclear',
      'Payment timing unclear',
      2,
      'The payment timing is still unclear, which makes the process harder to verify safely.',
      'Ask exactly when any holding fee, bond, or first payment would be due.',
    );
  }

  if (draft.payment_method === 'cash') {
    paymentScore -= 8;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'cash-payment',
      'Cash requested',
      3,
      'Cash makes disputes and proof of payment harder later on.',
      'Prefer a traceable payment method once the listing is verified.',
    );
  }
  if (draft.payment_method === 'deposit-app') {
    paymentScore -= 4;
  }
  if (draft.payment_method === 'other' && paymentRequested) {
    paymentScore -= 3;
  }
  if (draft.payment_method === 'crypto' || draft.payment_method === 'gift-card') {
    paymentScore = 0;
    hardStop = true;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'irreversible-payment',
      'Irreversible payment method',
      6,
      'Crypto and gift-card payments are not normal for a standard Australian rental process and are hard to recover.',
      'Refuse irreversible payment methods entirely.',
      true,
    );
  }
  if (hasPressureSignal(draft.pressure_signals, 'urgent-payment')) {
    paymentScore -= 2;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'urgent-payment',
      'Urgent payment pressure',
      1,
      'Urgency on its own is not proof of a scam, but it reduces your time to check the details properly.',
      'Slow the process down and verify the listing before you pay or share sensitive documents.',
    );
  }
  if (hasPressureSignal(draft.pressure_signals, 'limited-time-discount')) {
    paymentScore -= 2;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'discount-pressure',
      'Discount for paying quickly',
      1,
      'A discount tied to fast payment is a caution sign that deserves extra verification.',
      'Compare the asking rent with similar listings before relying on the offer.',
    );
  }
  paymentScore = clampScore(paymentScore, 25);

  let fairnessScore = 15;
  const weeklyRent = draft.weekly_rent || 0;
  const bondAmount = draft.bond_amount || 0;
  const upfrontAmount = draft.upfront_payment_amount || 0;
  if (weeklyRent > 0 && bondAmount > weeklyRent * 4) {
    fairnessScore -= 8;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'bond-high',
      'Bond looks higher than expected',
      3,
      'The bond amount appears higher than a standard four-week bond.',
      'Check the bond amount against your state rules before agreeing to it.',
    );
  } else if (weeklyRent > 0 && bondAmount > 0 && bondAmount > weeklyRent * 2) {
    fairnessScore -= 1;
  }
  if (upfrontAmount > 0) {
    if (weeklyRent > 0 && upfrontAmount > weeklyRent) {
      fairnessScore -= 5;
      pushFlag(
        flags,
        reasons,
        nextSteps,
        'large-upfront',
        'Large upfront ask',
        3,
        'The upfront amount is larger than a normal holding-fee style ask.',
        'Ask for a written breakdown of every amount before agreeing to it.',
      );
    } else {
      fairnessScore -= 2;
    }
  }
  if (draft.payment_timing === 'before-inspection' && paymentRequested) {
    fairnessScore -= 4;
  }
  fairnessScore = clampScore(fairnessScore, 15);

  let paperworkScore = 20;
  if (draft.proof_status === 'unclear') {
    paperworkScore -= 6;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'proof-unclear',
      'Authority still unclear',
      2,
      'The person offering the property has not yet clearly proved they can manage or lease it.',
      'Verify the agency, landlord, or owner through an official website or independent contact channel.',
    );
  } else if (draft.proof_status === 'refused') {
    paperworkScore -= 14;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'proof-refused',
      'Proof refused',
      5,
      'They refused to show proof that they can legally offer the property.',
      'Do not proceed until formal proof is provided.',
    );
    if (paymentRequested) {
      hardStop = true;
      flags[flags.length - 1].hard_stop = true;
    }
  }

  if (draft.contract_status === 'promised-after-approval') {
    paperworkScore -= 3;
  } else if (draft.contract_status === 'unclear') {
    paperworkScore -= 6;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'contract-unclear',
      'Paperwork still unclear',
      2,
      'The lease or formal paperwork process is still unclear.',
      'Ask when the lease, application terms, and payment instructions will be shared in writing.',
    );
  } else if (draft.contract_status === 'refused') {
    paperworkScore -= 14;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'contract-refused',
      'Paperwork refused',
      5,
      'Refusing to share normal lease paperwork is a serious warning sign.',
      'Pause the process until the lease and written terms are provided.',
    );
    if (paymentRequested) {
      hardStop = true;
      flags[flags.length - 1].hard_stop = true;
    }
  }

  if (draft.contact_type === 'unknown') {
    paperworkScore -= 3;
  } else if (draft.contact_type === 'current-tenant') {
    paperworkScore -= 4;
  }

  if (hasPressureSignal(draft.pressure_signals, 'won-t-answer-questions')) {
    paperworkScore -= 2;
    pushFlag(
      flags,
      reasons,
      nextSteps,
      'dodging-questions',
      'Dodging verification questions',
      2,
      'Avoiding basic questions makes the listing harder to verify confidently.',
      'Ask for direct written answers about identity, paperwork, and the inspection process.',
    );
  }
  paperworkScore = clampScore(paperworkScore, 20);

  if (draft.inspection_type === 'not-offered' && paymentRequested) {
    hardStop = true;
  }

  const rubricBreakdown: ScamRubricScore[] = [
    {
      key: 'listing-authenticity',
      label: 'Listing authenticity & paper trail',
      score: listingScore,
      max_score: 20,
      summary: summarizeSection(
        'The listing trail',
        listingScore,
        20,
        'The listing trail looks reasonably easy to verify and keep on record.',
        'The listing trail is weak enough that you should gather stronger proof before relying on it.',
      ),
    },
    {
      key: 'inspection-access',
      label: 'Inspection & access',
      score: inspectionScore,
      max_score: 20,
      summary: summarizeSection(
        'Inspection access',
        inspectionScore,
        20,
        'There is a workable inspection path, which lowers uncertainty.',
        'Inspection access is too limited right now and needs stronger verification.',
      ),
    },
    {
      key: 'payment-method',
      label: 'Payment timing & method',
      score: paymentScore,
      max_score: 25,
      summary: summarizeSection(
        'Payment timing and method',
        paymentScore,
        25,
        'The payment setup does not show major problems from the answers provided.',
        'The payment setup contains risk signals that should be resolved before any transfer.',
      ),
    },
    {
      key: 'bond-fairness',
      label: 'Bond / upfront fairness',
      score: fairnessScore,
      max_score: 15,
      summary: summarizeSection(
        'The bond and upfront asks',
        fairnessScore,
        15,
        'The bond and upfront asks sit within a fairly normal range from the details provided.',
        'The money being requested looks higher or earlier than expected and needs checking.',
      ),
    },
    {
      key: 'paperwork-identity',
      label: 'Paperwork & identity verification',
      score: paperworkScore,
      max_score: 20,
      summary: summarizeSection(
        'Paperwork and identity verification',
        paperworkScore,
        20,
        'The paperwork and identity path looks reasonably solid so far.',
        'The paperwork or identity path is weak enough that you should not rely on it yet.',
      ),
    },
  ];

  const safetyScore = clampScore(
    rubricBreakdown.reduce((total, section) => total + section.score, 0),
    100,
  );
  const riskBand = hardStop || safetyScore < 40
    ? 'high'
    : safetyScore < 80
      ? 'medium'
      : 'low';

  if (reasons.size === 0) {
    reasons.add('The answers provided suggest a fairly standard listing path, but you should still verify the paperwork and payment steps before committing.');
  }

  if (riskBand === 'low') {
    nextSteps.add('Keep screenshots of the listing and confirm the inspection and paperwork details in writing.');
  } else if (riskBand === 'medium') {
    nextSteps.add('Pause before sending documents or money until the open questions have been clarified in writing.');
  } else {
    nextSteps.add('Treat this listing as unsafe until the inspection, paperwork, and payment path are independently verified.');
  }

  return {
    safety_score: safetyScore,
    risk_band: riskBand,
    score: 100 - safetyScore,
    hard_stop: hardStop,
    flags,
    rubric_breakdown: rubricBreakdown,
    reasons: Array.from(reasons),
    next_steps: Array.from(nextSteps),
  };
}

export function buildFallbackScamAiReport(draft: ScamCheckDraft, result: ScamCheckResult): ScamCheckAiReport {
  const listingLabel = [draft.listing_platform, draft.listing_url].filter(Boolean).join(' • ') || 'this listing';
  const positiveSignals: string[] = [];
  const watchouts: string[] = [];

  if (draft.inspection_type === 'in-person-available') {
    positiveSignals.push('An in-person inspection path is available.');
  }
  if (draft.proof_status === 'verified-agency' || draft.proof_status === 'owner-proof-shown') {
    positiveSignals.push('The person offering the property has provided some formal proof.');
  }
  if (draft.payment_timing === 'none') {
    positiveSignals.push('No early payment has been requested yet.');
  }
  if (draft.contract_status === 'lease-shared') {
    positiveSignals.push('The lease or paperwork has already been shared.');
  }

  if (positiveSignals.length === 0) {
    positiveSignals.push('There are still some workable verification steps available before you commit.');
  }

  if (result.flags.length > 0) {
    watchouts.push(...result.flags.map((flag) => flag.label));
  } else {
    watchouts.push('No major warning signs were triggered from the answers provided.');
  }

  return {
    safety_score: result.safety_score,
    headline: result.risk_band === 'low'
      ? 'Mostly standard listing path'
      : result.risk_band === 'medium'
        ? 'Some checks still needed'
        : 'Strong caution before proceeding',
    executive_summary: result.risk_band === 'low'
      ? `This listing currently looks fairly standard for ${listingLabel}, with a workable inspection and paperwork path from the details provided.`
      : result.risk_band === 'medium'
        ? `This listing has some normal signals, but there are still enough open questions in ${listingLabel} that you should verify the process carefully before committing.`
        : `This listing shows risk patterns that should be treated seriously until the process is independently verified.`,
    overall_assessment: result.reasons.join(' '),
    risk_explanation: result.reasons.join(' '),
    positive_signals: positiveSignals.slice(0, 4),
    watchouts: Array.from(new Set(watchouts)).slice(0, 5),
    rubric_breakdown: result.rubric_breakdown,
    verification_steps: Array.from(new Set([
      draft.listing_url ? 'Keep a screenshot of the listing and every message.' : 'Keep a record of every message and request you receive.',
      draft.inspection_type === 'in-person-available'
        ? 'Confirm the inspection time, exact address, and who will meet you.'
        : 'Ask for a clear in-person inspection or a stronger verification path before paying anything.',
      draft.contract_status === 'lease-shared'
        ? 'Read the lease carefully and confirm the payment instructions match the agency or owner details.'
        : 'Ask when the lease and written payment terms will be shared.',
      ...result.next_steps,
    ])).slice(0, 6),
    recommended_actions: result.next_steps.slice(0, 6),
    generated_at: new Date().toISOString(),
    fallback: true,
  };
}
