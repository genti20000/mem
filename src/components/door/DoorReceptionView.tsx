import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Search,
  UserPlus,
  Crown,
  LogOut,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  User,
  Users,
  Camera,
  Check,
  ChevronRight,
  AlertCircle,
  Shield,
  Sparkles,
  Lock,
  Maximize2,
  Minimize2,
  Share2,
} from 'lucide-react';
import {
  Member,
  StaffUser,
  VisitRecord,
  ProprietorGuest,
} from '../../types';
import { clubStore, getVenueCurrentDate, subscribeToStore } from '../../services/storage';
import {
  getNightModeState,
  validateAdmission,
  validateMemberStatus,
  validate48HourWaitingPeriod,
  MAX_CUSTOMER_CAPACITY,
  MAX_SMOKERS_OUTSIDE,
  MAX_PROPRIETOR_GUESTS_CONCURRENT,
  MAX_GUESTS_PER_MEMBER_LATE_NIGHT,
} from '../../services/ruleEngine';
import { verifyMemberToken } from '../../services/security';
import { SmokingManagerModal } from './SmokingManagerModal';
import { IncidentLoggerModal } from './IncidentLoggerModal';
import { UniversalCameraScanner } from '../camera/UniversalCameraScanner';
import { AppleWalletPassModal } from '../cards/AppleWalletPassModal';
import { SendPassModal } from '../cards/SendPassModal';
import { PhotoCaptureModal } from '../common/PhotoCapture';
import { ShieldCheck, Eye, Cpu, Scan } from 'lucide-react';
import { parseMemberFromQRToken, generateSignedMemberToken } from '../../services/security';

// Play luxury chime for door feedback
function playAudioFeedback(success: boolean) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.36);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.23);
    }
  } catch {
    // Autoplay restrictions
  }
}

interface DoorReceptionViewProps {
  currentStaff: StaffUser;
  onOpenTestRunner: () => void;
  onNavigateToApplications: () => void;
}

