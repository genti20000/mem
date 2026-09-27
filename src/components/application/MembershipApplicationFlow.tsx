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
} from 'lucide-react';
import { Member, RuleAcceptance } from '../../types';
import { clubStore } from '../../services/storage';
import { AppleWalletPassModal } from '../cards/AppleWalletPassModal';
import { SendPassModal } from '../cards/SendPassModal';
import { PhotoCapture } from '../common/PhotoCapture';
import { validate48HourWaitingPeriod } from '../../services/ruleEngine';

export const MembershipApplicationFlow: React.FC = () => {
  const currentRules = clubStore.getCurrentRuleVersion();
  const currentStaff = clubStore.getCurrentStaff();
  const isAdmin = currentStaff.role === 'admin' || currentStaff.role === 'manager';

  // Navigation mode: 'new' | 'existing'
  const [portalTab, setPortalTab] = useState<'new' | 'existing'>('new');

  // Form State for New Application
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employer, setEmployer] = useState('');
  const [hospitalityRole, setHospitalityRole] = useState('');
  const [employerWebsiteOrAddress, setEmployerWebsiteOrAddress] = useState('');
  const [employmentEvidenceNote, setEmploymentEvidenceNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [agreeToRules, setAgreeToRules] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Admin 48-Hour Backdate Option
  const [adminBackdate48Hours, setAdminBackdate48Hours] = useState(false);
  const [adminJustification, setAdminJustification] = useState('Paper nomination form received 48+ hours prior');

  // Submission Status
  const [submittedMember, setSubmittedMember] = useState<Member | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(48 * 3600);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

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
  const activeMemberForCountdown = submittedMember || (selectedExistingMember?.status === 'waiting_48_hours' ? selectedExistingMember : null);

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
      applicantEmail: email,
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
      dateOfBirth,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      employer: employer.trim(),
      hospitalityRole: hospitalityRole.trim(),
      employerAddressOrWebsite: employerWebsiteOrAddress.trim(),
      employmentEvidenceNote: employmentEvidenceNote.trim() || undefined,
      photoUrl: photoUrl.trim() || '/src/assets/images/sample_member_photo_1790393794509.jpg',
      status: isBackdated ? 'active' : 'waiting_48_hours',
      appliedAt: appliedAtIso,
      eligibleAt: eligibleAtIso,
      approvedAt: isBackdated ? nowIso : undefined,
      approvedBy: isBackdated ? currentStaff.name : undefined,
      ruleAcceptance,
      notes: isBackdated
        ? `[ADMIN OVERRIDE by ${currentStaff.name}]: Sign-up was completed 48 hours before (${adminJustification}). Active on submission.`
        : 'Submitted via digital application portal. Verified hospitality profession requirement.',
    };

    clubStore.saveMember(
      newMember,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      isBackdated
        ? `Admin backdate override: verified sign-up was done 48 hours before (${adminJustification})`
        : 'New applicant submission'
    );
    setSubmittedMember(newMember);
  };

  // Update photo on an existing/old application
  const handleUpdateExistingPhoto = (memberId: string, newPhotoUrl: string) => {
    const target = allMembers.find((m) => m.id === memberId);
    if (!target) return;

    const updated: Member = {
      ...target,
      photoUrl: newPhotoUrl.trim() || '/src/assets/images/sample_member_photo_1790393794509.jpg',
    };

    clubStore.saveMember(
      updated,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Updated member profile photo for ${target.fullName} (${target.memberNumber})`
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
      <div className="max-w-2xl mx-auto py-8 px-4 text-center">
        <div className="rounded-3xl bg-[#141012] border-2 border-[#581625] shadow-2xl p-6 sm:p-10 relative overflow-hidden">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg border ${
              isInstantActive
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                : 'bg-[#2A0C14] border-[#C6A052] text-[#E5C378]'
            }`}
          >
            {isInstantActive ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <div className="text-xs font-mono tracking-widest text-[#9B7836] uppercase">
            JONNY’S SOHO · ADMISSIONS
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#E5C378] mt-2 mb-3">
            {isInstantActive ? 'MEMBERSHIP ACTIVATED' : 'APPLICATION RECEIVED'}
          </h1>

          {/* Photo Preview & Photo Capture on Confirmation Screen */}
          <div className="my-5 p-4 rounded-2xl bg-[#0B080A] border border-[#2B0A13] text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#C6A052]">
                Application Photo ID
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                Add photo or take new anytime
              </span>
            </div>
            <PhotoCapture
              currentPhotoUrl={submittedMember.photoUrl}
              onPhotoCaptured={(newUrl) => handleUpdateExistingPhoto(submittedMember.id, newUrl)}
              label=""
            />
          </div>

          {photoSuccessToast && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{photoSuccessToast}</span>
            </div>
          )}

          {isInstantActive ? (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/50 my-6 text-stone-200 text-sm leading-relaxed text-left">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase mb-1">
                <Shield className="w-4 h-4" />
                <span>Admin Override Applied · 48H Requirement Satisfied</span>
              </div>
              <p className="text-xs text-stone-300">
                Application timestamp was officially backdated to 48 hours prior ({submittedMember.notes}). The applicant has been issued active membership and is immediately eligible for door admission and late-night guest sponsorship.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1E1418] border border-[#3E101B] my-6 text-stone-300 text-sm leading-relaxed text-left">
              <p className="font-serif text-base text-[#E5C378] mb-2 font-medium">
                “Membership applications are subject to review and a minimum 48-hour waiting period before membership privileges can begin.”
              </p>
              <p className="text-xs text-stone-400">
                Pursuant to Westminster City Council club licensing regulations for 23 Frith Street, membership privileges, late-night door access, and member guest arrangements cannot commence until 48 full hours have elapsed.
              </p>
            </div>
          )}

          {/* Live Countdown Timer (only if still waiting) */}
          {!isInstantActive && (
            <div className="p-6 rounded-2xl bg-[#0B090A] border border-[#2B0A13] my-6">
              <div className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-2">
                Mandatory Waiting Period Countdown
              </div>
              <div className="flex items-center justify-center gap-3 font-mono text-3xl sm:text-4xl font-bold text-[#E5C378]">
                <div className="p-3 rounded-xl bg-[#181114] border border-[#3E101B] min-w-[70px]">
                  <div>{String(hours).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-500 font-sans uppercase">Hours</div>
                </div>
                <span className="text-stone-600">:</span>
                <div className="p-3 rounded-xl bg-[#181114] border border-[#3E101B] min-w-[70px]">
                  <div>{String(minutes).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-500 font-sans uppercase">Minutes</div>
                </div>
                <span className="text-stone-600">:</span>
                <div className="p-3 rounded-xl bg-[#181114] border border-[#3E101B] min-w-[70px]">
                  <div>{String(seconds).padStart(2, '0')}</div>
                  <div className="text-[10px] text-stone-500 font-sans uppercase">Seconds</div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[#1D1115] border border-amber-500/20 text-xs text-amber-200/90 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Important Notice:</strong> Expiry of the 48-hour waiting period does not automatically guarantee approval. All candidates are reviewed by management for verified active employment in the hospitality trade.
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1 text-xs text-stone-400">
            <div>Candidate: <strong className="text-stone-200">{submittedMember.fullName}</strong></div>
            <div>Application Reference: <span className="font-mono text-[#E5C378]">{submittedMember.memberNumber}</span></div>
            <div>Trade Role: <span className="text-stone-300">{submittedMember.hospitalityRole} at {submittedMember.employer}</span></div>
            <div>Status: <span className={`font-mono font-bold uppercase ${isInstantActive ? 'text-emerald-400' : 'text-amber-400'}`}>{submittedMember.status.replace('_', ' ')}</span></div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 text-white font-mono text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
              </svg>
              <span>Add to Apple Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#581625] hover:bg-[#6F1B2F] border border-[#C6A052]/50 text-[#E5C378] font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Pass</span>
            </button>

            <button
              onClick={() => setSubmittedMember(null)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#28181F] hover:bg-[#38222C] border border-[#C6A052]/40 text-[#E5C378] text-xs font-semibold"
            >
              Submit Another
            </button>
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
    <div className="max-w-3xl mx-auto py-4 px-4 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#200A11] via-[#141012] to-[#141012] border border-[#3E101B] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#9B7836] uppercase">
          PETTITT · 23 FRITH STREET SOHO
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#E5C378] mt-1 mb-2">
          Hospitality Industry Membership
        </h1>
        <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
          Jonny’s Members is a private Soho sanctuary exclusively reserved for individuals actively employed in the hospitality, food & beverage, and culinary professions.
        </p>

        {/* Main Tab Switcher: New Application vs Existing / Old Application */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-[#3E101B]/80">
          <button
            type="button"
            onClick={() => setPortalTab('new')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              portalTab === 'new'
                ? 'bg-gradient-to-r from-[#581625] to-[#3E101B] text-[#E5C378] border border-[#C6A052]/60 shadow-md'
                : 'bg-[#181114] text-stone-400 border border-[#2B0A13] hover:text-white hover:bg-[#23171B]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5C378]" />
            <span>New Membership Application</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('existing')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              portalTab === 'existing'
                ? 'bg-gradient-to-r from-[#581625] to-[#3E101B] text-[#E5C378] border border-[#C6A052]/60 shadow-md'
                : 'bg-[#181114] text-stone-400 border border-[#2B0A13] hover:text-white hover:bg-[#23171B]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#E5C378]" />
            <span>Existing / Old Application (Add or Take Photo)</span>
          </button>
        </div>
      </div>

      {/* PORTAL VIEW 1: EXISTING / OLD APPLICATION LOOKUP & PHOTO MANAGEMENT */}
      {portalTab === 'existing' && (
        <div className="space-y-6 animate-fadeIn">
          {photoSuccessToast && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{photoSuccessToast}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="p-5 rounded-2xl bg-[#120F11] border border-[#2B0A13] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-[#C6A052] font-semibold flex items-center gap-2">
                <Search className="w-4 h-4" />
                Find Existing Application
              </label>
              <span className="text-[10px] text-stone-400 font-mono">
                Search by Name, Reference No (e.g. JNY-), or Email
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search applicant name, JNY- reference, or venue..."
                value={existingSearchQuery}
                onChange={(e) => setExistingSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0A0809] border border-[#3E101B] rounded-xl text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C6A052]"
              />
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
            </div>

            {/* Quick Applications list pills */}
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-2">
                Recent Applications on File:
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {matchingMembers.slice(0, 10).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedExistingMember(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all text-left flex items-center gap-2 border ${
                      selectedExistingMember?.id === m.id
                        ? 'bg-[#3E101B] border-[#C6A052] text-[#E5C378]'
                        : 'bg-[#181215] border-[#2E1018] text-stone-300 hover:border-[#C6A052]/40 hover:bg-[#20171B]'
                    }`}
                  >
                    <span className="font-semibold">{m.fullName}</span>
                    <span className="text-[10px] text-stone-400">({m.memberNumber})</span>
                    <span
                      className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${
                        m.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400'
                          : m.status === 'waiting_48_hours'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Application Card */}
          {selectedExistingMember ? (
            <div className="rounded-2xl bg-[#120F11] border border-[#3E101B] p-6 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#240D16]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-serif text-2xl font-bold text-stone-100">
                      {selectedExistingMember.fullName}
                    </h2>
                    <span className="font-mono text-xs text-[#C6A052]">
                      ({selectedExistingMember.memberNumber})
                    </span>
                  </div>
                  <div className="text-xs text-stone-300 mt-1">
                    <strong>{selectedExistingMember.hospitalityRole}</strong> at <strong>{selectedExistingMember.employer}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                    Applied on: {new Date(selectedExistingMember.appliedAt).toLocaleString('en-GB')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-bold border ${
                      selectedExistingMember.status === 'active'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : selectedExistingMember.status === 'waiting_48_hours'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : 'bg-stone-800 border-stone-600 text-stone-300'
                    }`}
                  >
                    {selectedExistingMember.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* PHOTO SECTION FOR OLD APPLICATION: ADD PHOTO OR TAKE NEW */}
              <div className="p-5 rounded-2xl bg-[#0B080A] border border-[#2B0A13] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#C6A052]" />
                    <span className="font-serif text-base font-bold text-[#E5C378]">
                      Application Profile Photo
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    Westminster Licensing Admission Compliance
                  </span>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  Update or add an official portrait photo for this application. You can either <strong>take a new snapshot</strong> using your device's camera or <strong>upload an existing photo</strong>.
                </p>

                {/* Interactive Photo Capture / Upload for this Application */}
                <div className="pt-2">
                  <PhotoCapture
                    currentPhotoUrl={selectedExistingMember.photoUrl}
                    onPhotoCaptured={(newPhotoUrl) =>
                      handleUpdateExistingPhoto(selectedExistingMember.id, newPhotoUrl)
                    }
                    label="Attach Photo (Add Photo or Take New)"
                  />
                </div>
              </div>

              {/* Status details & Countdown if waiting */}
              {selectedExistingMember.status === 'waiting_48_hours' && (
                <div className="p-4 rounded-xl bg-[#1A1115] border border-[#3E101B] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      48-Hour Waiting Period in Progress
                    </div>
                    <div className="text-xs text-stone-300">
                      Membership admission privileges activate after 48 continuous hours.
                    </div>
                  </div>
                  <div className="font-mono text-xl font-bold text-[#E5C378] shrink-0">
                    {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(true)}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 text-white font-mono text-xs flex items-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
                  </svg>
                  <span>Apple Wallet Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#581625] hover:bg-[#6F1B2F] border border-[#C6A052]/50 text-[#E5C378] font-mono text-xs font-semibold flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Pass Link</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#120F11] border border-dashed border-[#2B0A13] text-center text-stone-400 text-xs">
              Select an application from the list above or search by name to view details and add or take a new photo.
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
        <form onSubmit={handleSubmit} className="rounded-2xl bg-[#120F11] border border-[#2B0A13] p-6 sm:p-8 space-y-6 shadow-xl animate-fadeIn">
          <h2 className="font-serif text-xl font-bold text-[#E5C378] pb-3 border-b border-[#280C14]">
            Applicant Personal & Professional Profile
          </h2>

          {/* 1. Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Camilla Moreau"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Date of Birth * (Must be 18+)
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-[#C6A052]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. c.moreau@quovadissoho.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Mobile Contact Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +44 7700 900142"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
              />
            </div>
          </div>

          {/* 2. Hospitality Employment Qualifications */}
          <div className="pt-4 border-t border-[#200A11] space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-[#C6A052] flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Hospitality Industry Employment Qualification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Current Employer / Business *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quo Vadis, Bar Termini, Dean St Townhouse"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Hospitality Role / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Head Sommelier, Bar Manager, Sous Chef"
                  value={hospitalityRole}
                  onChange={(e) => setHospitalityRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Employer Address or Website *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 26-29 Dean Street, London W1D 3LL or https://quovadissoho.co.uk"
                value={employerWebsiteOrAddress}
                onChange={(e) => setEmployerWebsiteOrAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                Employment Verification Notes / References (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Provide employer reference, WSET qualification, or licence number..."
                value={employmentEvidenceNote}
                onChange={(e) => setEmploymentEvidenceNote(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0A0809] border border-[#3E101B] rounded-lg text-xs sm:text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
              />
            </div>

            {/* Profile Photo: Add or Take New */}
            <div>
              <PhotoCapture
                currentPhotoUrl={photoUrl}
                onPhotoCaptured={setPhotoUrl}
                label="Member Profile Photo (Add Photo or Take New)"
              />
            </div>
          </div>

          {/* 3. Club Rules Agreement & Privacy */}
          <div className="pt-4 border-t border-[#200A11] space-y-4">
            <div className="p-4 rounded-xl bg-[#0F0B0D] border border-[#2B0A13]">
              <h3 className="font-serif text-sm font-bold text-[#E5C378] mb-2 flex items-center justify-between">
                <span>{currentRules.title} (Version {currentRules.version})</span>
                <span className="text-[10px] font-mono text-stone-500">Effective 2026</span>
              </h3>
              <div className="text-xs text-stone-300 leading-relaxed font-mono max-h-36 overflow-y-auto pr-2 space-y-1">
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
                  className="mt-1 h-4 w-4 rounded border-[#3E101B] bg-black text-[#C6A052] focus:ring-[#C6A052]"
                />
                <span className="text-xs text-stone-300 leading-snug">
                  I accept and agree to abide strictly by the Club Rules (Version {currentRules.version}), including the statutory <strong>01:00 AM strict last entry rule</strong> and mandatory <strong>01:30 AM guest departure rule</strong>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#3E101B] bg-black text-[#C6A052] focus:ring-[#C6A052]"
                />
                <span className="text-xs text-stone-300 leading-snug">
                  I confirm that I am aged 18 or over and actively employed in the hospitality trade. I consent to my membership credentials and door logs being held securely in compliance with the Licensing Act 2003.
                </span>
              </label>
            </div>
          </div>

          {/* ADMIN OVERRIDE: 48-Hour Waiting Period Bypass */}
          {isAdmin && (
            <div className="p-4 rounded-xl bg-[#2A0C14] border-2 border-[#C6A052]/50 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#E5C378]">
                <Sparkles className="w-4 h-4 text-[#E5C378]" />
                <span>Admin Authority: 48-Hour Waiting Period Override</span>
              </div>
              <p className="text-xs text-stone-300">
                If the applicant completed their paper sign-up form 48 hours prior, check below to backdate their submission timestamp.
              </p>
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={adminBackdate48Hours}
                  onChange={(e) => setAdminBackdate48Hours(e.target.checked)}
                  className="h-4 w-4 rounded border-[#C6A052] bg-black text-[#C6A052] focus:ring-[#C6A052]"
                />
                <span className="text-xs font-bold text-[#E5C378]">
                  Sign-up completed 48 hours before (Immediate Activation)
                </span>
              </label>

              {adminBackdate48Hours && (
                <div className="pt-2">
                  <label className="block text-[11px] font-mono text-stone-300 mb-1">
                    Audit Justification *
                  </label>
                  <input
                    type="text"
                    value={adminJustification}
                    onChange={(e) => setAdminJustification(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#14080D] border border-[#C6A052]/40 rounded text-xs text-stone-200"
                    placeholder="e.g. Paper nomination form received 48+ hours prior"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!agreeToRules || !privacyConsent}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B1E3F] via-[#581625] to-[#8B1E3F] hover:from-[#A02349] hover:via-[#6F1B2F] hover:to-[#A02349] border border-[#C6A052]/50 text-[#E5C378] font-serif text-base font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] cursor-pointer"
            >
              Submit Membership Application
            </button>
            <p className="text-center text-[10px] font-mono text-stone-500 mt-2">
              All applications are subject to mandatory 48-hour statutory waiting period before manager review.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
