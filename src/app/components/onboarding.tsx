import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowRight, ArrowLeft, Check, User, MapPin, GraduationCap, Search, ChevronDown, Loader2, Info } from 'lucide-react';
import { allCountries, getStatesForCountry, getCountryName } from '../lib/geo-data';
import { australianUniversities, australianStates } from '../lib/au-universities';
import { isReviewerAccessConfigured, isReviewerBypassEmail } from '../lib/api';
import type { ProfilePayload } from '../lib/api';
import { APP_CONFIG } from '../lib/app-config';
import { HoodieLogoLoop } from './hoodie-launch-splash';
import { SetuPartnershipBadge } from './setu-partnership-badge';
import { SetuChinaGoldBrandPill, SetuChinaWordmarkLogo, setuChinaLandingBackground, setuIndiaLandingBackground } from './setu-china-launch-art';
import { Link } from 'react-router';
import { buildHciLogoDataUri } from '../lib/email-header-svg';
import setuLandscapeBlackLogo from '../../assets/setu-landscape-black.svg';
import mascaPartnership from '../../assets/masca-partnership.svg';

function AppBrandLockup({
  className,
  compact = false,
  showDescriptor = false,
  showWordmark = true,
  animateMarker = false,
}: {
  className?: string;
  compact?: boolean;
  showDescriptor?: boolean;
  showWordmark?: boolean;
  animateMarker?: boolean;
}) {
  const descriptorLines = (APP_CONFIG.onboardingDescriptor || '').split('\n').filter(Boolean);
  const isSetuChinaBrand = APP_CONFIG.variant === 'setu_china';
  const wordmarkClass = compact
    ? APP_CONFIG.onboardingWordmark.length > 8
      ? 'text-[1.15rem] sm:text-[1.25rem] tracking-[0.03em]'
      : 'text-[1.8rem] tracking-[0.08em]'
    : APP_CONFIG.onboardingWordmark.length > 8
      ? 'text-[2rem] sm:text-[2.5rem] tracking-[0.03em]'
      : 'text-[3.35rem] sm:text-[3.85rem] tracking-[0.08em]';

  if (isSetuChinaBrand) {
    return (
      <div className={`flex flex-col items-center text-center ${className ?? ''}`}>
        {showWordmark ? (
          <SetuChinaWordmarkLogo compact={compact} />
        ) : (
          <motion.img
            src={APP_CONFIG.onboardingMarker}
            alt={APP_CONFIG.onboardingMarkerAlt}
            className={`${compact ? 'w-[3.75rem] sm:w-[4.25rem]' : 'w-[7.75rem] sm:w-[8.5rem]'} h-auto object-contain drop-shadow-[0_22px_35px_rgba(15,23,42,0.16)]`}
            animate={animateMarker ? { y: [0, -7, 0], scale: [1, 1.015, 1] } : undefined}
            transition={animateMarker ? { duration: 4.6, ease: 'easeInOut', repeat: Infinity } : undefined}
          />
        )}
        {showDescriptor && descriptorLines.length > 0 && (
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#233043] sm:text-xs">
            {descriptorLines.map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className ?? ''}`}>
      <div className={`relative ${compact ? 'w-[3.75rem] sm:w-[4.25rem]' : 'w-[7.75rem] sm:w-[8.5rem]'}`}>
        {APP_CONFIG.variant === 'burb_mate' ? (
          <HoodieLogoLoop
            className="h-auto w-full object-contain drop-shadow-[0_22px_35px_rgba(15,23,42,0.16)]"
            label={APP_CONFIG.onboardingMarkerAlt}
            animate={animateMarker}
            backdrop="transparent"
            tone={compact ? 'light' : 'dark'}
          />
        ) : (
          <motion.img
            src={APP_CONFIG.onboardingMarker}
            alt={APP_CONFIG.onboardingMarkerAlt}
            className="h-auto w-full object-contain drop-shadow-[0_22px_35px_rgba(15,23,42,0.16)]"
            animate={animateMarker ? { y: [0, -7, 0], scale: [1, 1.015, 1] } : undefined}
            transition={animateMarker ? { duration: 4.6, ease: 'easeInOut', repeat: Infinity } : undefined}
          />
        )}
      </div>
      <div className={compact ? 'mt-1' : 'mt-2.5'}>
        {showWordmark && (
          <p
            className={`text-[#111111] font-black ${APP_CONFIG.variant === 'ghar' ? 'uppercase' : ''} ${wordmarkClass}`}
          >
            {APP_CONFIG.onboardingWordmark}
          </p>
        )}
        {showDescriptor && descriptorLines.length > 0 && (
          <p className="mt-1 text-[11px] sm:text-xs leading-relaxed font-semibold text-[#233043]">
            {descriptorLines.map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

// Detect .edu.au email
function isEduAuEmail(email: string): boolean {
  return email.toLowerCase().trim().endsWith('.edu.au');
}

// Generate a slug-based university_id from the university name
function generateUniversityId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function findCountryCode(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return allCountries.find((country) =>
    country.value.toLowerCase() === normalized || country.label.toLowerCase() === normalized
  )?.value || '';
}

function findHomeStateCode(countryCode: string, value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!countryCode || !normalized) return '';
  return getStatesForCountry(countryCode).find((state) =>
    state.value.toLowerCase() === normalized || state.label.toLowerCase() === normalized
  )?.value || '';
}

function findAustralianStateCode(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return australianStates.find((state) =>
    state.value.toLowerCase() === normalized || state.label.toLowerCase() === normalized
  )?.value || '';
}

function normalizePhoneInput(value?: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('61')) return digits.slice(2).slice(0, 10);
  if (digits.startsWith('0')) return digits.replace(/^0+/, '').slice(0, 10);
  return digits.slice(0, 10);
}

interface OnboardingProps {
  onSendOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, code: string) => Promise<void>;
  onComplete: (profile: ProfilePayload) => void;
  initialProfile?: Partial<ProfilePayload> | null;
}

type Step = 'splash' | 'email' | 'otp' | 'personal' | 'location' | 'academic';

const PROFILE_STEPS: Step[] = ['personal', 'location', 'academic'];

export function Onboarding({ onSendOtp, onVerifyOtp, onComplete, initialProfile }: OnboardingProps) {
  const [step, setStep] = useState<Step>('splash');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [citizenship, setCitizenship] = useState(
    APP_CONFIG.variant === 'setu_china' ? 'CN' : APP_CONFIG.variant === 'jom_settle' ? 'MY' : APP_CONFIG.variant === 'ghar' ? 'IN' : '',
  );
  const [homeState, setHomeState] = useState('');
  const [auState, setAuState] = useState('');
  const [university, setUniversity] = useState('');
  const [courseName, setCourseName] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [profileError, setProfileError] = useState('');
  const [audienceMode, setAudienceMode] = useState<'student' | 'newcomer'>(APP_CONFIG.newcomerModeDefault);

  // Dropdown search states
  const [citizenshipSearch, setCitizenshipSearch] = useState('');
  const [homeStateSearch, setHomeStateSearch] = useState('');
  const [uniSearch, setUniSearch] = useState('');
  const [showCitizenshipDropdown, setShowCitizenshipDropdown] = useState(false);
  const [showHomeStateDropdown, setShowHomeStateDropdown] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [splashMessageIndex, setSplashMessageIndex] = useState(0);
  const [typedTagline, setTypedTagline] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const supportsAudienceSelection = APP_CONFIG.experienceMode === 'hoodie';
  const normalizedAudienceMode = supportsAudienceSelection ? audienceMode : 'student';
  const requiresAcademicStep = normalizedAudienceMode === 'student';

  // Countries list
  const countries = useMemo(() =>
    allCountries,
    []
  );

  // States based on selected citizenship country
  const homeStates = useMemo(() => {
    if (!citizenship) return [];
    return getStatesForCountry(citizenship);
  }, [citizenship]);

  // Filtered lists
  const filteredCountries = useMemo(() =>
    countries.filter(c => c.label.toLowerCase().includes(citizenshipSearch.toLowerCase())).slice(0, 12),
    [countries, citizenshipSearch]
  );

  const filteredHomeStates = useMemo(() =>
    homeStates.filter(s => s.label.toLowerCase().includes(homeStateSearch.toLowerCase())).slice(0, 12),
    [homeStates, homeStateSearch]
  );

  const filteredUnis = useMemo(() =>
    australianUniversities.filter(u => u.toLowerCase().includes(uniSearch.toLowerCase())).slice(0, 8),
    [uniSearch]
  );

  // Graduation years
  const validateGradYear = (val: string) => {
    const num = parseInt(val);
    return val.length === 4 && !isNaN(num) && num >= 1950 && num <= 2050;
  };

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        setShowCitizenshipDropdown(false);
        setShowHomeStateDropdown(false);
        setShowUniDropdown(false);
      }, 150);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!initialProfile) return;

    const nextCitizenship = findCountryCode(initialProfile.citizenship);
    setEmail(initialProfile.email || '');
    setFirstName(initialProfile.first_name || '');
    setLastName(initialProfile.last_name || '');
    setDob(initialProfile.dob || '');
    setPhone(normalizePhoneInput(initialProfile.phone));
    setCitizenship(nextCitizenship);
    setHomeState(findHomeStateCode(nextCitizenship, initialProfile.home_state));
    setAuState(findAustralianStateCode(initialProfile.australian_state));
    setAudienceMode(initialProfile.audience_mode === 'student' ? 'student' : APP_CONFIG.newcomerModeDefault);
    setUniversity(initialProfile.university || '');
    setCourseName(initialProfile.course_name || '');
    setGradYear(initialProfile.graduation_year ? String(initialProfile.graduation_year) : '');
    setProfileError('');
  }, [initialProfile]);

  const selectedCountryName = useMemo(() =>
    getCountryName(citizenship) || '',
    [citizenship]
  );

  const selectedHomeStateName = useMemo(() =>
    homeStates.find(s => s.value === homeState)?.label || '',
    [homeStates, homeState]
  );

  // ─── Handlers ─────────────────────────────────────────────

  const handleEmailSubmit = async () => {
    if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setSending(true);
    try {
      await onSendOtp(email);
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]*$/.test(normalized)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = normalized.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    if (normalized && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (newDigits.every(d => d !== '') && newDigits.join('').length === 6) {
      verifyCode(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setOtpDigits(newDigits);
      otpRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  };

  const verifyCode = async (code: string) => {
    setVerifying(true);
    try {
      await onVerifyOtp(email, code);
      setStep('personal');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setSending(true);
    try {
      await onSendOtp(email);
      setResendTimer(60);
      setOtpError('');
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setSending(false);
    }
  };

  const validatePersonal = () => {
    if (!firstName.trim()) { setProfileError('First name is required'); return false; }
    if (!lastName.trim()) { setProfileError('Last name is required'); return false; }
    if (!dob) { setProfileError('Date of birth is required'); return false; }
    if (!phone.trim()) { setProfileError('Phone number is required'); return false; }
    setProfileError('');
    return true;
  };

  const validateLocation = () => {
    if (!citizenship) { setProfileError('Please select your citizenship'); return false; }
    if (!auState) { setProfileError('Please select your Australian state'); return false; }
    setProfileError('');
    return true;
  };

  const validateAcademic = () => {
    if (!university) { setProfileError('Please select your university'); return false; }
    if (!courseName.trim()) { setProfileError('Course name is required'); return false; }
    if (!validateGradYear(gradYear)) { setProfileError('Graduation year is required and must be between 1950 and 2050'); return false; }
    setProfileError('');
    return true;
  };

  const submitProfile = () => {
    onComplete({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      dob,
      phone: '+61' + phone.replace(/^0+/, ''),
      email,
      citizenship: selectedCountryName,
      home_state: selectedHomeStateName,
      australian_state: auState,
      audience_mode: normalizedAudienceMode,
      university: requiresAcademicStep ? university : '',
      university_id: requiresAcademicStep ? generateUniversityId(university) : '',
      email_type: isEduAuEmail(email) ? 'edu_au' : 'standard',
      course_name: requiresAcademicStep ? courseName.trim() : '',
      graduation_year: requiresAcademicStep ? parseInt(gradYear) || null : null,
      postcode: '',
    });

    if (requiresAcademicStep && university) {
      localStorage.setItem('ghar_university', university);
    } else {
      localStorage.removeItem('ghar_university');
    }
  };

  const handleProfileNext = () => {
    if (step === 'personal' && validatePersonal()) setStep('location');
    else if (step === 'location' && validateLocation()) {
      if (requiresAcademicStep) setStep('academic');
      else submitProfile();
    }
    else if (step === 'academic' && validateAcademic()) {
      submitProfile();
    }
  };

  const handleProfileBack = () => {
    setProfileError('');
    if (step === 'location') setStep('personal');
    else if (step === 'academic') setStep('location');
  };

  const profileSteps = useMemo(() => (
    requiresAcademicStep ? PROFILE_STEPS : PROFILE_STEPS.filter((profileStep) => profileStep !== 'academic')
  ), [requiresAcademicStep]);

  const currentProfileStep = profileSteps.indexOf(step as Step);
  const isProfileStep = currentProfileStep >= 0;

  // ─── Shared Styles ───────────────────────────────────────────
  const inputClass = "w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 transition-all";
  const btnPrimary = "w-full py-3.5 bg-[#1E40AF] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E3A8A] transition-all shadow-lg shadow-[#1E40AF]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const btnAccent = "w-full py-3.5 bg-[#EE811A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#D97316] transition-all shadow-lg shadow-[#EE811A]/20 cursor-pointer disabled:opacity-50";
  const labelClass = "text-xs tracking-wide text-[#64748B] mb-1.5 block font-medium";

  const splashIconMap = {
    shield: Shield,
    search: Search,
    user: User,
  } as const;

  const splashMessages = APP_CONFIG.splashMessages.map((message) => ({
    body: message.body,
    cta: message.cta,
    Icon: splashIconMap[message.icon],
  }));

  const currentSplashMessage = splashMessages[splashMessageIndex];
  const SplashCtaIcon = currentSplashMessage.Icon;
  const taglineDone = typedTagline === currentSplashMessage.body;
  const isSetuChinaSplash = APP_CONFIG.variant === 'setu_china';
  const isSetuIndiaSplash = APP_CONFIG.variant === 'ghar';
  const isMalaysiaSplash = APP_CONFIG.variant === 'jom_settle';
  const isWolliSplash = APP_CONFIG.variant === 'wheres_wolli';
  const isSetuBespokeSplash = isSetuChinaSplash || isSetuIndiaSplash;
  const isHoodieSplash = APP_CONFIG.experienceMode === 'hoodie' && !isSetuBespokeSplash && !isMalaysiaSplash && !isWolliSplash;
  const emailHeading = isMalaysiaSplash ? 'Sahkan identiti anda' : 'Verify your identity';
  const emailBody = isMalaysiaSplash
    ? 'Masukkan email untuk terima kod selamat daripada'
    : 'Enter your email to receive a secure code from';
  const studentEmailHint = isMalaysiaSplash
    ? '.edu.au emails diproses cepat untuk students, tapi newcomers boleh guna mana-mana email dan habiskan setup tanpa university details.'
    : '.edu.au emails are fast-tracked for students, but newcomers can use any email and finish setup without university details.';
  const alumniEmailHint = isMalaysiaSplash
    ? '.edu.au emails diproses cepat. Alumni dan graduates boleh guna mana-mana email dan verify university details kemudian.'
    : '.edu.au emails are fast-tracked. Alumni & graduates can use any email and verify their university details later.';
  const reviewerAccessCopy = isMalaysiaSplash
    ? 'Reviewer access aktif untuk review credentials yang dikonfigurasi.'
    : 'Reviewer access is enabled for configured review credentials.';
  const reviewerBypassCopy = isMalaysiaSplash
    ? 'Email ini boleh guna reviewer access code yang dikonfigurasi tanpa tunggu email delivery.'
    : 'This email can use the configured reviewer access code instead of waiting for email delivery.';
  const sendCodeLabel = isMalaysiaSplash ? 'Hantar Kod Verifikasi' : 'Send Verification Code';
  const termsCopy = isMalaysiaSplash ? 'Dengan teruskan, anda setuju dengan' : 'By continuing you agree to our';
  const otpHeading = isMalaysiaSplash ? 'Masukkan Kod Verifikasi' : 'Enter Verification Code';
  const otpBody = isMalaysiaSplash ? 'Kami hantar kod 6 aksara ke' : 'We sent a 6-character code to';
  const verifyingLabel = isMalaysiaSplash ? 'Memeriksa...' : 'Verifying...';
  const resendLabel = isMalaysiaSplash ? 'Hantar semula kod' : 'Resend code';
  const resendCountdownLabel = (seconds: number) => isMalaysiaSplash ? `Hantar semula dalam ${seconds}s` : `Resend in ${seconds}s`;
  const changeEmailLabel = isMalaysiaSplash ? 'Tukar email' : 'Change email';
  const profileWelcomeCopy = isMalaysiaSplash
    ? `Selamat datang, ${firstName || 'kawan'}. Jom siapkan profil ${APP_CONFIG.displayName} anda.`
    : `Welcome, ${firstName || 'friend'}. Let's get your ${APP_CONFIG.displayName} profile ready.`;
  const profileStepLabels = isMalaysiaSplash
    ? {
        personal: 'Peribadi',
        arrival: 'Arrival',
        location: 'Lokasi',
        student: 'Student',
        academic: 'Akademik',
      }
    : {
        personal: 'Personal',
        arrival: 'Arrival',
        location: 'Location',
        student: 'Student',
        academic: 'Academic',
      };
  const hciLogoDataUri = useMemo(
    () => (isSetuIndiaSplash ? buildHciLogoDataUri('light') : ''),
    [isSetuIndiaSplash],
  );
  const splashBackground = isHoodieSplash
    ? {
        shell: 'bg-[#050505]',
        top: 'linear-gradient(135deg, rgba(251,212,51,0.76) 0%, rgba(251,212,51,0.24) 42%, rgba(5,5,5,0) 100%)',
        middle: 'bg-white/8 shadow-[0_0_90px_rgba(255,255,255,0.08)]',
        bottom: 'linear-gradient(180deg, rgba(25,25,25,0.9) 0%, rgba(5,5,5,1) 60%, rgba(251,212,51,0.16) 100%)',
        glow: 'radial-gradient(circle at 50% 34%, rgba(251,212,51,0.26) 0%, rgba(251,212,51,0.08) 28%, rgba(5,5,5,0) 58%)',
        blend: 'radial-gradient(circle at 18% 18%, rgba(251,212,51,0.22) 0%, rgba(251,212,51,0) 35%), radial-gradient(circle at 82% 84%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 30%)',
        topOrb: 'radial-gradient(circle, rgba(251,212,51,0.84) 0%, rgba(251,212,51,0.22) 44%, rgba(251,212,51,0) 78%)',
        bottomOrb: 'radial-gradient(circle, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.12) 42%, rgba(255,255,255,0) 78%)',
      }
    : {
        shell: 'bg-[#F6F0E2]',
        top: 'linear-gradient(125deg, rgba(255, 207, 117, 1) 0%, rgba(243, 155, 73, 0.98) 40%, rgba(230, 116, 63, 0.95) 100%)',
        middle: 'bg-white shadow-[0_0_90px_rgba(255,255,255,0.95)]',
        bottom: 'linear-gradient(120deg, rgba(171, 210, 92, 0.98) 0%, rgba(128, 179, 70, 0.97) 42%, rgba(67, 136, 92, 0.98) 100%)',
        glow: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.24) 28%, rgba(255,255,255,0) 55%)',
        blend: 'radial-gradient(circle at 18% 18%, rgba(255, 225, 166, 0.72) 0%, rgba(255, 225, 166, 0) 35%), radial-gradient(circle at 82% 84%, rgba(183, 228, 122, 0.66) 0%, rgba(183, 228, 122, 0) 32%)',
        topOrb: 'radial-gradient(circle, rgba(255, 215, 125, 0.95) 0%, rgba(255, 168, 72, 0.72) 38%, rgba(255, 168, 72, 0) 74%)',
        bottomOrb: 'radial-gradient(circle, rgba(170, 219, 103, 0.95) 0%, rgba(100, 172, 84, 0.72) 40%, rgba(100, 172, 84, 0) 76%)',
      };

  useEffect(() => {
    if (step !== 'splash') return;

    setTypedTagline('');

    const message = currentSplashMessage.body;
    const startDelay = splashMessageIndex === 0 ? 300 : 0;
    const typingSpeed = 18;
    const holdDuration = 2600;
    let charIndex = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const typeNext = () => {
      charIndex += 1;
      setTypedTagline(message.slice(0, charIndex));

      if (charIndex < message.length) {
        timer = setTimeout(typeNext, typingSpeed);
        return;
      }

      timer = setTimeout(() => {
        setSplashMessageIndex((index) => (index + 1) % splashMessages.length);
      }, holdDuration);
    };

    timer = setTimeout(typeNext, startDelay);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, splashMessageIndex, currentSplashMessage.body, splashMessages.length]);

  useEffect(() => {
    if (step === 'splash') return;
    setSplashMessageIndex(0);
    setTypedTagline('');
  }, [step]);

  if (step === 'splash' && isSetuBespokeSplash) {
    const splashArt = isSetuIndiaSplash ? setuIndiaLandingBackground : setuChinaLandingBackground;
    const splashMessage = '发现中文友好的校园活动、求职讲座和社区支持，留学生活更精彩！';
    const ctaLabel = isSetuIndiaSplash ? 'Start SETU' : '查看活动';
    const CtaIcon = Search;
    return (
      <div
        className="relative size-full overflow-hidden bg-[#FBE4B8]"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <img
          src={splashArt}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#C63B22]/16" />
        <div
          className="relative z-10 flex h-full flex-col items-center px-6 text-center"
          style={{
            paddingTop: 'calc(var(--native-safe-area-top) + clamp(4.25rem, 8vh, 6rem))',
            paddingBottom: 'calc(var(--native-safe-area-bottom) + 1.25rem)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {isSetuIndiaSplash ? (
              <div className="aspect-[548/153] w-[min(58vw,14rem)] overflow-hidden drop-shadow-[0_8px_18px_rgba(255,255,255,0.55)]">
                <img
                  src={setuLandscapeBlackLogo}
                  alt="SETU"
                  className="h-full w-auto max-w-none object-contain"
                />
              </div>
            ) : (
              <SetuChinaWordmarkLogo hero />
            )}
          </motion.div>

          {isSetuIndiaSplash ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <p className="text-sm font-black tracking-[0.18em] text-[#6B3B10] drop-shadow-[0_1px_8px_rgba(255,255,255,0.65)]">
                in partnership with
              </p>
              <img
                src={hciLogoDataUri}
                alt="High Commission of India"
                className="h-auto w-[min(74vw,19rem)] object-contain drop-shadow-[0_10px_20px_rgba(255,255,255,0.55)]"
              />
            </motion.div>
          ) : null}

          <div className="mt-auto w-full max-w-[24rem] pb-4 sm:pb-6">
            {!isSetuIndiaSplash ? (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.45, ease: 'easeOut' }}
                className="mx-auto max-w-[21rem] text-lg font-black leading-relaxed text-[#5B260A] sm:text-xl"
                style={{
                  WebkitTextStroke: '1px rgba(255, 250, 226, 0.98)',
                  paintOrder: 'stroke fill',
                  textShadow:
                    '0 2px 10px rgba(70, 28, 5, 0.34), 0 0 2px rgba(255, 255, 255, 0.98)',
                }}
              >
                {splashMessage}
              </motion.p>
            ) : null}
            <motion.button
              type="button"
              onClick={() => setStep('email')}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
              className="mt-6 flex w-full items-center justify-center gap-4 rounded-[2rem] border border-[#FFE999] px-6 py-4 text-xl font-black text-[#3B2109] shadow-[0_16px_45px_rgba(133,62,6,0.24)] transition-transform active:scale-[0.985]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,249,199,0.98) 0%, rgba(255,219,86,0.98) 52%, rgba(237,171,36,0.98) 100%)',
              }}
            >
              <CtaIcon className="h-7 w-7" />
              <span>{ctaLabel}</span>
              <ArrowRight className="h-7 w-7" />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            className="flex items-center gap-3 text-[11px] font-medium text-white/95 drop-shadow-[0_1px_8px_rgba(76,28,8,0.42)] sm:text-xs"
          >
            <Link to="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'splash' && isMalaysiaSplash) {
    const splashMessage =
      APP_CONFIG.splashMessages.find((message) => message.cta === 'Tanya Sang Kancil')?.body ||
      currentSplashMessage.body;
    const CtaIcon = User;

    return (
      <div
        className="relative size-full overflow-hidden bg-[#DCEFFC]"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <img
          src={APP_CONFIG.splashArt?.backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-white/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#07101F]/62 via-[#07101F]/18 to-transparent" />
        <div
          className="relative z-10 flex h-full flex-col items-center px-6 text-center"
          style={{
            paddingTop: 'calc(var(--native-safe-area-top) + clamp(4.25rem, 8vh, 6rem))',
            paddingBottom: 'calc(var(--native-safe-area-bottom) + 1.25rem)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-[min(76vw,24rem)] sm:w-[min(52vw,28rem)]"
          >
            <img
              src={APP_CONFIG.splashArt?.wordmark || APP_CONFIG.webIcon}
              alt="Senang AU"
              className="h-auto w-full object-contain drop-shadow-[0_14px_28px_rgba(6,16,34,0.24)]"
              loading="eager"
            />
          </motion.div>
          <motion.img
            data-testid="masca-partnership-lockup"
            src={mascaPartnership}
            alt="In strategic partnership with MASCA, Malaysian Students' Council of Australia"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.42, ease: 'easeOut' }}
            className="mt-5 h-auto w-[min(70vw,18rem)] object-contain sm:w-[min(44vw,22rem)]"
            loading="eager"
          />

          <div className="mt-auto w-full max-w-[24rem] pb-4 sm:pb-6">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.42, ease: 'easeOut' }}
              className="mx-auto max-w-[21rem] text-lg font-black leading-relaxed text-white sm:text-xl"
              style={{
                WebkitTextStroke: '1px rgba(7, 16, 31, 0.5)',
                paintOrder: 'stroke fill',
                textShadow: '0 4px 18px rgba(7, 16, 31, 0.42)',
              }}
            >
              {splashMessage}
            </motion.p>
            <motion.button
              type="button"
              onClick={() => setStep('email')}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
              className="mt-6 flex w-full items-center justify-center gap-4 rounded-[2rem] border border-[#FFE999] px-6 py-4 text-xl font-black text-[#081427] shadow-[0_16px_45px_rgba(7,16,31,0.26)] transition-transform active:scale-[0.985]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,249,199,0.98) 0%, rgba(255,220,77,0.98) 52%, rgba(238,178,36,0.98) 100%)',
              }}
            >
              <CtaIcon className="h-7 w-7" />
              <span>Tanya Sang Kancil</span>
              <ArrowRight className="h-7 w-7" />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            className="flex items-center gap-3 text-[11px] font-medium text-white/95 drop-shadow-[0_1px_8px_rgba(7,16,31,0.5)] sm:text-xs"
          >
            <Link to="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'splash' && isWolliSplash) {
    const splashMessage =
      APP_CONFIG.splashMessages.find((message) => message.cta === 'Ask Wolli')?.body ||
      currentSplashMessage.body;
    const CtaIcon = User;

    return (
      <div
        className="relative size-full overflow-hidden bg-[#FFF1DD]"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <img
          src={APP_CONFIG.launchArt?.homeHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-white/0 to-[#3D2C20]/34" />
        <div className="absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-white/32 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[#231814]/56 to-transparent" />

        <div
          className="relative z-10 flex h-full flex-col items-center px-6 text-center"
          style={{
            paddingTop: 'calc(var(--native-safe-area-top) + clamp(3.75rem, 7vh, 5.25rem))',
            paddingBottom: 'calc(var(--native-safe-area-bottom) + 1.25rem)',
          }}
        >
          <div className="w-[min(74vw,22rem)] sm:w-[min(58vw,28rem)]">
            <img
              src={APP_CONFIG.launchArt?.wordmark || APP_CONFIG.webIcon}
              alt="Where's Wolli"
              className="h-auto w-full object-contain drop-shadow-[0_12px_24px_rgba(54,38,24,0.18)]"
              loading="eager"
            />
          </div>

          <div className="mt-auto w-full max-w-[24rem] pb-4 sm:pb-6">
            <p
              className="mx-auto max-w-[21rem] text-lg font-black leading-relaxed text-white sm:text-xl"
              style={{
                WebkitTextStroke: '1px rgba(49, 33, 22, 0.72)',
                paintOrder: 'stroke fill',
                textShadow: '0 3px 16px rgba(34, 22, 14, 0.46)',
              }}
            >
              {splashMessage}
            </p>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="mt-6 flex w-full items-center justify-center gap-4 rounded-[2rem] border border-[#FFE999] px-6 py-4 text-xl font-black text-[#2E2A27] shadow-[0_16px_45px_rgba(54,38,24,0.24)] transition-transform active:scale-[0.985]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,249,199,0.98) 0%, rgba(255,221,89,0.98) 52%, rgba(238,184,52,0.98) 100%)',
              }}
            >
              <CtaIcon className="h-7 w-7" />
              <span>Ask Wolli</span>
              <ArrowRight className="h-7 w-7" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium text-white/95 drop-shadow-[0_1px_8px_rgba(54,38,24,0.45)] sm:text-xs">
            <Link to="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex items-center justify-center overflow-y-auto relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ─── Tricolor Background (persists on splash) ─── */}
      <AnimatePresence>
        {step === 'splash' && (
          <motion.div
            key="tricolor-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`absolute inset-0 z-0 overflow-hidden ${splashBackground.shell}`}
          >
            <div
              className="absolute inset-x-[-14%] top-[-24%] h-[54%] rounded-[46%] opacity-100 blur-[12px]"
              style={{
                background: splashBackground.top,
                animation: 'setuTopWave 12s ease-in-out infinite',
              }}
            />
            <div
              className={`absolute inset-x-[-16%] top-[24%] h-[29%] rounded-[46%] ${splashBackground.middle}`}
              style={{
                transform: 'rotate(-7deg)',
                animation: 'setuMiddleWave 13s ease-in-out infinite',
              }}
            />
            <div
              className="absolute inset-x-[-14%] bottom-[-20%] h-[58%] rounded-[48%] opacity-100 blur-[10px]"
              style={{
                background: splashBackground.bottom,
                animation: 'setuBottomWave 11s ease-in-out infinite',
              }}
            />
            <div
              className="absolute inset-0 opacity-95"
              style={{
                background: splashBackground.glow,
                animation: 'setuAuraBreathe 8s ease-in-out infinite',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 42%, rgba(15,23,42,0.08) 100%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-85 mix-blend-screen"
              style={{
                background: splashBackground.blend,
                animation: 'setuColorPulse 10s ease-in-out infinite',
              }}
            />
            <div
              className="absolute -left-[20%] top-[8%] h-[34%] w-[55%] rounded-full opacity-80 blur-[34px]"
              style={{
                background: splashBackground.topOrb,
                animation: 'setuSunDrift 14s ease-in-out infinite',
              }}
            />
            <div
              className="absolute -right-[18%] bottom-[2%] h-[36%] w-[58%] rounded-full opacity-80 blur-[34px]"
              style={{
                background: splashBackground.bottomOrb,
                animation: 'setuFieldDrift 13s ease-in-out infinite',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted glass overlay for splash */}
      <AnimatePresence>
        {step === 'splash' && (
          <motion.div
            key="frost"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-[1] backdrop-blur-[18px]"
            style={{ background: isHoodieSplash ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.12)' }}
          />
        )}
      </AnimatePresence>

      {/* White bg for non-splash steps */}
      <div className={`absolute inset-0 transition-colors duration-700 ${step === 'splash' ? 'bg-transparent' : 'bg-white'}`} />

      {/* CSS Keyframes injection */}
      <style>{`
        @keyframes setuTopWave {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); filter: saturate(1); }
          50% { transform: translate3d(5%, 5%, 0) scale(1.14); filter: saturate(1.24); }
        }
        @keyframes setuMiddleWave {
          0%, 100% { transform: rotate(-7deg) translate3d(0, 0, 0) scale(1); opacity: 0.96; }
          50% { transform: rotate(-2deg) translate3d(3%, -3%, 0) scale(1.12); opacity: 1; }
        }
        @keyframes setuBottomWave {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); filter: saturate(1); }
          50% { transform: translate3d(-5%, -5%, 0) scale(1.15); filter: saturate(1.24); }
        }
        @keyframes setuAuraBreathe {
          0%, 100% { opacity: 0.82; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.14); }
        }
        @keyframes setuColorPulse {
          0%, 100% { opacity: 0.78; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes setuSunDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.98); opacity: 0.72; }
          30% { transform: translate3d(12%, 4%, 0) scale(1.08); opacity: 0.95; }
          65% { transform: translate3d(18%, 10%, 0) scale(1.16); opacity: 0.86; }
        }
        @keyframes setuFieldDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.74; }
          35% { transform: translate3d(-10%, -6%, 0) scale(1.1); opacity: 0.94; }
          70% { transform: translate3d(-18%, -12%, 0) scale(1.18); opacity: 0.84; }
        }
        @keyframes setuButtonGlow {
          0%, 100% { box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.4); }
          50% { box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.75); }
        }
        @keyframes setuArrowDrift {
          0% { transform: translateX(0px); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(0px); }
        }
        @keyframes hoodieButtonGlow {
          0%, 100% { box-shadow: 0 18px 42px rgba(251, 212, 51, 0.22), 0 0 0 1px rgba(251, 212, 51, 0.24); }
          50% { box-shadow: 0 24px 56px rgba(251, 212, 51, 0.34), 0 0 0 1px rgba(251, 212, 51, 0.36); }
        }
      `}</style>

      <div className="relative z-10 size-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* ─── SPLASH ───────────────────────────────────────── */}
          {step === 'splash' && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex h-full w-full max-w-lg flex-col items-center px-6 pt-10 sm:pt-12"
              style={{ paddingBottom: 'calc(var(--native-safe-area-bottom) + 0.9rem)' }}
            >
              {/* Main content */}
              <div className="flex flex-1 w-full flex-col items-center">
                {/* Fixed hero slot */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-start justify-center ${
                    isHoodieSplash ? 'min-h-[16.75rem] pt-[4.5rem]' : 'h-[10.75rem] pt-[5.5rem]'
                  }`}
                >
                  {isHoodieSplash ? (
                    <div className="relative flex flex-col items-center text-center">
                      <div className="relative -mb-5 flex items-center justify-center sm:-mb-6">
                        <div className="absolute h-[11rem] w-[11rem] rounded-full bg-[#FBD433]/20 blur-[62px]" />
                        {APP_CONFIG.variant === 'burb_mate' ? (
                          <HoodieLogoLoop className="relative h-[8.75rem] w-[8.75rem] sm:h-[9.75rem] sm:w-[9.75rem]" />
                        ) : (
                          <motion.img
                            src={APP_CONFIG.onboardingMarker}
                            alt={APP_CONFIG.onboardingMarkerAlt}
                            className="relative h-[8.25rem] w-[8.25rem] object-contain drop-shadow-[0_18px_40px_rgba(251,212,51,0.18)] sm:h-[9rem] sm:w-[9rem]"
                            animate={{ y: [0, -6, 0], scale: [1, 1.02, 1] }}
                            transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}
                          />
                        )}
                      </div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-0 flex flex-col items-center gap-1"
                      >
                        <p className={`font-black text-white [text-shadow:0_10px_36px_rgba(0,0,0,0.6)] ${APP_CONFIG.variant === 'burb_mate' ? 'text-[2.25rem] lowercase tracking-[-0.06em]' : 'text-[1.7rem] uppercase tracking-[0.08em] sm:text-[1.95rem]'}`}>
                          {APP_CONFIG.splashHeroTitle}
                        </p>
                        <p className="text-[1.05rem] font-semibold tracking-[0.03em] text-[#FBD433] [text-shadow:0_10px_32px_rgba(0,0,0,0.45)]">
                          {APP_CONFIG.splashHeroSubtitle}
                        </p>
                      </motion.div>
                    </div>
                  ) : (
                    <AppBrandLockup showWordmark={false} animateMarker />
                  )}
                </motion.div>

                <div className={`flex flex-1 w-full flex-col items-center justify-center ${isHoodieSplash ? 'mt-0 gap-4' : 'mt-1 gap-5'}`}>
                  {/* Tagline — typing effect */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    className={`flex items-center justify-center px-2 text-center ${
                      isHoodieSplash ? 'min-h-[5.25rem] max-w-[19.5rem]' : 'min-h-[5.75rem] max-w-[19rem]'
                    }`}
                  >
                    <p
                      className={`text-[1rem] font-semibold leading-relaxed tracking-[0.01em] ${
                        isHoodieSplash
                          ? 'text-white [text-shadow:0_10px_30px_rgba(0,0,0,0.55)]'
                          : 'text-[#111827] [text-shadow:0_1px_16px_rgba(255,255,255,0.65)]'
                      }`}
                    >
                      {typedTagline}
                      {!taglineDone && (
                        <span
                          className={`ml-0.5 inline-block h-[14px] w-[2px] animate-pulse align-middle ${
                            isHoodieSplash ? 'bg-[#FBD433]' : 'bg-[#111827]'
                          }`}
                        />
                      )}
                    </p>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setStep('email')}
                    className={`flex min-w-[240px] cursor-pointer items-center justify-center gap-3 rounded-2xl px-8 py-3.5 text-sm font-semibold tracking-wide transition-all ${
                      isHoodieSplash
                        ? 'border border-[#FBD433]/40 bg-[#FBD433] text-[#050505] shadow-[0_18px_40px_rgba(251,212,51,0.22)] hover:bg-[#FFE168]'
                        : 'border border-white/70 bg-white/78 text-[#111827] shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl hover:bg-white/88'
                    }`}
                    style={{ animation: isHoodieSplash ? 'hoodieButtonGlow 2.8s ease-in-out infinite' : 'setuButtonGlow 3s ease-in-out infinite' }}
                  >
                    <SplashCtaIcon className={`h-4 w-4 ${isHoodieSplash ? 'text-[#050505]' : 'text-[#111827]'}`} strokeWidth={2} />
                    {currentSplashMessage.cta}
                    <motion.span
                      style={{ animation: 'setuArrowDrift 2s ease-in-out infinite' }}
                      className="inline-flex"
                    >
                      <ArrowRight className={`h-4 w-4 ${isHoodieSplash ? 'text-[#050505]' : 'text-[#EE811A]'}`} strokeWidth={2} />
                    </motion.span>
                  </motion.button>
                </div>
              </div>

              <div className="mt-auto flex w-full flex-col items-center gap-6">
                {/* Terms & Privacy links */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.6, duration: 0.5 }}
                  className={`flex items-center gap-3 text-[10px] ${isHoodieSplash ? 'text-white/70' : 'text-[#111111]'}`}
                >
                  <Link
                    to="/terms"
                    className={`underline underline-offset-2 transition-colors ${isHoodieSplash ? 'hover:text-white' : 'hover:text-black/70'}`}
                  >
                    Terms of Service
                  </Link>
                  <span>·</span>
                  <Link
                    to="/privacy"
                    className={`underline underline-offset-2 transition-colors ${isHoodieSplash ? 'hover:text-white' : 'hover:text-black/70'}`}
                  >
                    Privacy Policy
                  </Link>
                </motion.div>

                {/* Fixed bottom signatories */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <div className="flex justify-center px-4 py-1">
                    {APP_CONFIG.showPartnershipBadge && (
                      <SetuPartnershipBadge maxWidth={220} className="opacity-95 brightness-0 saturate-0 contrast-200" />
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ─── EMAIL ─────────────────────────────────────────── */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6 w-full max-w-md px-6"
            >
              {/* Hero header — shrunken logo from splash */}
              <motion.div
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mb-2 flex items-center gap-2"
              >
                <AppBrandLockup compact showDescriptor={false} animateMarker={APP_CONFIG.experienceMode === 'hoodie'} />
              </motion.div>

              
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-center"
              >
                <h2 className="text-2xl text-[#0F172A] mb-2 font-bold">{emailHeading}</h2>
                <p className="text-[#64748B] text-sm font-normal">
                  {emailBody} <span className="font-medium text-[#0F172A]">{APP_CONFIG.supportEmail}</span>
                </p>
                <p className="text-[#94A3B8] text-[11px] mt-2 font-normal">
                  {supportsAudienceSelection ? (
                    <>
                      <span className="font-medium text-[#1E40AF]">.edu.au</span> {studentEmailHint.replace(/^\.edu\.au\s*/, '')}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[#1E40AF]">.edu.au</span> {alumniEmailHint.replace(/^\.edu\.au\s*/, '')}
                    </>
                  )}
                </p>
                {isReviewerAccessConfigured() && (
                  <p className="text-[#94A3B8] text-[11px] mt-2 font-normal">
                    {reviewerAccessCopy}
                  </p>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="w-full"
              >
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                  placeholder="you@example.com"
                  className={inputClass}
                  style={{ fontWeight: 400 }}
                />
                {isReviewerAccessConfigured() && isReviewerBypassEmail(email) && (
                  <p className="text-[11px] text-[#1E40AF] mt-2 font-normal">
                    {reviewerBypassCopy}
                  </p>
                )}
                {emailError && (
                  <p className="text-[#B91C1C] text-sm mt-2 font-normal">{emailError}</p>
                )}
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                onClick={handleEmailSubmit}
                disabled={sending}
                className={btnPrimary}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {sendCodeLabel}
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </>
                )}
              </motion.button>

              {/* Terms & Privacy footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="text-[10px] text-[#94A3B8] text-center font-normal"
              >
                {termsCopy}{' '}
                <Link to="/terms" className="text-[#1E40AF] hover:underline">Terms</Link>
                {' & '}
                <Link to="/privacy" className="text-[#1E40AF] hover:underline">Privacy Policy</Link>
              </motion.p>
            </motion.div>
          )}

        {/* ─── OTP ───────────────────────────────────────────── */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 w-full max-w-md px-6"
          >
            <div className="w-14 h-14 bg-[#16A34A]/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-[#16A34A]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl text-[#0F172A] mb-2 font-bold">{otpHeading}</h2>
              <p className="text-[#64748B] text-sm font-normal">
                {otpBody} <span className="font-medium text-[#0F172A]">{email}</span>
              </p>
            </div>
            <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 transition-all"
                />
              ))}
            </div>
            {otpError && (
              <p className="text-[#B91C1C] text-sm font-normal">{otpError}</p>
            )}
            {verifying && (
              <div className="flex items-center gap-2 text-[#1E40AF]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-normal">{verifyingLabel}</span>
              </div>
            )}
            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resendTimer > 0 || sending}
                className="text-sm text-[#1E40AF] hover:underline disabled:text-[#94A3B8] disabled:no-underline cursor-pointer disabled:cursor-not-allowed font-normal"
              >
                {resendTimer > 0 ? resendCountdownLabel(resendTimer) : resendLabel}
              </button>
            </div>
            <button
              onClick={() => { setStep('email'); setOtpDigits(['', '', '', '', '', '']); setOtpError(''); }}
              className="text-sm text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 cursor-pointer font-normal"
            >
              <ArrowLeft className="w-4 h-4" />
              {changeEmailLabel}
            </button>
          </motion.div>
        )}

        {/* ─── PROFILE SETUP (3 Steps) ───────────────────────── */}
        {isProfileStep && (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col w-full max-w-md px-6 py-6 gap-5"
          >
            {/* Welcome & Stepper */}
            <div className="text-center mb-1">
              <p className="text-[#64748B] text-sm font-normal mb-1">
                {profileWelcomeCopy}
              </p>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {[
                { icon: User, label: profileStepLabels.personal },
                { icon: MapPin, label: supportsAudienceSelection ? profileStepLabels.arrival : profileStepLabels.location },
                { icon: GraduationCap, label: supportsAudienceSelection ? profileStepLabels.student : profileStepLabels.academic, step: 'academic' as Step },
              ].filter((stepDefinition) => !stepDefinition.step || profileSteps.includes(stepDefinition.step as Step)).map((s, i) => {
                const isActive = i === currentProfileStep;
                const isDone = i < currentProfileStep;
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    {i > 0 && (
                      <div className={`w-8 h-0.5 rounded-full transition-colors ${isDone ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'}`} />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isDone ? 'bg-[#1E40AF] text-white shadow-md shadow-[#1E40AF]/20' :
                        isActive ? 'bg-[#1E40AF]/10 text-[#1E40AF] ring-2 ring-[#1E40AF]/20' :
                        'bg-[#F8FAFC] text-[#94A3B8]'
                      }`}>
                        {isDone ? <Check className="w-5 h-5" strokeWidth={2} /> : <s.icon className="w-5 h-5" strokeWidth={1.5} />}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive || isDone ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Personal Step ──────────────────────────── */}
            {step === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setProfileError(''); }}
                      placeholder="Rushi"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setProfileError(''); }}
                      placeholder="Patel"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => { setDob(e.target.value); setProfileError(''); }}
                    className={inputClass}
                    max="2010-01-01"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div className="flex gap-2">
                    <div className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B] text-sm flex items-center font-medium shrink-0">
                      +61
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setProfileError(''); }}
                      placeholder="4XX XXX XXX"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Location Step ─────────────────────────── */}
            {step === 'location' && (
              <div className="space-y-4">
                {supportsAudienceSelection && (
                  <div className="space-y-2">
                    <label className={labelClass}>Which arrival path fits you best?</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: 'newcomer' as const,
                          title: 'Newcomer',
                          body: 'Skip university fields and finish setup faster.',
                        },
                        {
                          value: 'student' as const,
                          title: 'Student',
                          body: 'Add university and course details on the next step.',
                        },
                      ].map((option) => {
                        const active = audienceMode === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setAudienceMode(option.value);
                              setProfileError('');
                            }}
                            className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                              active
                                ? 'border-[#1E40AF] bg-[#EEF4FF] shadow-sm'
                                : 'border-[#E2E8F0] bg-white hover:border-[#BFDBFE]'
                            }`}
                          >
                            <p className={`text-sm font-semibold ${active ? 'text-[#1E40AF]' : 'text-[#0F172A]'}`}>{option.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">{option.body}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Citizenship */}
                <div className="relative">
                  <label className={labelClass}>Citizenship</label>
                  <div
                    className={`${inputClass} cursor-pointer flex items-center justify-between`}
                    onClick={(e) => { e.stopPropagation(); setShowCitizenshipDropdown(!showCitizenshipDropdown); }}
                  >
                    <span className={citizenship ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
                      {selectedCountryName || 'Select country'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  {showCitizenshipDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="p-2 border-b border-[#E2E8F0]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <input
                            value={citizenshipSearch}
                            onChange={(e) => setCitizenshipSearch(e.target.value)}
                            placeholder="Search countries..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] rounded-lg border-none focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-44">
                        {filteredCountries.map(c => (
                          <button
                            key={c.value}
                            onClick={() => {
                              setCitizenship(c.value);
                              setHomeState('');
                              setShowCitizenshipDropdown(false);
                              setCitizenshipSearch('');
                              setProfileError('');
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                              citizenship === c.value ? 'bg-[#1E40AF]/5 text-[#1E40AF] font-medium' : 'text-[#0F172A]'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Australian State */}
                <div>
                  <label className={labelClass}>Australian State</label>
                  <select
                    value={auState}
                    onChange={(e) => { setAuState(e.target.value); setProfileError(''); }}
                    className={`${inputClass} cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[center_right_1rem]`}
                  >
                    <option value="">Select state</option>
                    {australianStates.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Home State */}
                {citizenship && homeStates.length > 0 && (
                  <div className="relative">
                    <label className={labelClass}>Home State / Province</label>
                    <div
                      className={`${inputClass} cursor-pointer flex items-center justify-between`}
                      onClick={(e) => { e.stopPropagation(); setShowHomeStateDropdown(!showHomeStateDropdown); }}
                    >
                      <span className={homeState ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
                        {selectedHomeStateName || 'Select state (optional)'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                    </div>
                    {showHomeStateDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-2 border-b border-[#E2E8F0]">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                            <input
                              value={homeStateSearch}
                              onChange={(e) => setHomeStateSearch(e.target.value)}
                              placeholder="Search states..."
                              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] rounded-lg border-none focus:outline-none"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-44">
                          {filteredHomeStates.map(s => (
                            <button
                              key={s.value}
                              onClick={() => {
                                setHomeState(s.value);
                                setShowHomeStateDropdown(false);
                                setHomeStateSearch('');
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                                homeState === s.value ? 'bg-[#1E40AF]/5 text-[#1E40AF] font-medium' : 'text-[#0F172A]'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Academic Step ──────────────────────────── */}
            {step === 'academic' && (
              <div className="space-y-4">
                {supportsAudienceSelection ? (
                  <div className="flex items-start gap-2.5 p-3 bg-[#EEF6FF] border border-[#BFDBFE] rounded-xl">
                    <Info className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-semibold text-[#1E3A8A]">Student setup</p>
                      <p className="text-[11px] text-[#1D4ED8] mt-0.5 leading-relaxed">
                        Add your university, course, and expected graduation year so your profile matches the right student journey inside {APP_CONFIG.displayName}.
                      </p>
                    </div>
                  </div>
                ) : !isEduAuEmail(email) ? (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-semibold text-amber-900">Alumni / Non-university Email Detected</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        Since you're not using a <span className="font-medium">.edu.au</span> email, please verify your university affiliation and graduation year below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">University Email Verified</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Your <span className="font-medium">.edu.au</span> email has been recognised. Fast-track verification applied.</p>
                    </div>
                  </div>
                )}

                {/* University */}
                <div className="relative">
                  <label className={labelClass}>University Affiliation <span className="text-[#B91C1C]">*</span></label>
                  <div
                    className={`${inputClass} cursor-pointer flex items-center justify-between`}
                    onClick={(e) => { e.stopPropagation(); setShowUniDropdown(!showUniDropdown); }}
                  >
                    <span className={university ? 'text-[#0F172A]' : 'text-[#94A3B8]'}>
                      {university || 'Select university'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  {showUniDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl max-h-60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="p-2 border-b border-[#E2E8F0]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <input
                            value={uniSearch}
                            onChange={(e) => setUniSearch(e.target.value)}
                            placeholder="Search universities..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F8FAFC] rounded-lg border-none focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-44">
                        {filteredUnis.map(u => (
                          <button
                            key={u}
                            onClick={() => {
                              setUniversity(u);
                              setShowUniDropdown(false);
                              setUniSearch('');
                              setProfileError('');
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                              university === u ? 'bg-[#1E40AF]/5 text-[#1E40AF] font-medium' : 'text-[#0F172A]'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Course Name <span className="text-[#B91C1C]">*</span></label>
                  <input
                    value={courseName}
                    onChange={(e) => { setCourseName(e.target.value); setProfileError(''); }}
                    placeholder="e.g. Master of Information Technology"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Graduation Year <span className="text-[#B91C1C]">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={gradYear}
                    onChange={(e) => { setGradYear(e.target.value.replace(/\D/g, '').slice(0, 4)); setProfileError(''); }}
                    placeholder="e.g. 2026"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {profileError && (
              <p className="text-[#B91C1C] text-sm text-center font-normal">{profileError}</p>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-2">
              {step !== 'personal' && (
                <button
                  onClick={handleProfileBack}
                  className="flex-1 py-3.5 border border-[#E2E8F0] rounded-xl text-[#64748B] flex items-center justify-center gap-2 hover:bg-[#F8FAFC] transition-all cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleProfileNext}
                className={step === 'academic' ? btnAccent : btnPrimary}
              >
                {step === 'academic' ? (
                  <>
                    {`Open ${APP_CONFIG.displayName}`}
                    <Shield className="w-4 h-4" strokeWidth={2} />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
