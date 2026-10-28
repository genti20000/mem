import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageCircle,
  Check,
  CheckCircle2,
  Clock,
  Smartphone,
  Shield,
  X,
  ExternalLink,
} from 'lucide-react';
import { Member, RuleAcceptance } from '../../types';
import { clubStore } from '../../services/storage';
import { AppleWalletPassModal } from '../cards/AppleWalletPassModal';
import { getMemberPassUrl } from '../../services/appleWallet';

export interface AmicaLuxuryRegistrationCardProps {
  isPublicPortal?: boolean;
  onOpenPass?: (memberNumber: string) => void;
  onExitToStaffPortal?: () => void;
  isAdminMode?: boolean;
}

export const AmicaLuxuryRegistrationCard: React.FC<AmicaLuxuryRegistrationCardProps> = ({
  isPublicPortal = false,
  onOpenPass,
  onExitToStaffPortal,
  isAdminMode = false,
}) => {
  const currentRules = clubStore.getCurrentRuleVersion();
  const currentStaff = clubStore.getCurrentStaff();
  const isStaffUser = !isPublicPortal && (currentStaff.role === 'admin' || currentStaff.role === 'manager' || isAdminMode);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [contactValue, setContactValue] = useState('');
  const [agreeRules, setAgreeRules] = useState(false);
  const [confirmOver18, setConfirmOver18] = useState(false);
  const [adminInstantPass, setAdminInstantPass] = useState(false);

  // Modals & Status
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMember, setSubmittedMember] = useState<Member | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(48 * 3600);

  // 48-Hour Live Countdown Timer
  useEffect(() => {
    if (!submittedMember) return;
    const calculateRemaining = () => {
      const appliedTime = new Date(submittedMember.appliedAt).getTime();
      const eligibleTime = appliedTime + 48 * 3600 * 1000;
      const diffMs = eligibleTime - Date.now();
      setTimeRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    };
    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [submittedMember]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Please enter your full legal name.');
      return;
    }

    if (!contactValue.trim()) {
      setFormError(
        contactMethod === 'email'
          ? 'Please enter your email address.'
          : 'Please enter your WhatsApp or mobile number.'
      );
      return;
    }

    if (!agreeRules) {
      setFormError('Please read and agree to the Club Rules.');
      return;
    }

    if (!confirmOver18) {
      setFormError('You must confirm that you are aged 18 or over.');
      return;
    }

    const nowIso = new Date().toISOString();
    const memberNumber = `AMC-${Math.floor(1000 + Math.random() * 9000)}`;

    const emailValue = contactMethod === 'email' ? contactValue.trim().toLowerCase() : '';
    const phoneValue = contactMethod === 'phone' ? contactValue.trim() : '';

    const ruleAcceptance: RuleAcceptance = {
      ruleVersion: currentRules.version,
      acceptedAt: nowIso,
      applicantEmail: emailValue || 'guest@amicasoho.com',
    };

    // If Admin chooses instant activation
    const isBackdated = isStaffUser && adminInstantPass;
    const appliedAtIso = isBackdated
      ? new Date(Date.now() - 49 * 3600 * 1000).toISOString()
      : nowIso;
    const eligibleAtIso = isBackdated
      ? new Date(Date.now() - 1 * 3600 * 1000).toISOString()
      : new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      memberNumber,
      fullName: fullName.trim(),
      dateOfBirth: '',
      email: emailValue,
      phone: phoneValue,
      employer: 'Hospitality Trade',
      hospitalityRole: 'Member',
      employerAddressOrWebsite: '',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      status: isBackdated ? 'active' : 'waiting_48_hours',
      appliedAt: appliedAtIso,
      eligibleAt: eligibleAtIso,
      approvedAt: isBackdated ? nowIso : undefined,
      approvedBy: isBackdated ? currentStaff.name : undefined,
      ruleAcceptance,
      notes: isBackdated
        ? `[ADMIN OVERRIDE]: 48-Hour statutory requirement verified by ${currentStaff.name}. Instant pass granted.`
        : 'Official Membership Portal application. Statutory 48-hour waiting period applies under Licensing Act 2003.',
    };

    clubStore.saveMember(
      newMember,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      isBackdated
        ? 'Admin override: immediate active pass issued'
        : 'Official Membership Portal application'
    );

    setSubmittedMember(newMember);
  };

  const hours = Math.floor(timeRemainingSeconds / 3600);
  const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
  const seconds = timeRemainingSeconds % 60;

  // =========================================================================
  // CONFIRMATION SCREEN (When submitted)
  // =========================================================================
  if (submittedMember) {
    const isInstantActive = submittedMember.status === 'active';

    return (
      <div className="w-full max-w-[480px] mx-auto p-4 sm:p-6 animate-fadeIn">
        <div
          className="rounded-[30px] sm:rounded-[36px] border-[1.5px] border-[#D8AA4E] p-6 sm:p-8 text-center relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
          style={{
            background: 'radial-gradient(130% 90% at 50% 10%, #4D0A17 0%, #29040C 60%, #120104 100%)',
          }}
        >
          {/* Logo Arch & Coupe */}
          <div className="flex justify-center mb-3">
            <svg
              viewBox="0 0 120 120"
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M26 106 V54 C26 35.2 41.2 20 60 20 C78.8 20 94 35.2 94 54 V106"
                stroke="#E5C378"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M32 106 V54 C32 38.5 44.5 26 60 26 C75.5 26 88 38.5 88 54 V106"
                stroke="#E5C378"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line x1="20" y1="106" x2="100" y2="106" stroke="#E5C378" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M44 48 L60 69 L76 48 Z" stroke="#E5C378" strokeWidth="2" strokeLinejoin="round" fill="none" />
              <line x1="48" y1="53" x2="72" y2="53" stroke="#E5C378" strokeWidth="1.2" />
              <line x1="60" y1="69" x2="60" y2="92" stroke="#E5C378" strokeWidth="2" />
              <line x1="48" y1="92" x2="72" y2="92" stroke="#E5C378" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-[0.24em] text-[#E5C378] uppercase">
            AMICA SOHO
          </h1>
          <p className="text-[10px] sm:text-[11px] font-sans tracking-[0.18em] text-[#E5C378] uppercase mt-1">
            23 FRITH STREET · SOHO · LONDON W1D 4RR
          </p>

          <div className="w-48 sm:w-56 h-[1.5px] bg-[#E5C378]/70 mx-auto my-3 sm:my-4" />

          <h2 className="font-editorial text-2xl sm:text-3xl text-[#FFF7EC] font-normal tracking-wide mb-2">
            {isInstantActive ? 'Membership Activated' : 'Application Received'}
          </h2>

          <p className="text-xs text-[#E8CCA0]/90 leading-relaxed max-w-sm mx-auto mb-4 font-sans">
            Thank you, <strong className="text-white font-bold">{submittedMember.fullName}</strong>.{' '}
            {isInstantActive
              ? 'Your membership has been verified and activated immediately.'
              : 'Your membership application has been logged on the official register.'}
          </p>

          {/* Member Number Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-[#E5C378]/50 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E8CCA0]">Pass Reference:</span>
            <span className="font-mono text-sm font-bold text-white tracking-wider">{submittedMember.memberNumber}</span>
          </div>

          {/* 48-Hour Live Statutory Countdown (if waiting) */}
          {!isInstantActive ? (
            <div className="p-4 rounded-2xl bg-black/40 border border-[#E5C378]/30 mb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#E5C378] mb-2 font-semibold">
                Statutory 48-Hour Waiting Period
              </div>
              <div className="flex items-center justify-center gap-2 font-mono text-2xl sm:text-3xl font-bold text-white">
                <div className="p-2.5 rounded-xl bg-[#2D060D] border border-[#E5C378]/40 min-w-[62px]">
                  <div>{String(hours).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#E5C378] uppercase font-sans">Hours</div>
                </div>
                <span className="text-[#E5C378]">:</span>
                <div className="p-2.5 rounded-xl bg-[#2D060D] border border-[#E5C378]/40 min-w-[62px]">
                  <div>{String(minutes).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#E5C378] uppercase font-sans">Mins</div>
                </div>
                <span className="text-[#E5C378]">:</span>
                <div className="p-2.5 rounded-xl bg-[#2D060D] border border-[#E5C378]/40 min-w-[62px]">
                  <div>{String(seconds).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#E5C378] uppercase font-sans">Secs</div>
                </div>
              </div>
              <p className="text-[10px] text-stone-300 mt-2.5 font-sans leading-relaxed">
                Pursuant to Westminster City Council regulations, membership privileges commence after 48 hours.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs mb-5 font-sans">
              ✓ 48-Hour requirement verified by club management. Valid for immediate door check-in.
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (onOpenPass) {
                  onOpenPass(submittedMember.memberNumber);
                } else {
                  window.location.href = getMemberPassUrl(submittedMember);
                }
              }}
              className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs sm:text-sm tracking-[0.14em] text-[#1A1005] shadow-[0_4px_24px_rgba(223,190,123,0.35)] transition-all active:scale-[0.98] cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)',
              }}
            >
              Open My Digital Pass
            </button>

            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="w-full py-3 px-4 rounded-xl sm:rounded-2xl bg-black hover:bg-neutral-900 border border-[#E5C378]/40 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-[#E5C378]" />
              <span>Add to Apple Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmittedMember(null);
                setFullName('');
                setContactValue('');
                setAgreeRules(false);
                setConfirmOver18(false);
              }}
              className="text-xs text-[#E5C378] hover:text-white underline pt-2 cursor-pointer font-sans"
            >
              Submit Another Application
            </button>
          </div>
        </div>

        {/* Apple Wallet Pass Modal */}
        <AppleWalletPassModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          member={submittedMember}
        />
      </div>
    );
  }

  // =========================================================================
  // THE EXACT CARD FROM THE PHOTO
  // =========================================================================
  return (
    <div className="w-full max-w-[460px] mx-auto p-3 sm:p-5">
      {/* Outer Card with Rounded Gold Border & Deep Burgundy Radial Gradient */}
      <div
        className="rounded-[30px] sm:rounded-[36px] border-[1.5px] border-[#D8AA4E] p-6 sm:p-8 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
        style={{
          background: 'radial-gradient(125% 100% at 50% 12%, #4A0916 0%, #29040C 58%, #140206 100%)',
        }}
      >
        {/* Top Emblem: Gold Arch with Martini / Cocktail Coupe */}
        <div className="flex justify-center mb-3">
          <svg
            viewBox="0 0 120 120"
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] drop-shadow-md"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Rounded Arch */}
            <path
              d="M26 106 V54 C26 35.2 41.2 20 60 20 C78.8 20 94 35.2 94 54 V106"
              stroke="#E5C378"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Inner Rounded Arch */}
            <path
              d="M32 106 V54 C32 38.5 44.5 26 60 26 C75.5 26 88 38.5 88 54 V106"
              stroke="#E5C378"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Flat Baseline */}
            <line x1="20" y1="106" x2="100" y2="106" stroke="#E5C378" strokeWidth="2.2" strokeLinecap="round" />

            {/* Martini Glass Coupe */}
            <path
              d="M44 48 L60 69 L76 48 Z"
              stroke="#E5C378"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Drink Level Line */}
            <line x1="48" y1="53" x2="72" y2="53" stroke="#E5C378" strokeWidth="1.2" />
            {/* Slender Stem */}
            <line x1="60" y1="69" x2="60" y2="92" stroke="#E5C378" strokeWidth="2" />
            {/* Round Base Foot */}
            <line x1="48" y1="92" x2="72" y2="92" stroke="#E5C378" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 className="font-cinzel text-xl sm:text-[23px] font-bold tracking-[0.24em] text-[#E5C378] uppercase text-center">
          AMICA SOHO
        </h1>

        {/* Address */}
        <p className="text-[9px] sm:text-[10px] font-sans font-medium tracking-[0.2em] text-[#E5C378] uppercase text-center mt-1">
          23 FRITH STREET · SOHO · LONDON W1D 4RR
        </p>

        {/* Thin Gold Divider Line */}
        <div className="w-52 sm:w-60 h-[1.5px] bg-[#E5C378]/70 mx-auto my-3.5 sm:my-4" />

        {/* Subheading: Membership Application */}
        <h2 className="font-editorial text-2xl sm:text-[32px] text-[#FFF7EC] font-normal tracking-wide text-center mb-5 sm:mb-6">
          Membership Application
        </h2>

        {/* Validation Error Banner */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-sans">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
          {/* FIELD 1: FULL NAME * */}
          <div>
            <label className="text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-1.5 block">
              FULL NAME *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 sm:py-3.5 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm sm:text-base rounded-xl sm:rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378] transition-all shadow-inner"
            />
          </div>

          {/* FIELD 2: CONTACT METHOD * */}
          <div>
            <label className="text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-2 block">
              CONTACT METHOD *
            </label>

            {/* Toggle Pills: Email vs WhatsApp / Mobile */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Option 1: Email */}
              <button
                type="button"
                onClick={() => {
                  setContactMethod('email');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer font-sans text-xs sm:text-sm font-semibold ${
                  contactMethod === 'email'
                    ? 'bg-[#3D0813] border-2 border-[#E5C378] text-white shadow-md'
                    : 'bg-[#F9F4EB] border-2 border-transparent text-stone-800 hover:bg-[#F3ECE0]'
                }`}
              >
                {/* Custom Radio Circle */}
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    contactMethod === 'email' ? 'border-2 border-[#E5C378]' : 'border border-stone-400'
                  }`}
                >
                  {contactMethod === 'email' && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <Mail className={`w-4 h-4 shrink-0 ${contactMethod === 'email' ? 'text-white' : 'text-stone-700'}`} />
                <span className="truncate">Email</span>
              </button>

              {/* Option 2: WhatsApp / Mobile */}
              <button
                type="button"
                onClick={() => {
                  setContactMethod('phone');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer font-sans text-xs sm:text-sm font-semibold ${
                  contactMethod === 'phone'
                    ? 'bg-[#3D0813] border-2 border-[#E5C378] text-white shadow-md'
                    : 'bg-[#F9F4EB] border-2 border-transparent text-stone-800 hover:bg-[#F3ECE0]'
                }`}
              >
                {/* Custom Radio Circle */}
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    contactMethod === 'phone' ? 'border-2 border-[#E5C378]' : 'border border-stone-400'
                  }`}
                >
                  {contactMethod === 'phone' && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                {/* Exact WhatsApp Speech Bubble with Phone Receiver SVG */}
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 shrink-0 fill-none stroke-current stroke-[2] ${
                    contactMethod === 'phone' ? 'text-white' : 'text-stone-700'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9 9 0 1 0-4.5-1.2L3 21l1.3-4.3A8.96 8.96 0 0 0 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9.5c.2-.2.5-.2.7 0l1 1c.2.2.2.4 0 .6l-.5.5c.3.7.8 1.2 1.5 1.5l.5-.5c.2-.2.4-.2.6 0l1 1c.2.2.2.5 0 .7l-.6.6c-.4.4-1.1.4-1.9-.1-1.3-.8-2.4-1.9-3.2-3.2-.5-.8-.5-1.5-.1-1.9l.6-.6z"
                  />
                </svg>
                <span className="truncate">WhatsApp / Mobile</span>
              </button>
            </div>

            {/* Single Dynamic Contact Input Field Underneath */}
            <input
              type={contactMethod === 'email' ? 'email' : 'tel'}
              required
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                contactMethod === 'email' ? 'Enter your email address' : 'Enter your mobile or WhatsApp number'
              }
              className="w-full px-4 py-3 sm:py-3.5 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm sm:text-base rounded-xl sm:rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378] transition-all shadow-inner mt-2.5"
            />
          </div>

          {/* CHECKBOX 1: Club Rules Agreement */}
          <div className="pt-1">
            <div
              onClick={() => setAgreeRules(!agreeRules)}
              className="flex items-start gap-3 cursor-pointer group select-none"
            >
              <div
                className={`w-5 h-5 rounded-[5px] border-[1.5px] mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                  agreeRules
                    ? 'bg-[#3D0813] border-[#E5C378] text-[#E5C378]'
                    : 'bg-transparent border-[#D8AA4E]/90 group-hover:border-[#E5C378]'
                }`}
              >
                {agreeRules && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-xs sm:text-[13px] text-[#FFF7EC] leading-snug font-sans">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRulesModal(true);
                  }}
                  className="underline text-[#E5C378] hover:text-[#FFF7EC] font-semibold transition-colors cursor-pointer inline decoration-[#E5C378] underline-offset-2"
                >
                  Club Rules.
                </button>{' '}
                *
              </span>
            </div>
          </div>

          {/* CHECKBOX 2: Age 18 or over confirmation */}
          <div>
            <div
              onClick={() => setConfirmOver18(!confirmOver18)}
              className="flex items-start gap-3 cursor-pointer group select-none"
            >
              <div
                className={`w-5 h-5 rounded-[5px] border-[1.5px] mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                  confirmOver18
                    ? 'bg-[#3D0813] border-[#E5C378] text-[#E5C378]'
                    : 'bg-transparent border-[#D8AA4E]/90 group-hover:border-[#E5C378]'
                }`}
              >
                {confirmOver18 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-xs sm:text-[13px] text-[#FFF7EC] leading-snug font-sans">
                I confirm that I am aged 18 or over. *
              </span>
            </div>
          </div>

          {/* Staff Admin Backdate Option (Only visible when staff is logged in) */}
          {isStaffUser && (
            <div className="pt-2 border-t border-[#E5C378]/20">
              <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-xl bg-black/40 border border-[#E5C378]/30">
                <input
                  type="checkbox"
                  checked={adminInstantPass}
                  onChange={(e) => setAdminInstantPass(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#E5C378] text-[#780C1E] focus:ring-0 bg-[#F9F4EB] cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-[#E5C378] leading-tight font-mono">
                  <strong>Staff Override:</strong> Verify 48h waiting period & issue instant active pass
                </span>
              </label>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs sm:text-[13px] tracking-[0.14em] text-[#1A1005] shadow-[0_4px_24px_rgba(222,174,78,0.35)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)',
              }}
            >
              SUBMIT MEMBERSHIP APPLICATION
            </button>
          </div>
        </form>

        {/* Exit link to staff portal if staff user wants to view door/admin */}
        {onExitToStaffPortal && (
          <div className="mt-5 pt-3 border-t border-[#DFBE7B]/20 text-center">
            <button
              type="button"
              onClick={onExitToStaffPortal}
              className="text-[10px] font-mono text-[#E5C378]/70 hover:text-[#E5C378] underline cursor-pointer"
            >
              Door Staff & Reception Login
            </button>
          </div>
        )}
      </div>

      {/* Club Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#1A050A] border-[1.5px] border-[#DFBE7B] p-6 text-left shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFBE7B]/30">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#DFBE7B]" />
                <h3 className="font-cinzel text-base font-bold text-[#E5C378]">
                  Amica Soho Club Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-[#E5C378] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 max-h-[60vh] overflow-y-auto space-y-2.5 text-xs text-stone-200 font-sans leading-relaxed pr-2">
              <p className="font-bold text-[#E5C378]">Westminster City Council Licensing Act 2003 Conditions:</p>
              {currentRules.rules.map((rule, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-black/40 border border-[#DFBE7B]/20 text-stone-300">
                  {rule}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#DFBE7B]/30 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAgreeRules(true);
                  setShowRulesModal(false);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-[#1A1005]"
                style={{
                  background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)',
                }}
              >
                I Agree & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