export const DoorReceptionView: React.FC<DoorReceptionViewProps> = ({
  currentStaff,
  onOpenTestRunner,
  onNavigateToApplications,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(getVenueCurrentDate());
  const [stats, setStats] = useState(clubStore.getCapacityStats());
  const [activeVisits, setActiveVisits] = useState(clubStore.getVisits().filter((v) => v.isCurrentlyInside));

  // Modals & Panels
  const [showSmokingModal, setShowSmokingModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showProprietorGuestModal, setShowProprietorGuestModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // iPad / Kiosk Fullscreen Mode State
  const [isKioskScannerActive, setIsKioskScannerActive] = useState(false);
  const [isKioskFullScreen, setIsKioskFullScreen] = useState(false);

  // Scan Visual Feedback Modal State
  const [scanFeedbackModal, setScanFeedbackModal] = useState<{
    isOpen: boolean;
    member: Member;
    isGranted: boolean;
    reason?: string;
  } | null>(null);

  const toggleFullScreenKiosk = async () => {
    if (!isKioskFullScreen && !document.fullscreenElement) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Browser fullscreen policy fallback
      }
      setIsKioskFullScreen(true);
      setIsKioskScannerActive(true);
    } else {
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Fallback
      }
      setIsKioskFullScreen(false);
    }
  };
  const [kioskScanFlash, setKioskScanFlash] = useState<'success' | 'failure' | null>(null);
  const [kioskFeedbackMessage, setKioskFeedbackMessage] = useState<string | null>(null);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');

  // Selected Member Status Panel (Active / Waiting / Suspended)
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Auto-clear welcome/re-entry message after 2.5s to keep camera view clean
  useEffect(() => {
    if (scanMessage) {
      const timer = setTimeout(() => {
        setScanMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanMessage]);
  const [showAppleWalletModal, setShowAppleWalletModal] = useState<boolean>(false);
  const [showSendPassModal, setShowSendPassModal] = useState<boolean>(false);
  const [walletTargetMember, setWalletTargetMember] = useState<Member | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [enrollTargetMember, setEnrollTargetMember] = useState<Member | null>(null);

  // Guest Registration Form state
  const [selectedSponsoringMemberId, setSelectedSponsoringMemberId] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [guestErrorMessage, setGuestErrorMessage] = useState<string | null>(null);

  // Proprietor Guest Form state
  const [proprietorGuestName, setProprietorGuestName] = useState('');
  const [proprietorReason, setProprietorReason] = useState('');
  const [proprietorErrorMessage, setProprietorErrorMessage] = useState<string | null>(null);

  // Search state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [checkoutSearchQuery, setCheckoutSearchQuery] = useState('');

  // Check camera permissions respecting metadata.json ("camera" in requestFramePermissions)
  useEffect(() => {
    async function checkCameraPerm() {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermissionStatus(status.state as 'granted' | 'prompt' | 'denied');
          status.onchange = () => {
            setCameraPermissionStatus(status.state as 'granted' | 'prompt' | 'denied');
          };
        } catch {
          setCameraPermissionStatus('prompt');
        }
      } else {
        setCameraPermissionStatus('prompt');
      }
    }
    checkCameraPerm();
  }, []);

  // Handle live QR code scanning directly from iPad front-facing camera via react-qr-reader
  const handleLiveQrScanned = (rawText: string) => {
    if (!rawText) return;
    const members = clubStore.getMembers();
    const tokenResult = parseMemberFromQRToken(rawText, members);

    let memberMatch: Member | null = null;
    let isValid = false;

    if (tokenResult.valid && tokenResult.member) {
      const found = tokenResult.member as Member;
      memberMatch = found;
      isValid = found.status === 'active';
    } else {
      const direct = members.find(
        (m) =>
          m.id.toLowerCase() === rawText.trim().toLowerCase() ||
          m.memberNumber.toLowerCase() === rawText.trim().toLowerCase()
      );
      if (direct) {
        memberMatch = direct;
        isValid = direct.status === 'active';
      }
    }

    if (isValid && memberMatch) {
      setKioskScanFlash('success');
      setKioskFeedbackMessage(`Verified: ${memberMatch.fullName} (${memberMatch.memberNumber})`);
      handleSelectMember(memberMatch);
      setTimeout(() => setKioskScanFlash(null), 1200);
    } else {
      setKioskScanFlash('failure');
      setKioskFeedbackMessage(
        memberMatch
          ? `Member status is "${memberMatch.status.toUpperCase()}"`
          : 'Unrecognized QR code'
      );
      setTimeout(() => setKioskScanFlash(null), 1500);
    }
  };

  // Update on store updates and tick clock
  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setStats(clubStore.getCapacityStats());
      setActiveVisits(clubStore.getVisits().filter((v) => v.isCurrentlyInside));
      setCurrentDate(getVenueCurrentDate());
    });

    const timer = setInterval(() => {
      setCurrentDate(getVenueCurrentDate());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const nightMode = getNightModeState(currentDate);
  const allMembers = clubStore.getMembers();
  const waitingListCount = allMembers.filter(
    (m) => m.status === 'waiting_48_hours' || m.status === 'pending'
  ).length;

  // Inspect member check-in & guest status
  const getMemberActiveGuestsCount = (memberId: string): number => {
    const today = currentDate.toISOString().split('T')[0];
    const memberVisit = clubStore.getVisits().find(
      (v) => v.memberId === memberId && v.date === today && v.isCurrentlyInside
    );
    return memberVisit?.guestNames?.length || 0;
  };

  const isMemberCurrentlyInside = (memberId: string): boolean => {
    return activeVisits.some((v) => v.memberId === memberId);
  };

  // Trigger Visual Feedback Modal after a Scan
  const triggerScanFeedbackModal = (member: Member) => {
    const validation = validateAdmission({
      category: 'member',
      member,
      venueDate: currentDate,
      currentCustomerCount: stats.totalCustomers,
      staffRole: currentStaff.role,
    });

    const isGranted = member.status === 'active' && validation.allowed;
    const reason = !isGranted
      ? validation.reason || (member.status === 'suspended'
          ? 'MEMBER ACCOUNT SUSPENDED'
          : member.status === 'waiting_48_hours' || member.status === 'pending'
          ? '48-HOUR STATUTORY WAITING PERIOD ACTIVE'
          : 'ADMISSION DENIED BY LICENSING RULE')
      : 'MEMBER PASS & LICENSING VALIDATION PASSED';

    playAudioFeedback(isGranted);

    setScanFeedbackModal({
      isOpen: true,
      member,
      isGranted,
      reason,
    });

    setScannedMember(member);
    setScanMessage(null);
    setShowMemberLookup(false);
    setShowScannerModal(false);
  };

  // Handle Scanning or selecting a member
  const handleSelectMember = (member: Member) => {
    setScannedMember(member);
    setScanMessage(null);
    setShowMemberLookup(false);
    setShowScannerModal(false);
  };

  // Perform Member Check-In or Re-Entry
  const handleCheckInMember = (member: Member) => {
    setScannedMember(member);
    setScanMessage(null);

    const today = currentDate.toISOString().split('T')[0];
    const allVisitsToday = clubStore.getVisits().filter((v) => v.date === today && v.memberId === member.id);
    const existingActiveVisit = allVisitsToday.find((v) => v.isCurrentlyInside);
    const existingPastVisitToday = allVisitsToday.find((v) => !v.isCurrentlyInside);

    // Case 1: Member is currently marked inside
    if (existingActiveVisit) {
      if (existingActiveVisit.isOutToSmoke) {
        // Return from smoking break! Update existing record without creating duplicates
        clubStore.markSmokingReturnedByVisitId(existingActiveVisit.id);
        existingActiveVisit.isOutToSmoke = false;
        existingActiveVisit.entryType = 'return';
        clubStore.saveVisit(existingActiveVisit);

        playAudioFeedback(true);
        setScanMessage(`RE-ENTRY (RETURN FROM SMOKING): Welcome back inside, ${member.fullName}!`);
        clubStore.addAuditLog({
          actorId: currentStaff.id,
          actorName: currentStaff.name,
          actorRole: currentStaff.role,
          action: 'SMOKING_RETURN',
          targetType: 'member',
          targetId: member.id,
          targetName: member.fullName,
          newValue: 'Status: Inside (Returned from smoking area)',
          reason: 'Biometric face scan re-entry from smoking area',
        });
        return;
      } else {
        // Member is already inside
        const checkInFormattedTime = new Date(existingActiveVisit.checkInTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setScanMessage(`ALREADY INSIDE: ${member.fullName} was admitted at ${checkInFormattedTime}. Use controls below to step out to smoke or check out.`);
        return;
      }
    }

    // Case 2: Member checked in earlier today, checked out, and is now returning to the venue
    if (existingPastVisitToday) {
      // Re-admit under the same visit record as Return without duplicate creation
      existingPastVisitToday.isCurrentlyInside = true;
      existingPastVisitToday.checkOutTime = undefined;
      existingPastVisitToday.entryType = 'return';
      existingPastVisitToday.checkInTime = currentDate.toISOString();
      existingPastVisitToday.responsibleStaffId = currentStaff.id;
      existingPastVisitToday.responsibleStaffName = currentStaff.name;

      clubStore.saveVisit(existingPastVisitToday);
      playAudioFeedback(true);

      clubStore.addAuditLog({
        actorId: currentStaff.id,
        actorName: currentStaff.name,
        actorRole: currentStaff.role,
        action: 'CHECK_IN_MEMBER',
        targetType: 'member',
        targetId: member.id,
        targetName: member.fullName,
        newValue: `Re-Entry Return (Occupancy: ${stats.totalCustomers + 1} / ${MAX_CUSTOMER_CAPACITY})`,
        reason: `Re-admitted as Return under ${nightMode.mode} rules.`,
      });

      setScanMessage(`RE-ENTRY (RETURN): Welcome back to 23 Frith Street, ${member.fullName}! Status: Marked as Return.`);
      return;
    }

    // Case 3: Fresh 'Arrival' for today (First time checking in today)
    const validation = validateAdmission({
      category: 'member',
      member,
      venueDate: currentDate,
      currentCustomerCount: stats.totalCustomers,
      staffRole: currentStaff.role,
    });

    if (!validation.allowed) {
      setScanMessage(validation.reason || 'Check-in blocked by licensing rule.');
      return;
    }

    // Register fresh Arrival visit
    const newVisit: VisitRecord = {
      id: `vis-${Date.now()}`,
      date: today,
      attendeeType: 'member',
      memberId: member.id,
      memberName: member.fullName,
      memberNumber: member.memberNumber,
      guestNames: [],
      checkInTime: currentDate.toISOString(),
      isCurrentlyInside: true,
      isOutToSmoke: false,
      entryType: 'arrival',
      responsibleStaffId: currentStaff.id,
      responsibleStaffName: currentStaff.name,
    };

    clubStore.saveVisit(newVisit);
    playAudioFeedback(true);

    clubStore.addAuditLog({
      actorId: currentStaff.id,
      actorName: currentStaff.name,
      actorRole: currentStaff.role,
      action: 'CHECK_IN_MEMBER',
      targetType: 'member',
      targetId: member.id,
      targetName: member.fullName,
      newValue: `Fresh Arrival (Occupancy: ${stats.totalCustomers + 1} / ${MAX_CUSTOMER_CAPACITY})`,
      reason: `Admitted under ${nightMode.mode} rules. Status: Fresh Arrival.`,
    });

    setScanMessage(`FRESH ARRIVAL: Welcome to 23 Frith Street, ${member.fullName}! Status: Marked as Fresh Arrival.`);
  };

  // Add guest for a member
  const handleAddGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestErrorMessage(null);

    if (!selectedSponsoringMemberId || !newGuestName.trim()) {
      setGuestErrorMessage('Member and guest name are required.');
      return;
    }

    const sponsoringMember = clubStore.getMemberById(selectedSponsoringMemberId);
    if (!sponsoringMember) {
      setGuestErrorMessage('Sponsoring member not found.');
      return;
    }

    const currentGuestCount = getMemberActiveGuestsCount(sponsoringMember.id);

    const validation = validateAdmission({
      category: 'member_guest',
      member: sponsoringMember,
      venueDate: currentDate,
      currentCustomerCount: stats.totalCustomers,
      activeGuestsForMemberCount: currentGuestCount,
      staffRole: currentStaff.role,
    });

    if (!validation.allowed) {
      setGuestErrorMessage(validation.reason || 'Guest admission blocked.');
      return;
    }

    // Add guest to active visit
    const visits = clubStore.getVisits();
    const today = currentDate.toISOString().split('T')[0];
    let memberVisit = visits.find(
      (v) => v.memberId === sponsoringMember.id && v.date === today && v.isCurrentlyInside
    );

    if (!memberVisit) {
      // Create new visit with member + guest
      memberVisit = {
        id: `vis-${Date.now()}`,
        date: today,
        attendeeType: 'member',
        memberId: sponsoringMember.id,
        memberName: sponsoringMember.fullName,
        memberNumber: sponsoringMember.memberNumber,
        guestNames: [newGuestName.trim()],
        checkInTime: currentDate.toISOString(),
        isCurrentlyInside: true,
        isOutToSmoke: false,
        responsibleStaffId: currentStaff.id,
        responsibleStaffName: currentStaff.name,
      };
      clubStore.saveVisit(memberVisit);
    } else {
      memberVisit.guestNames.push(newGuestName.trim());
      clubStore.saveVisit(memberVisit);
    }

    clubStore.addAuditLog({
      actorId: currentStaff.id,
      actorName: currentStaff.name,
      actorRole: currentStaff.role,
      action: 'ADD_MEMBER_GUEST',
      targetType: 'guest',
      targetId: sponsoringMember.id,
      targetName: newGuestName.trim(),
      newValue: `Guest of ${sponsoringMember.fullName} (Guest ${currentGuestCount + 1} / ${MAX_GUESTS_PER_MEMBER_LATE_NIGHT})`,
    });

    setNewGuestName('');
    setShowAddGuestModal(false);
  };

  // Add Proprietor Guest
  const handleProprietorGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProprietorErrorMessage(null);

    const validation = validateAdmission({
      category: 'proprietor_guest',
      venueDate: currentDate,
      currentCustomerCount: stats.totalCustomers,
      currentProprietorGuestCount: stats.proprietorGuestsInside,
      staffRole: currentStaff.role,
    });

    if (!validation.allowed) {
      setProprietorErrorMessage(validation.reason || 'Proprietor guest blocked.');
      return;
    }

    const newPropGuest: ProprietorGuest = {
      id: `prop-${Date.now()}`,
      fullName: proprietorGuestName.trim(),
      affiliationOrReason: proprietorReason.trim() || 'Proprietor Hospitality Invitation',
      authorizedByManagerId: currentStaff.id,
      authorizedByManagerName: currentStaff.name,
      checkInTime: currentDate.toISOString(),
    };

    clubStore.addProprietorGuest(newPropGuest, currentStaff);
    setProprietorGuestName('');
    setProprietorReason('');
    setShowProprietorGuestModal(false);
  };

  // Check out patron
  const handleCheckOut = (visitId: string) => {
    clubStore.checkOutVisit(visitId, currentStaff);
  };

  // Filtered members for search
  const filteredMembers = allMembers.filter((m) => {
    const q = memberSearchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      m.employer.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  // Filtered visits for checkout
  const filteredCheckouts = activeVisits.filter((v) => {
    const q = checkoutSearchQuery.toLowerCase();
    return (
      v.memberName.toLowerCase().includes(q) ||
      (v.memberNumber && v.memberNumber.toLowerCase().includes(q)) ||
      v.guestNames.some((g) => g.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-full bg-[#FAF8F5] text-stone-900 pb-20">
      {/* 1. Sleek Compact Door Admission Bar (Replaces bulky 6-card row) */}
      <section className="px-3.5 sm:px-6 py-2.5 bg-white border-b border-[#EDE7DF] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-serif text-sm sm:text-base font-bold text-stone-900 tracking-tight">
            AMICA SOHO · DOOR ADMISSIONS
          </span>
          <span className="text-[11px] font-mono text-stone-400 hidden md:inline">
            23 Frith Street · Licensing Register
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-stone-700 font-semibold">
            Inside: <strong className="text-stone-900 font-bold">{stats.totalCustomers}</strong>/80
          </span>
          <button
            type="button"
            onClick={() => setShowSmokingModal(true)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-bold cursor-pointer transition-colors"
          >
            Terrace: {stats.smokersOutside}/10
          </button>
          {waitingListCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold">
              Waiting 48h: {waitingListCount}
            </span>
          )}
        </div>
      </section>

      {/* Main Workspace */}
      <section className="p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-4 sm:gap-6">
        {/* Left Pane: Authorise Screen & Primary Scan Pass Interface */}
        <div className="pane space-y-4">

          {/* ============================================================ */}
          {/* 1. AUTHORISE SCREEN - APPEARS AT THE VERY TOP OF THE PAGE    */}
          {/* No scrolling required: member identity & decision in front   */}
          {/* ============================================================ */}
          {scannedMember && (
            <div className="w-full bg-white border-2 border-stone-800/10 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden transition-all animate-fadeIn">
              {/* Dismiss / Scan Next Button */}
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#F0EBE3]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-stone-900 text-white">
                    Pass Scanned
                  </span>
                  <span className="text-xs font-mono text-stone-500">
                    Badge: <strong className="text-stone-900">{scannedMember.memberNumber}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedMember(null);
                      setShowScannerModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan Next</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannedMember(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-[#FAF8F5] cursor-pointer"
                    title="Close Member View"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Authorisation Banner Status */}
              <div className="my-3 sm:my-4">
                {scannedMember.status === 'active' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-lg sm:text-xl font-bold text-emerald-950 tracking-tight">
                        AUTHORISED · ACTIVE MEMBER
                      </div>
                      <div className="text-xs font-mono font-semibold text-emerald-800">
                        Amica Soho · 23 Frith Street · Westminster Licensing Pass Approved
                      </div>
                    </div>
                  </div>
                ) : scannedMember.status === 'waiting_48_hours' || scannedMember.status === 'pending' ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif text-lg sm:text-xl font-bold text-amber-950 tracking-tight">
                          48-HOUR STATUTORY WAITING PERIOD
                        </div>
                        <div className="text-xs font-mono text-amber-800 font-medium">
                          {validate48HourWaitingPeriod(scannedMember.appliedAt).reason}
                        </div>
                      </div>
                    </div>

                    {/* Single-Click Instant Admin Override */}
                    {(currentStaff.role === 'admin' || currentStaff.role === 'manager') && (
                      <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-amber-900 font-medium">
                          Admin Override: Sign-up verified 48h prior
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = clubStore.bypass48HourWaiting(
                              scannedMember.id,
                              currentStaff,
                              'Admin verified sign-up was completed 48 hours prior (paper nomination / historical register).'
                            );
                            if (updated) {
                              setScannedMember(updated);
                              setScanMessage(`Admin Override Applied: ${updated.fullName} is now ACTIVE.`);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                        >
                          Bypass & Authorise Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-[#780C1E] shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-lg sm:text-xl font-bold text-[#780C1E] tracking-tight">
                        MEMBERSHIP NOT AUTHORISED
                      </div>
                      <div className="text-xs text-rose-800 font-mono font-medium">
                        {validateMemberStatus(scannedMember).reason}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Member Profile Spotlight */}
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 items-center bg-[#FAF8F5] p-3.5 sm:p-4 rounded-2xl border border-[#EDE7DF]">
                {/* Photo */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[#EDE7DF] bg-white shrink-0 shadow-2xs">
                  {scannedMember.photoUrl ? (
                    <img
                      src={scannedMember.photoUrl}
                      alt={scannedMember.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
                    {scannedMember.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-[#780C1E]">
                      {scannedMember.memberNumber}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-600 font-medium">
                      {scannedMember.hospitalityRole || 'Hospitality Member'}
                    </span>
                    {scannedMember.employer && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-500">{scannedMember.employer}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
                    {isMemberCurrentlyInside(scannedMember.id) ? (
                      <span className="text-emerald-700 font-bold">● Currently inside venue</span>
                    ) : (
                      <span className="text-stone-400 font-medium">○ Not checked in tonight</span>
                    )}
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-600">
                      Guests: <strong>{getMemberActiveGuestsCount(scannedMember.id)}</strong>/{MAX_GUESTS_PER_MEMBER_LATE_NIGHT}
                    </span>
                  </div>
                </div>

                {/* Direct Authorisation Action */}
                <div className="flex flex-col gap-2 shrink-0 sm:w-48">
                  {scannedMember.status === 'active' && (
                    <>
                      {!isMemberCurrentlyInside(scannedMember.id) ? (
                        <button
                          type="button"
                          onClick={() => handleCheckInMember(scannedMember)}
                          disabled={nightMode.mode === 'no_new_admissions'}
                          className="w-full py-3.5 px-4 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Authorise & Admit</span>
                        </button>
                      ) : (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center font-mono">
                          ✓ Already Admitted
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Quick Controls (Guest, Smoking Break, Wallet) */}
              <div className="mt-3.5 pt-3 border-t border-[#F0EBE3] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSponsoringMemberId(scannedMember.id);
                      setShowAddGuestModal(true);
                    }}
                    disabled={
                      nightMode.mode === 'no_new_admissions' ||
                      getMemberActiveGuestsCount(scannedMember.id) >= MAX_GUESTS_PER_MEMBER_LATE_NIGHT
                    }
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 font-mono text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#780C1E]" />
                    <span>+ Add Guest ({getMemberActiveGuestsCount(scannedMember.id)}/2)</span>
                  </button>

                  {isMemberCurrentlyInside(scannedMember.id) && (
                    <>
                      {activeVisits.find((v) => v.memberId === scannedMember.id)?.isOutToSmoke ? (
                        <button
                          type="button"
                          onClick={() => {
                            const visit = activeVisits.find((v) => v.memberId === scannedMember.id);
                            if (visit) {
                              clubStore.markSmokingReturnedByVisitId(visit.id);
                              playAudioFeedback(true);
                              setScanMessage(`Re-entry granted for ${scannedMember.fullName} from smoking break.`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Return from Smoke</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const visit = activeVisits.find((v) => v.memberId === scannedMember.id);
                            if (visit) {
                              clubStore.markOutToSmoke({
                                visitId: visit.id,
                                name: `${scannedMember.fullName} (Member)`,
                                type: 'member',
                              });
                              setShowSmokingModal(true);
                            }
                          }}
                          disabled={stats.smokersOutside >= MAX_SMOKERS_OUTSIDE}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-mono text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          Step Out to Smoke
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWalletTargetMember(scannedMember);
                      setShowAppleWalletModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Apple Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWalletTargetMember(scannedMember);
                      setShowSendPassModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-[#780C1E] font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send Pass</span>
                  </button>
                </div>
              </div>

              {/* Toast / Status Feedback */}
              {scanMessage && (
                <div className="mt-3 p-3 rounded-xl bg-stone-900 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-[#F5CE76] shrink-0" />
                  <span>{scanMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. PRIMARY SCAN PASS HERO & QUICK MEMBER LOOKUP              */}
          {/* Streamlined, clean, without unnecessary clutter              */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl border border-[#EDE7DF] p-6 sm:p-8 shadow-sm text-center space-y-4">
            {isKioskScannerActive ? (
              <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-[#EDE7DF] bg-[#0D0A0C]">
                <UniversalCameraScanner
                  mode="inline"
                  isOpen={true}
                  onClose={() => setIsKioskScannerActive(false)}
                  onMemberScanned={(member) => triggerScanFeedbackModal(member)}
                  onAdmitDirectly={(member) => triggerScanFeedbackModal(member)}
                  currentStaff={currentStaff}
                  currentCustomerCount={stats.totalCustomers}
                  venueDate={currentDate}
                />
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#780C1E] flex items-center justify-center text-white shadow-md mx-auto">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-bold tracking-tight">
                    Door Scanner Terminal
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto font-medium">
                    Present member digital pass or camera QR code for instant licensing admission
                  </p>
                </div>

                {/* Primary Scan Pass Button */}
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="w-full max-w-md mx-auto py-4 px-6 bg-[#780C1E] hover:bg-[#8E1026] text-white font-semibold text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-white" />
                  <span>Scan Pass</span>
                </button>
              </>
            )}

            {/* Quick Member Lookup Search Bar */}
            <div className="w-full max-w-md mx-auto pt-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Or lookup member by name or #AM-..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
                />
                {memberSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMemberSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Instant Search Dropdown */}
              {memberSearchQuery.trim() && (
                <div className="mt-2 bg-white border border-[#EDE7DF] rounded-2xl shadow-xl max-h-52 overflow-y-auto text-left divide-y divide-[#F0EBE3] animate-fadeIn">
                  {filteredMembers.length === 0 ? (
                    <div className="p-3 text-xs text-stone-400 text-center font-mono">
                      No matching member found
                    </div>
                  ) : (
                    filteredMembers.slice(0, 6).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          handleSelectMember(m);
                          setMemberSearchQuery('');
                        }}
                        className="p-3 hover:bg-[#FAF8F5] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-serif font-bold text-sm text-stone-900">
                            {m.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-[#780C1E] font-medium">
                            {m.memberNumber} · {m.hospitalityRole}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Clean, Non-intrusive Quick Utility Strip */}
            <div className="pt-2 border-t border-[#F0EBE3] flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowCheckOutModal(true)}
                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#EDE7DF] text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500" />
                <span>Checkout Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddGuestModal(true)}
                disabled={nightMode.mode === 'no_new_admissions'}
                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#EDE7DF] text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#780C1E]" />
                <span>Guest Registry</span>
              </button>

              <button
                type="button"
                onClick={() => setShowProprietorGuestModal(true)}
                disabled={nightMode.mode === 'no_new_admissions'}
                className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#EDE7DF] text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Proprietor List</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSmokingModal(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Terrace ({stats.smokersOutside}/10)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowIncidentModal(true)}
                className="px-3 py-1.5 bg-[#FFF5F6] hover:bg-[#FCEBED] border border-rose-200 text-[#780C1E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Log Incident</span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. ACCESS CONTROL LEDGER (Compact Timeline Card Below)       */}
          {/* ============================================================ */}
          <div className="rounded-3xl bg-white border border-[#EDE7DF] p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#780C1E]" />
                <span className="font-serif text-sm font-bold text-stone-900">
                  Access Control Ledger
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Firestore Synced
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {clubStore.getDoorLogs().length === 0 ? (
                <div className="text-center py-4 text-xs text-stone-400">
                  No door verification events recorded yet. Click Scan Pass to begin.
                </div>
              ) : (
                clubStore.getDoorLogs().slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] flex items-center justify-between gap-3 text-xs ${
                      log.granted ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-[#780C1E]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 text-xs truncate">
                        {log.memberName}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {log.memberNumber} · {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.granted
                          ? 'bg-[#E8F5EE] text-[#2E7D52]'
                          : 'bg-[#FCEBED] text-[#780C1E]'
                      }`}
                    >
                      {log.granted ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Live Attendance Register - High Design White Card Suite */}
        <div className="pane">
          <div className="occupancy-log bg-white border border-[#EDE7DF] rounded-3xl p-4 sm:p-5 h-full flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE3]">
              <div className="font-serif text-sm font-bold text-stone-900">
                LIVE ATTENDANCE REGISTER
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#780C1E] text-white shadow-xs">
                {activeVisits.length} INSIDE
              </span>
            </div>

            <div className="my-3">
              <input
                type="text"
                value={checkoutSearchQuery}
                onChange={(e) => setCheckoutSearchQuery(e.target.value)}
                placeholder="Search admitted patrons or guests..."
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
              {filteredCheckouts.length === 0 ? (
                <div className="mt-12 text-center text-xs text-stone-400">
                  No admitted patrons currently inside
                </div>
              ) : (
                filteredCheckouts.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3.5 bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] rounded-2xl flex items-center justify-between gap-3 text-xs transition-colors shadow-xs ${
                      v.isOutToSmoke
                        ? 'border-l-4 border-l-amber-500'
                        : v.attendeeType === 'member'
                        ? 'border-l-4 border-l-emerald-500'
                        : 'border-l-4 border-l-[#780C1E]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 text-sm truncate flex items-center gap-1.5">
                        <span>{v.memberName}</span>
                        {v.isOutToSmoke ? (
                          <span className="text-[10px] px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] font-bold rounded-full">
                            SMOKER
                          </span>
                        ) : v.entryType === 'return' ? (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
                            RETURN
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-[#E8F5EE] text-[#2E7D52] font-bold rounded-full">
                            ARRIVAL
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-stone-500 mt-0.5">
                        {v.memberNumber || v.attendeeType.replace('_', ' ').toUpperCase()} ·{' '}
                        <span>
                          {new Date(v.checkInTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {v.guestNames && v.guestNames.length > 0 && (
                        <div className="text-[11px] text-stone-600 mt-1 font-medium">
                          + Guests: {v.guestNames.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.isOutToSmoke ? (
                        <button
                          onClick={() => {
                            const patron = clubStore
                              .getSmokingPatrons()
                              .find((p) => p.visitId === v.id);
                            if (patron) clubStore.markSmokingReturned(patron.id);
                          }}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Return
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            clubStore.markOutToSmoke({
                              visitId: v.id,
                              name: v.memberName,
                              type: v.attendeeType === 'proprietor_guest' ? 'proprietor_guest' : v.attendeeType === 'member_guest' ? 'guest' : 'member',
                            });
                            setShowSmokingModal(true);
                          }}
                          disabled={stats.smokersOutside >= MAX_SMOKERS_OUTSIDE}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl disabled:opacity-40 cursor-pointer"
                        >
                          Smoke
                        </button>
                      )}

                      <button
                        onClick={() => handleCheckOut(v.id)}
                        className="px-3 py-1.5 bg-[#FFF5F6] hover:bg-[#FCEBED] text-[#780C1E] text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODAL 1: UNIVERSAL CAMERA QR SCANNER */}
      <UniversalCameraScanner
        mode="modal"
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onMemberScanned={(member) => {
          handleSelectMember(member);
        }}
        onAdmitDirectly={(member) => {
          handleCheckInMember(member);
        }}
        currentStaff={currentStaff}
        currentCustomerCount={stats.totalCustomers}
        venueDate={currentDate}
      />

      {/* MODAL 2: SEARCH MEMBER */}
      {showMemberLookup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-[#EDE7DF] shadow-2xl p-5 sm:p-7 flex flex-col max-h-[88vh] text-stone-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5 text-stone-900 font-serif text-xl font-bold">
                <Search className="w-5 h-5 text-[#780C1E]" />
                <span>Search Member Directory</span>
              </div>
              <button
                onClick={() => setShowMemberLookup(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3.5">
              <input
                type="text"
                autoFocus
                placeholder="Search name, member number, employer or email..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 font-mono focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 font-mono text-sm text-stone-400">
                  No matching members found.
                </div>
              ) : (
                filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMember(m)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] hover:border-[#780C1E] cursor-pointer flex items-center justify-between gap-3 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#EDE7DF] bg-[#FAF8F5] shrink-0">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-2 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-stone-900">{m.fullName}</div>
                        <div className="text-xs font-mono font-semibold text-[#780C1E]">
                          {m.memberNumber} · {m.hospitalityRole} at {m.employer}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                        m.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : m.status === 'waiting_48_hours'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD GUEST */}
      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EDE7DF] shadow-2xl p-5 sm:p-7 text-stone-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5 text-stone-900 font-serif text-xl font-bold">
                <UserPlus className="w-5 h-5 text-[#780C1E]" />
                <span>Register Named Guest (Max 2 Per Member)</span>
              </div>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {guestErrorMessage && (
              <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#780C1E] text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{guestErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddGuestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                  Sponsoring Active Member *
                </label>
                <select
                  value={selectedSponsoringMemberId}
                  onChange={(e) => setSelectedSponsoringMemberId(e.target.value)}
                  required
                  className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 focus:outline-none focus:border-[#780C1E]"
                >
                  <option value="">Select sponsoring member...</option>
                  {allMembers
                    .filter((m) => m.status === 'active')
                    .map((m) => {
                      const guestCount = getMemberActiveGuestsCount(m.id);
                      return (
                        <option
                          key={m.id}
                          value={m.id}
                          disabled={guestCount >= MAX_GUESTS_PER_MEMBER_LATE_NIGHT}
                        >
                          {m.fullName} ({m.memberNumber}) — {guestCount}/2 Guests tonight
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Thorne"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
                />
                <span className="text-xs text-stone-500 mt-1.5 block font-medium">
                  Licensing rule: Each member guest must be registered by full legal name and linked to their sponsoring host.
                </span>
              </div>

              <div className="pt-3.5 border-t border-[#F0EBE3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs sm:text-sm font-bold font-mono shadow-xs cursor-pointer"
                >
                  Admit Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PROPRIETOR GUEST */}
      {showProprietorGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EDE7DF] shadow-2xl p-5 sm:p-7 text-stone-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5 text-stone-900 font-serif text-xl font-bold">
                <Crown className="w-5 h-5 text-amber-600" />
                <span>Proprietor Guest (Max 5 Concurrent)</span>
              </div>
              <button
                onClick={() => setShowProprietorGuestModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <strong className="text-amber-950">Manager Authorisation Required:</strong> Currently <strong>{stats.proprietorGuestsInside} / 5</strong> proprietor guests admitted.
            </div>

            {proprietorErrorMessage && (
              <div className="mb-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#780C1E] text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{proprietorErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleProprietorGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                  Proprietor Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lady Beatrice Montgomery"
                  value={proprietorGuestName}
                  onChange={(e) => setProprietorGuestName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-bold mb-1.5">
                  Affiliation / Business Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freeholder / Visiting Sommelier / Soho Society"
                  value={proprietorReason}
                  onChange={(e) => setProprietorReason(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#780C1E]"
                />
              </div>

              <div className="text-xs text-stone-600 font-mono">
                Authorising Manager: <strong className="text-stone-900">{currentStaff.name} ({currentStaff.role.toUpperCase()})</strong>
              </div>

              <div className="pt-3.5 border-t border-[#F0EBE3] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProprietorGuestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={currentStaff.role !== 'manager' && currentStaff.role !== 'admin'}
                  className="px-5 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs sm:text-sm font-bold font-mono shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Authorise Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: RAPID CHECK OUT */}
      {showCheckOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#EDE7DF] shadow-2xl p-5 sm:p-7 flex flex-col max-h-[88vh] text-stone-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2.5 text-stone-900 font-serif text-xl font-bold">
                <LogOut className="w-5 h-5 text-stone-600" />
                <span>Patron Check-Out ({activeVisits.length} Inside)</span>
              </div>
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3.5">
              <input
                type="text"
                placeholder="Search patron by name or number..."
                value={checkoutSearchQuery}
                onChange={(e) => setCheckoutSearchQuery(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-sm sm:text-base text-stone-900 placeholder-stone-400 font-mono focus:outline-none focus:border-[#780C1E]"
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredCheckouts.length === 0 ? (
                <div className="text-center py-8 font-mono text-sm text-stone-400">
                  No patrons found.
                </div>
              ) : (
                filteredCheckouts.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-sm sm:text-base font-bold text-stone-900">{v.memberName}</div>
                      <div className="text-xs text-stone-500 font-mono font-medium">
                        {v.memberNumber || v.attendeeType.replace('_', ' ')} · Checked in at {new Date(v.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(v.id)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-[#780C1E] text-xs font-mono font-bold shrink-0 cursor-pointer shadow-2xs"
                    >
                      Check Out
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#F0EBE3] flex justify-end">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-xs sm:text-sm font-semibold text-stone-700 cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMOKING MANAGER MODAL */}
      <SmokingManagerModal
        isOpen={showSmokingModal}
        onClose={() => setShowSmokingModal(false)}
        currentStaff={currentStaff}
      />

      {/* INCIDENT LOGGER MODAL */}
      <IncidentLoggerModal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        currentStaff={currentStaff}
      />

      {/* HANDHELD CAMERA SCANNER MODAL */}
      <UniversalCameraScanner
        mode="modal"
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onMemberScanned={(member) => {
          triggerScanFeedbackModal(member);
        }}
        onAdmitDirectly={(member) => {
          triggerScanFeedbackModal(member);
          setShowScannerModal(false);
        }}
        currentStaff={currentStaff}
        currentCustomerCount={stats.totalCustomers}
        venueDate={currentDate}
      />

      {/* APPLE WALLET PASS MODAL */}
      {walletTargetMember && (
        <AppleWalletPassModal
          isOpen={showAppleWalletModal}
          onClose={() => {
            setShowAppleWalletModal(false);
            setWalletTargetMember(null);
          }}
          member={walletTargetMember}
          onOpenSendModal={() => {
            setShowSendPassModal(true);
          }}
        />
      )}

      {/* SEND MEMBER PASS MODAL */}
      {walletTargetMember && (
        <SendPassModal
          isOpen={showSendPassModal}
          onClose={() => {
            setShowSendPassModal(false);
            setWalletTargetMember(null);
          }}
          member={walletTargetMember}
          onOpenAppleWalletModal={() => {
            setShowAppleWalletModal(true);
          }}
        />
      )}

      {/* BIOMETRIC ENROLLMENT MODAL */}
      {enrollTargetMember && (
        <PhotoCaptureModal
          isOpen={showEnrollModal}
          onClose={() => {
            setShowEnrollModal(false);
            setEnrollTargetMember(null);
          }}
          member={enrollTargetMember}
          onPhotoUpdated={(updatedMember) => {
            if (scannedMember?.id === updatedMember.id) {
              setScannedMember(updatedMember);
            }
          }}
        />
      )}
      {/* FULLSCREEN KIOSK MODE OVERLAY */}
      {isKioskFullScreen && (
        <div className="fixed inset-0 z-50 bg-[#070507] flex flex-col p-3 sm:p-6 overflow-hidden animate-fadeIn select-none">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#F5CE76]/30 mb-3 sm:mb-4 bg-[#0D0A0C]/90 px-4 py-2.5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#8E0E24] to-[#4A0813] border border-[#F5CE76]/60 flex items-center justify-center text-[#FFE194] shadow-md shrink-0">
                <Sparkles className="w-5 h-5 text-[#FFE194]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-script text-2xl font-bold text-[#FFE194] leading-none">Amica</span>
                  <span className="font-cinzel text-xs font-extrabold tracking-[2px] text-[#F5CE76] leading-none">LATE · SOHO</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase mt-1">
                  FULLSCREEN KIOSK MODE · HANDS-FREE EXPRESS ENTRY
                </div>
              </div>
            </div>

            {/* Occupancy Stats & Live Clock */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#171015] border border-[#F5CE76]/30">
                <div>
                  <div className="text-[9px] font-mono font-bold text-[#F5CE76] uppercase">Occupancy</div>
                  <div className="text-sm font-extrabold text-white font-mono">{stats.totalCustomers} / 80</div>
                </div>
                <div className="h-6 w-px bg-[#F5CE76]/20" />
                <div>
                  <div className="text-[9px] font-mono font-bold text-amber-300 uppercase">Terrace</div>
                  <div className="text-sm font-extrabold text-amber-200 font-mono">{stats.smokersOutside} / 10</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-lg sm:text-2xl font-bold text-white tabular-nums">
                  {currentDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
                <div className="text-[10px] font-mono text-[#F5CE76] font-bold">23 Frith Street W1D</div>
              </div>

              <button
                onClick={toggleFullScreenKiosk}
                className="px-3 py-2 rounded-xl bg-[#20131A] hover:bg-[#341B2A] border border-[#F5CE76]/50 text-[#FFE194] font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Minimize2 className="w-4 h-4 text-[#FFE194]" />
                <span className="hidden sm:inline">EXIT KIOSK</span>
              </button>
            </div>
          </div>

          {/* Central Main Viewport */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 min-h-0">
            {/* Live Camera Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#F5CE76]/50 bg-black flex flex-col shadow-2xl">
              <UniversalCameraScanner
                mode="inline"
                isOpen={isKioskFullScreen}
                onClose={() => setIsKioskFullScreen(false)}
                onMemberScanned={(member) => {
                  handleSelectMember(member);
                }}
                onAdmitDirectly={(member) => {
                  handleCheckInMember(member);
                }}
                currentStaff={currentStaff}
                currentCustomerCount={stats.totalCustomers}
                venueDate={currentDate}
              />
            </div>

            {/* Side Control & Verification Toast Banner Panel */}
            <div className="flex flex-col gap-3 min-h-0">
              {/* Verification Message Card */}
              {scanMessage && (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1E1119] to-[#120B10] border-2 border-[#F5CE76] shadow-2xl animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        BIOMETRIC ENTRY DECISION
                      </div>
                      <div className="font-serif text-lg font-bold text-white mt-0.5 leading-snug">
                        {scanMessage}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Spotlight Card */}
              {scannedMember ? (
                <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE3]">
                    <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Active Patron Card</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {isMemberCurrentlyInside(scannedMember.id) ? 'CURRENTLY INSIDE' : 'STANDBY'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={scannedMember.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={scannedMember.fullName}
                      className="w-14 h-14 rounded-2xl object-cover border border-[#EDE7DF]"
                    />
                    <div>
                      <div className="font-serif text-lg font-bold text-stone-900">{scannedMember.fullName}</div>
                      <div className="text-xs font-mono text-[#780C1E] font-bold">{scannedMember.memberNumber}</div>
                      <div className="text-[11px] text-stone-500 capitalize">{scannedMember.tier || 'Full'} Member</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F0EBE3]">
                    <button
                      onClick={() => handleCheckInMember(scannedMember)}
                      className="py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-mono text-xs font-bold uppercase cursor-pointer transition-colors shadow-xs"
                    >
                      ADMIT DIRECTLY
                    </button>
                    <button
                      onClick={() => setShowSmokingModal(true)}
                      className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-mono text-xs font-bold uppercase cursor-pointer transition-colors"
                    >
                      SMOKING BREAK
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#EDE7DF] text-center my-auto flex flex-col items-center justify-center space-y-2">
                  <QrCode className="w-8 h-8 text-[#780C1E]" />
                  <div className="font-serif text-base font-bold text-stone-900">Ready to Scan Pass</div>
                  <div className="text-xs text-stone-500 font-mono">Present QR pass code to camera scanner</div>
                </div>
              )}

              {/* Quick Actions Footer Bar */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <button
                  onClick={() => setShowMemberLookup(true)}
                  className="py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search className="w-4 h-4 text-[#780C1E]" />
                  <span>LOOKUP</span>
                </button>
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-stone-500" />
                  <span>CHECKOUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ULTRA-MINIMAL TOP VIEWPORT SCAN RESULT OVERLAY */}
      {scanFeedbackModal && scanFeedbackModal.isOpen && (
        <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 w-full max-w-md animate-fadeIn">
          <div
            className={`p-3.5 sm:p-4 rounded-2xl bg-white border shadow-2xl flex items-center justify-between gap-3 ${
              scanFeedbackModal.isGranted
                ? 'border-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-rose-300 ring-2 ring-rose-500/20'
            }`}
          >
            {/* Left: Status icon & Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  scanFeedbackModal.isGranted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {scanFeedbackModal.isGranted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0">
                <div className="font-serif text-sm sm:text-base font-bold text-stone-900 truncate">
                  {scanFeedbackModal.member.fullName}
                </div>
                <div className="text-[11px] font-mono text-stone-500">
                  BADGE: <span className="font-bold text-stone-700">{scanFeedbackModal.member.memberNumber}</span>
                </div>
              </div>
            </div>

            {/* Right: Badge Status & Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider ${
                  scanFeedbackModal.isGranted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-[#780C1E]'
                }`}
              >
                {scanFeedbackModal.isGranted ? 'GRANTED' : 'DENIED'}
              </span>

              {scanFeedbackModal.isGranted ? (
                <button
                  onClick={() => {
                    handleCheckInMember(scanFeedbackModal.member);
                    setScanFeedbackModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Admit
                </button>
              ) : (
                currentStaff.role === 'admin' && (
                  <button
                    onClick={() => {
                      handleCheckInMember(scanFeedbackModal.member);
                      setScanFeedbackModal(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Override
                  </button>
                )
              )}

              <button
                onClick={() => setScanFeedbackModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-[#FAF8F5] cursor-pointer"
                aria-label="Dismiss scan result"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
