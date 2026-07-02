import { useState, useCallback } from 'react';
import { Shield, X, Check, HelpCircle, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateRentalEntry } from '../lib/api';
import type { RiskAssessment, RentalEntry } from '../lib/mock-data';
import { APP_CONFIG } from '../lib/app-config';

interface RiskAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  rentalEntry: RentalEntry;
  onComplete: (updated: RentalEntry) => void;
}

type TriAnswer = true | false | null; // true = Yes, false = No, null = Unsure

interface Question {
  key: keyof RiskAssessment;
  title: string;
  description: string;
  riskIfNo: string;
}

const QUESTIONS: Question[] = [
  {
    key: 'written_lease',
    title: 'Written Lease Agreement',
    description: 'Did you sign a formal, written tenancy agreement?',
    riskIfNo: 'Without a written lease, you have limited legal standing in any dispute.',
  },
  {
    key: 'bond_lodged',
    title: 'Bond Officially Lodged',
    description: 'Has your bond been officially lodged with the state authority (e.g., Fair Trading / RTBA), and did you get a receipt?',
    riskIfNo: 'Unlodged bonds are a major red flag. The landlord could keep your money with no accountability.',
  },
  {
    key: 'condition_report_received',
    title: 'Move-In Condition Report',
    description: 'Did the landlord or agent provide a formal Move-In Condition Report within 7 days?',
    riskIfNo: 'Without a condition report, you could be blamed for pre-existing damage at move-out.',
  },
  {
    key: 'pre_existing_damage',
    title: 'Pre-Existing Damage',
    description: 'Are there any existing damages or maintenance issues you noticed upon moving in?',
    riskIfNo: '', // "Yes" here is the risk signal, handled specially
  },
  {
    key: 'rent_receipts',
    title: 'Rent Payment Records',
    description: 'Are you receiving formal receipts for your rent payments (or paying via a traceable bank transfer)?',
    riskIfNo: 'Cash payments without receipts leave no proof. The landlord could claim unpaid rent.',
  },
];

function computeRiskScore(assessment: RiskAssessment): { score: string; color: string; issues: string[] } {
  const issues: string[] = [];
  let riskPoints = 0;

  if (assessment.written_lease === false || assessment.written_lease === null) {
    riskPoints += 2;
    issues.push('No written lease');
  }
  if (assessment.bond_lodged === false || assessment.bond_lodged === null) {
    riskPoints += 2;
    issues.push('Bond not officially lodged');
  }
  if (assessment.condition_report_received === false || assessment.condition_report_received === null) {
    riskPoints += 2;
    issues.push('No condition report');
  }
  if (assessment.pre_existing_damage === true && (assessment.condition_report_received === false || assessment.condition_report_received === null)) {
    riskPoints += 2; // Extra risk for the dangerous combo
    issues.push('Pre-existing damage with no condition report');
  }
  if (assessment.rent_receipts === false || assessment.rent_receipts === null) {
    riskPoints += 1;
    issues.push('No rent receipts');
  }

  if (riskPoints >= 5) return { score: 'High Risk', color: '#B91C1C', issues };
  if (riskPoints >= 3) return { score: 'Medium Risk', color: '#EA580C', issues };
  return { score: 'Low Risk', color: '#16A34A', issues };
}

