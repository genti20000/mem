import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  Upload,
  FileText,
  AlertCircle,
  Sparkles,
  Send,
  Download,
  Search,
  UserCheck,
  Camera,
  Check,
  ChevronRight,
  ArrowLeft,
  Copy,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Member, RuleAcceptance } from '../../types';
import { clubStore } from '../../services/storage';
import { AppleWalletPassModal } from '../cards/AppleWalletPassModal';
import { SendPassModal } from '../cards/SendPassModal';
import { PhotoCapture } from '../common/PhotoCapture';
import { validate48HourWaitingPeriod } from '../../services/ruleEngine';
import { getPublicRegistrationUrl, getMemberPassUrl } from '../../services/appleWallet';

export interface MembershipApplicationFlowProps {
  isPublicPortal?: boolean;
  onOpenPass?: (memberNumber: string) => void;
  onExitToStaffPortal?: () => void;
}

export const MembershipApplicationFlow: React.FC<MembershipApplicationFlowProps> = ({
  isPublicPortal = false,
  onOpenPass,
  onExitToStaffPortal,
}) => {
  const currentRules = clubStore.getCurrentRuleVersion();
  const currentStaff = clubStore.getCurrentStaff();
  const isAdmin = !isPublicPortal && (currentStaff.role === 'admin' || currentStaff.role === 'manager');

  // Navigation mode: 'new' | 'existing'
  const [portalTab, setPortalTab] = useState<'new' | 'existing'>('new');

  // Form State for New Application (DOB, phone, email, workplace all optional)
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employer, setEmployer] = useState('');
  const [hospitalityRole, setHospitalityRole] = useState('Hospitality Trade');
  const [employerWebsiteOrAddress, setEmployerWebsiteOrAddress] = useState('');
  const [employmentEvidenceNote, setEmploymentEvidenceNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [agreeToRules, setAgreeToRules] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Admin 48-Hour Backdate Option - Single clean checkbox
  const [adminBackdate48Hours, setAdminBackdate48Hours] = useState(false);

  // Submission Status
  const [submittedMember, setSubmittedMember] = useState<Member | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(48 * 3600);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // State for Existing / Old Application Lookup
  const [existingSearchQuery, setExistingSearchQuery] = useState('');
  const [selectedExistingMember, setSelectedExistingMember] = useState<Member | null>(null);
  const [photoSuccessToast, setPhotoSuccessToast] = useState<string | null>(null);

  const allMembers = clubStore.getMembers();
  // Filter for existing / old applications
  const matchingMembers = allMembers.filter((m) => {
    if (!existingSearchQuery.trim()) return true;
    const q = existingSearchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.employer && m.employer.toLowerCase().includes(q))
    );
  });

  // Live 48-hour countdown effect for submitted or selected member
  const activeMemberForCountdown =
    submittedMember ||
    (selectedExistingMember?.status === 'waiting_48_hours' ? selectedExistingMember : null);

  useEffect(() => {
    if (!activeMemberForCountdown) return;

    const calculateRemaining = () => {
      const appliedTime = new Date(activeMemberForCountdown.appliedAt).getTime();
      const eligibleTime = appliedTime + 48 * 3600 * 1000;
      const diffMs = eligibleTime - Date.now();
      setTimeRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [activeMemberForCountdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToRules || !privacyConsent) return;

    const nowIso = new Date().toISOString();
    const memberNumber = `JNY-${Math.floor(1000 + Math.random() * 9000)}`;

    const ruleAcceptance: RuleAcceptance = {
      ruleVersion: currentRules.version,
      acceptedAt: nowIso,
      applicantEmail: email || 'not-provided@guest.amica',
    };

    // If Admin chooses to backdate to say it was completed 48 hours before
    const isBackdated = isAdmin && adminBackdate48Hours;
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
      dateOfBirth: dateOfBirth || '',
      email: email.trim().toLowerCase() || '',
      phone: phone.trim() || '',
      employer: employer.trim() || 'Hospitality Trade',
      hospitalityRole: hospitalityRole.trim() || 'Member',
      employerAddressOrWebsite: employerWebsiteOrAddress.trim() || '',
      employmentEvidenceNote: employmentEvidenceNote.trim() || undefined,
      photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      status: isBackdated ? 'active' : 'waiting_48_hours',
      appliedAt: appliedAtIso,
      eligibleAt: eligibleAtIso,
      approvedAt: isBackdated ? nowIso : undefined,
      approvedBy: isBackdated ? currentStaff.name : undefined,
      ruleAcceptance,
      notes: isBackdated
        ? `[ADMIN OVERRIDE by ${currentStaff.name}]: 48-Hour statutory requirement verified. Instant activation approved.`
        : 'Submitted via digital admissions portal. 48-hour statutory waiting period applies.',
    };

    clubStore.saveMember(
      newMember,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      isBackdated
        ? `Admin override: verified 48h requirement. Immediate active pass issued.`
        : 'New candidate membership application'
    );
    setSubmittedMember(newMember);
  };

  // Update photo on an existing/old application
  const handleUpdateExistingPhoto = (memberId: string, newPhotoUrl: string) => {
    const target = allMembers.find((m) => m.id === memberId);
    if (!target) return;

    const updated: Member = {
      ...target,
      photoUrl: newPhotoUrl.trim() || target.photoUrl,
    };

    clubStore.saveMember(
      updated,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Updated profile photo for ${target.fullName} (${target.memberNumber})`
    );

    setSelectedExistingMember(updated);
    if (submittedMember?.id === memberId) {
      setSubmittedMember(updated);
    }

    setPhotoSuccessToast(`Photo successfully updated for ${target.fullName} (${target.memberNumber})`);
    setTimeout(() => {
      setPhotoSuccessToast(null);
    }, 4000);
  };

  const hours = Math.floor(timeRemainingSeconds / 3600);
  const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
  const seconds = timeRemainingSeconds % 60;

  // Screen after submission: "APPLICATION RECEIVED" or "MEMBERSHIP ACTIVATED (ADMIN OVERRIDE)"
  if (submittedMember) {
    const isInstantActive = submittedMember.status === 'active';

    return (
      <div className="max-w-2xl mx-auto py-6 px-4 text-center">
        <div className="rounded-3xl bg-white border border-[#EDE7DF] shadow-md p-6 sm:p-10 relative overflow-hidden">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border ${
              isInstantActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-[#FFF5F6] border-rose-200 text-[#780C1E]'
            }`}
          >
            {isInstantActive ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-cinzel text-base font-bold tracking-[0.2em] text-[#780C1E]">
              AMICA SOHO
            </span>
            <span className="text-xs text-stone-300">·</span>
            <span className="font-mono text-xs font-bold text-stone-500 uppercase">ADMISSIONS</span>
          </div>

          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold mb-3">
            23 Frith Street · Soho W1D 4RR
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1 mb-2">
            {isInstantActive ? 'MEMBERSHIP ACTIVATED' : 'APPLICATION RECEIVED'}
          </h1>

          {/* Photo Preview & Photo Capture on Confirmation Screen */}
          <div className="my-5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#780C1E] font-bold">
                Application Photo ID
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Capture new photo anytime
              </span>
            </div>
            <PhotoCapture
              currentPhotoUrl={submittedMember.photoUrl}
              onPhotoCaptured={(newUrl) => handleUpdateExistingPhoto(submittedMember.id, newUrl)}
              label=""
            />
          </div>

          {photoSuccessToast && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{photoSuccessToast}</span>
            </div>
          )}

          {isInstantActive ? (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 my-6 text-stone-800 text-sm leading-relaxed text-left shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-800 font-mono font-bold text-xs uppercase mb-1">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Admin Override Applied · Immediate Admission Granted</span>
              </div>
              <p className="text-xs text-stone-600">
                Application timestamp was officially backdated to 48 hours prior. The applicant has been issued active membership and is immediately eligible for door admission and late-night guest sponsorship.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] my-6 text-stone-700 text-sm leading-relaxed text-left shadow-2xs">
              <p className="font-serif text-base text-stone-900 mb-1.5 font-bold">
                “Membership applications are subject to review and a minimum 48-hour waiting period before privileges can begin.”
              </p>
              <p className="text-xs text-stone-500 leading-normal">
                Pursuant to Westminster City Council club licensing regulations for 23 Frith Street, membership privileges, late-night door access, and member guest arrangements cannot commence until 48 full hours have elapsed.
              </p>
            </div>
          )}

          {/* Live Countdown Timer (only if still waiting) */}
          {!isInstantActive && (
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] my-6 shadow-2xs">
              <div className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2 font-semibold">
                Mandatory Waiting Period Countdown
              </div>
              <div className="flex items-center justify-center gap-3 font-mono text-3xl sm:text-4xl font-bold text-[#780C1E]">
                <div className="p-3 rounded-2xl bg-white border border-[#EDE7DF] min-w-[70px] shadow-2xs">
                  <div>{String(hours).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-400 font-sans uppercase">Hours</div>
                </div>
                <span className="text-stone-300">:</span>
                <div className="p-3 rounded-2xl bg-white border border-[#EDE7DF] min-w-[70px] shadow-2xs">
                  <div>{String(minutes).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-400 font-sans uppercase">Minutes</div>
                </div>
                <span className="text-stone-300">:</span>
                <div className="p-3 rounded-2xl bg-white border border-[#EDE7DF] min-w-[70px] shadow-2xs">
                  <div>{String(seconds).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-400 font-sans uppercase">Seconds</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1 text-xs text-stone-500">
            <div>Candidate: <strong className="text-stone-900">{submittedMember.fullName}</strong></div>
            <div>Application Reference: <span className="font-mono text-[#780C1E] font-bold">{submittedMember.memberNumber}</span></div>
            <div>Trade Role: <span className="text-stone-700">{submittedMember.hospitalityRole} at {submittedMember.employer}</span></div>
            <div>Status: <span className={`font-mono font-bold uppercase ${isInstantActive ? 'text-emerald-700' : 'text-amber-600'}`}>{submittedMember.status.replace('_', ' ')}</span></div>
          </div>

          {/* Digital Pass Immediate Actions */}
          <div className="mt-8 space-y-3">
            {/* Primary Action: Open Digital Pass */}
            <button
              type="button"
              onClick={() => {
                if (onOpenPass) {
                  onOpenPass(submittedMember.memberNumber);
                } else {
                  window.location.href = getMemberPassUrl(submittedMember);
                }
              }}
              className="w-full py-4 px-6 rounded-2xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-serif font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Smartphone className="w-5 h-5 text-[#FFE194]" />
              <span>Open My Digital Pass</span>
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowWalletModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <span>Apple Wallet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSendModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-[#780C1E] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send via SMS / Email</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmittedMember(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-600 text-xs font-semibold cursor-pointer"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>

        {/* Apple Wallet Pass Modal */}
        {submittedMember && (
          <AppleWalletPassModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            member={submittedMember}
            onOpenSendModal={() => {
              setShowWalletModal(false);
              setShowSendModal(true);
            }}
          />
        )}

        {/* Send Pass Modal */}
        {submittedMember && (
          <SendPassModal
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            member={submittedMember}
            onOpenAppleWalletModal={() => {
              setShowSendModal(false);
              setShowWalletModal(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-3 sm:py-4 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header Banner - High Design White Card Suite */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#EDE7DF] p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.2em] text-[#780C1E]">
            AMICA SOHO
          </span>
          <span className="text-xs text-stone-300">·</span>
          <span className="font-mono text-xs font-bold text-stone-500 uppercase">ADMISSIONS</span>
        </div>
        <div className="font-mono text-xs font-semibold text-stone-500 uppercase tracking-wide mt-1">
          23 Frith Street · Soho W1D 4RR
        </div>
        <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed mt-2 font-medium">
          Aperitivo — Music — Late. Private membership register for 23 Frith Street Soho. Applications subject to statutory regulations under the Licensing Act 2003.
        </p>

        {/* Membership Sign-Up URL Link & QR Distribution Box */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#780C1E] font-mono text-xs uppercase font-extrabold tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-[#780C1E]" />
              <span>{isPublicPortal ? 'Public Registration Link' : 'Membership Sign-Up Portal URL'}</span>
            </div>
            <p className="text-xs text-stone-500 font-mono">
              {isPublicPortal
                ? 'Share this registration link with friends or prospective member candidates.'
                : 'Share or distribute this public URL on your website or social media.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#EDE7DF] font-mono text-xs sm:text-sm font-bold text-stone-900 select-all flex-1 md:flex-none shadow-2xs truncate max-w-xs">
              {getPublicRegistrationUrl()}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getPublicRegistrationUrl());
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 3000);
              }}
              className="px-4 py-2 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-mono font-bold uppercase transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Main Tab Switcher: Only shown in Staff Admin view */}
        {!isPublicPortal && (
          <div className="mt-5 flex flex-wrap gap-2.5 pt-4 border-t border-[#F0EBE3]">
            <button
              type="button"
              onClick={() => setPortalTab('new')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                portalTab === 'new'
                  ? 'bg-[#780C1E] text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-[#EDE7DF] hover:bg-[#FAF8F5]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>New Application</span>
            </button>

            <button
              type="button"
              onClick={() => setPortalTab('existing')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                portalTab === 'existing'
                  ? 'bg-[#780C1E] text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-[#EDE7DF] hover:bg-[#FAF8F5]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Approval Queue & Search ({allMembers.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* PORTAL VIEW 1: EXISTING / OLD APPLICATION LOOKUP & PHOTO MANAGEMENT */}
      {portalTab === 'existing' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          {photoSuccessToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-mono font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{photoSuccessToast}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#EDE7DF] space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-800 font-bold flex items-center gap-2">
                <Search className="w-4 h-4 text-[#780C1E]" />
                <span>Find Existing Application</span>
              </label>
              <span className="text-[11px] text-stone-500 font-mono font-medium">
                Search by Name, Reference No (e.g. JNY-), or Email
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search applicant name, JNY- reference, or venue..."
                value={existingSearchQuery}
                onChange={(e) => setExistingSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5" />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pt-1">
              {matchingMembers.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-stone-400">
                  No matching applicant records found.
                </div>
              ) : (
                matchingMembers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedExistingMember(m)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      selectedExistingMember?.id === m.id
                        ? 'bg-[#FFF5F6] border-[#780C1E]'
                        : 'bg-white hover:bg-[#FAF8F5] border-[#EDE7DF]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#EDE7DF]">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            ID
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                          {m.fullName}
                        </div>
                        <div className="text-[11px] font-mono text-stone-500">
                          {m.memberNumber} · {m.hospitalityRole} · {m.employer || 'Private'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 ${
                        m.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.status === 'waiting_48_hours'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Member Detail & Photo Capture */}
          {selectedExistingMember ? (
            <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#EDE7DF] space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    {selectedExistingMember.fullName}
                  </h3>
                  <div className="text-xs font-mono font-semibold text-[#780C1E]">
                    Ref: {selectedExistingMember.memberNumber}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                    selectedExistingMember.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedExistingMember.status.replace('_', ' ')}
                </span>
              </div>

              {/* Photo Section */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-stone-700 font-bold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#780C1E]" />
                  <span>Update Profile Photo</span>
                </div>
                <PhotoCapture
                  currentPhotoUrl={selectedExistingMember.photoUrl}
                  onPhotoCaptured={(newUrl) =>
                    handleUpdateExistingPhoto(selectedExistingMember.id, newUrl)
                  }
                  label=""
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Apple Wallet Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSendModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Pass Link</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-dashed border-[#EDE7DF] text-center text-stone-500 text-xs sm:text-sm font-medium">
              Select an applicant from the list above to view details, update their photo, or send an isolated pass link.
            </div>
          )}

          {/* Wallet Modal for selected existing member */}
          {selectedExistingMember && (
            <AppleWalletPassModal
              isOpen={showWalletModal}
              onClose={() => setShowWalletModal(false)}
              member={selectedExistingMember}
              onOpenSendModal={() => {
                setShowWalletModal(false);
                setShowSendModal(true);
              }}
            />
          )}

          {/* Send Pass Modal for selected existing member */}
          {selectedExistingMember && (
            <SendPassModal
              isOpen={showSendModal}
              onClose={() => setShowSendModal(false)}
              member={selectedExistingMember}
              onOpenAppleWalletModal={() => {
                setShowSendModal(false);
                setShowWalletModal(true);
              }}
            />
          )}
        </div>
      )}

      {/* PORTAL VIEW 2: NEW APPLICATION FORM */}
      {portalTab === 'new' && (
        <form onSubmit={handleSubmit} className="rounded-2xl sm:rounded-3xl bg-white border border-[#EDE7DF] p-5 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 pb-3 border-b border-[#F0EBE3]">
            Applicant Profile
          </h2>

          {/* 1. Personal & Contact Details (DOB, Phone, Email Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Camilla Moreau"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                Mobile Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. +44 7700 900142 (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g. c.moreau@quovadissoho.co.uk (Optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
            </div>
          </div>

          {/* 2. Workplace Details (Optional) */}
          <div className="pt-4 border-t border-[#F0EBE3] space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-stone-700 font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#780C1E]" />
              <span>Work Place / Hospitality Details (Optional)</span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 font-semibold mb-1.5">
                Work Place / Business Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Quo Vadis, Bar Termini, Soho House (Optional)"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            {/* Profile Photo */}
            <div>
              <PhotoCapture
                currentPhotoUrl={photoUrl}
                onPhotoCaptured={(newUrl) => {
                  setPhotoUrl(newUrl);
                }}
                label="Member Profile Photo (Optional)"
              />
            </div>
          </div>

          {/* 3. Club Rules Agreement & Privacy */}
          <div className="pt-4 border-t border-[#F0EBE3] space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF]">
              <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 mb-2 flex items-center justify-between">
                <span>{currentRules.title} (Version {currentRules.version})</span>
                <span className="text-xs font-mono text-stone-500 font-bold">Effective 2026</span>
              </h3>
              <div className="text-xs text-stone-600 leading-relaxed font-mono max-h-36 overflow-y-auto pr-2 space-y-1.5">
                {currentRules.rules.map((rule, idx) => (
                  <p key={idx}>{rule}</p>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeToRules}
                  onChange={(e) => setAgreeToRules(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-[#EDE7DF] text-[#780C1E] focus:ring-[#780C1E]"
                />
                <span className="text-xs sm:text-sm text-stone-700 leading-snug font-medium">
                  I accept and agree to abide strictly by the Club Rules (Version {currentRules.version}), including the statutory <strong className="text-stone-900">01:00 AM strict last entry rule</strong> and mandatory <strong className="text-stone-900">01:30 AM guest departure rule</strong>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-[#EDE7DF] text-[#780C1E] focus:ring-[#780C1E]"
                />
                <span className="text-xs sm:text-sm text-stone-700 leading-snug font-medium">
                  I confirm that I am aged 18 or over. I consent to my membership credentials and door logs being held securely in compliance with the Licensing Act 2003.
                </span>
              </label>
            </div>
          </div>

          {/* ADMIN OVERRIDE: Clean Single Checkbox Override */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Admin Immediate Activation Override</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={adminBackdate48Hours}
                  onChange={(e) => setAdminBackdate48Hours(e.target.checked)}
                  className="h-5 w-5 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
                />
                <span className="text-xs sm:text-sm font-bold text-amber-950">
                  Immediate Active Approval (Bypass 48-Hour Waiting Period)
                </span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!agreeToRules || !privacyConsent}
              className="w-full py-4 rounded-2xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-serif text-base sm:text-lg font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] cursor-pointer"
            >
              Submit Membership Application
            </button>
            <p className="text-center text-xs font-mono text-stone-400 font-medium mt-2">
              All applications are subject to mandatory 48-hour statutory waiting period before manager review.
            </p>
          </div>
        </form>
      )}

      {isPublicPortal && onExitToStaffPortal && (
        <div className="pt-6 border-t border-[#EDE7DF] text-center">
          <button
            type="button"
            onClick={onExitToStaffPortal}
            className="text-[11px] font-mono text-stone-400 hover:text-stone-700 underline cursor-pointer"
          >
            Door Staff & Reception Login
          </button>
        </div>
      )}
    </div>
  );
};