function ToggleButton({
  value,
  onChange,
  label,
  activeColor,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
  activeColor: string;
}) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-medium tracking-wide transition-all cursor-pointer ${
        value
          ? 'text-white shadow-sm'
          : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E1]'
      }`}
      style={value ? { backgroundColor: activeColor, borderColor: activeColor } : {}}
    >
      {label === 'Yes' && <Check className="w-3.5 h-3.5" strokeWidth={2} />}
      {label === 'No' && <X className="w-3.5 h-3.5" strokeWidth={2} />}
      {label === 'Unsure' && <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />}
      {label}
    </button>
  );
}

export function RiskAssessmentModal({ open, onClose, rentalEntry, onComplete }: RiskAssessmentModalProps) {
  const email = localStorage.getItem('ghar_email') || '';

  const [assessment, setAssessment] = useState<RiskAssessment>({
    written_lease: null,
    bond_lodged: null,
    condition_report_received: null,
    pre_existing_damage: null,
    rent_receipts: null,
  });

  const [step, setStep] = useState<'questions' | 'result'>('questions');
  const [saving, setSaving] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answeredKeys, setAnsweredKeys] = useState<Set<string>>(new Set());

  const setAnswer = useCallback((key: keyof RiskAssessment, value: TriAnswer) => {
    setAssessment(prev => ({ ...prev, [key]: value }));
    setAnsweredKeys(prev => new Set(prev).add(key));
  }, []);

  const handleSubmit = async () => {
    const { score } = computeRiskScore(assessment);
    setSaving(true);
    try {
      const updated = await updateRentalEntry(rentalEntry.id, {
        email,
        risk_assessment: assessment,
        risk_score: score,
      });
      setStep('result');
      onComplete(updated);
    } catch (err) {
      console.error('GHAR risk assessment save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const result = computeRiskScore(assessment);
  const answeredCount = answeredKeys.size;
  const allAnswered = answeredCount === QUESTIONS.length;
  // Allow also a special "mostly answered" threshold
  const canSubmit = answeredCount >= 3;

  const address = rentalEntry.display_address || rentalEntry.address || 'your property';

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/40 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#1E40AF] rounded-xl flex items-center justify-center shadow-md shadow-[#1E40AF]/20">
                  <Shield className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A] tracking-tight">Tenancy Health Check</h2>
                  <p className="text-[10px] text-[#94A3B8] font-medium tracking-wide">MOVE-IN RISK ASSESSMENT</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Let's secure your tenancy at <span className="font-medium text-[#0F172A]">{address}</span>. Answer these quick questions so {APP_CONFIG.displayName} can identify risks early.
            </p>
          </div>

          {step === 'questions' ? (
            <>
              {/* Progress bar */}
              <div className="px-5 pt-3 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
                    Question {currentQ + 1} of {QUESTIONS.length}
                  </span>
                  <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
                    {answeredCount}/{QUESTIONS.length} Answered
                  </span>
                </div>
                <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E40AF] rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question cards */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {QUESTIONS.map((q, i) => {
                  const val = assessment[q.key];
                  const isActive = i === currentQ;
                  const isAnswered = answeredKeys.has(q.key);

                  return (
                    <button
                      key={q.key}
                      onClick={() => setCurrentQ(i)}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#1E40AF]/30 bg-[#1E40AF]/[0.03] shadow-sm'
                          : isAnswered
                          ? 'border-[#E2E8F0] bg-[#F8FAFC]'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isAnswered
                            ? val === true
                              ? 'bg-[#16A34A]/10'
                              : val === false
                              ? 'bg-[#B91C1C]/10'
                              : 'bg-[#EA580C]/10'
                            : 'bg-[#F1F5F9]'
                        }`}>
                          {isAnswered ? (
                            val === true ? (
                              <Check className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                            ) : val === false ? (
                              <X className="w-3.5 h-3.5 text-[#B91C1C]" strokeWidth={2} />
                            ) : (
                              <HelpCircle className="w-3.5 h-3.5 text-[#EA580C]" strokeWidth={2} />
                            )
                          ) : (
                            <span className="text-[10px] font-bold text-[#94A3B8]">{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-[#0F172A] tracking-tight mb-0.5">{q.title}</p>
                          <p className="text-[10px] text-[#64748B] leading-relaxed">{q.description}</p>

                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 flex gap-2"
                            >
                              <ToggleButton
                                value={val === true}
                                onChange={() => {
                                  setAnswer(q.key, true);
                                  if (i < QUESTIONS.length - 1) setTimeout(() => setCurrentQ(i + 1), 200);
                                }}
                                label="Yes"
                                activeColor="#16A34A"
                              />
                              <ToggleButton
                                value={val === false}
                                onChange={() => {
                                  setAnswer(q.key, false);
                                  if (i < QUESTIONS.length - 1) setTimeout(() => setCurrentQ(i + 1), 200);
                                }}
                                label="No"
                                activeColor="#B91C1C"
                              />
                              <ToggleButton
                                value={val === null && answeredKeys.has(q.key)}
                                onChange={() => {
                                  setAnswer(q.key, null);
                                  if (i < QUESTIONS.length - 1) setTimeout(() => setCurrentQ(i + 1), 200);
                                }}
                                label="Unsure"
                                activeColor="#EA580C"
                              />
                            </motion.div>
                          )}

                          {/* Show warning for risky answers */}
                          {isAnswered && q.riskIfNo && (
                            (q.key === 'pre_existing_damage' ? val === true : val === false || (val === null && answeredKeys.has(q.key))) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2 flex items-start gap-1.5 bg-[#FEF2F2] rounded-lg px-2.5 py-2"
                              >
                                <AlertTriangle className="w-3 h-3 text-[#B91C1C] shrink-0 mt-0.5" strokeWidth={2} />
                                <p className="text-[9px] text-[#B91C1C] leading-relaxed font-medium">
                                  {q.key === 'pre_existing_damage'
                                    ? 'Document all existing damage with timestamped photos immediately.'
                                    : q.riskIfNo}
                                </p>
                              </motion.div>
                            )
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Submit */}
              <div className="px-5 py-4 border-t border-[#E2E8F0]">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="w-full py-3 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E3A8A] transition-all shadow-md shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium tracking-wide"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Risk...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" strokeWidth={1.5} />
                      Complete Risk Assessment
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </>
                  )}
                </button>
                {!allAnswered && canSubmit && (
                  <p className="text-[9px] text-center text-[#94A3B8] mt-2">
                    You can submit with partial answers, but a complete assessment gives better results.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Result screen */
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="text-center mb-5">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${result.color}15` }}
                >
                  {result.score === 'Low Risk' ? (
                    <CheckCircle2 className="w-8 h-8" style={{ color: result.color }} strokeWidth={1.5} />
                  ) : (
                    <AlertTriangle className="w-8 h-8" style={{ color: result.color }} strokeWidth={1.5} />
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] tracking-tight mb-1">{result.score}</h3>
                <p className="text-[11px] text-[#64748B] leading-relaxed max-w-[260px] mx-auto">
                  {result.score === 'Low Risk'
                    ? 'Your tenancy setup looks solid. Keep your documentation up to date.'
                    : result.score === 'Medium Risk'
                    ? 'There are some gaps in your tenancy setup that could cause issues. Review the warnings below.'
                    : 'Your tenancy has significant vulnerabilities. Take immediate action on the items below.'}
                </p>
              </div>

              {result.issues.length > 0 && (
                <div className="space-y-2 mb-5">
                  <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">IDENTIFIED RISKS</p>
                  {result.issues.map((issue, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2]"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C] shrink-0 mt-0.5" strokeWidth={2} />
                      <p className="text-[11px] text-[#B91C1C] font-medium leading-relaxed">{issue}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary box */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-4">
                <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium mb-2">ASSESSMENT SUMMARY</p>
                {QUESTIONS.map((q) => {
                  const val = assessment[q.key];
                  return (
                    <div key={q.key} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-b-0">
                      <span className="text-[10px] text-[#64748B]">{q.title}</span>
                      <span className={`text-[10px] font-medium ${
                        val === true ? 'text-[#16A34A]' : val === false ? 'text-[#B91C1C]' : 'text-[#EA580C]'
                      }`}>
                        {val === true ? 'Yes' : val === false ? 'No' : 'Unsure'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-center text-[#94A3B8] mb-4 leading-relaxed">
                This assessment is saved to your profile and will help {APP_CONFIG.displayName} provide proactive advice.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#0F172A] text-white rounded-xl text-xs font-medium tracking-wide hover:bg-[#1E293B] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
