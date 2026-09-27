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
  const [isKioskScannerActive, setIsKioskScannerActive] = useState(true);
  const [isKioskFullScreen, setIsKioskFullScreen] = useState(false);

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
    <div className="flex flex-col">
      {/* Utility Grid - Amica Late Velvet & Obsidian Specification */}
      <section className="utility-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-px bg-[#F5CE76]/20 border-b border-[#F5CE76]/25">
        <div className="util-box">
          <div className="label text-xs text-[#F5CE76] font-bold">VENUE OCCUPANCY</div>
          <div className="value flex items-baseline gap-1 text-white">
            <span className="text-2xl sm:text-3xl font-extrabold">{stats.totalCustomers}</span>
            <span className="text-base sm:text-lg text-[#F5CE76] font-semibold opacity-70">/80</span>
          </div>
          <div className="text-[11px] font-mono font-medium text-stone-300 mt-1">
            Max 80 customer license
          </div>
        </div>

        <div className="util-box">
          <div className="label text-xs text-[#F5CE76] font-bold">MEMBERS INSIDE</div>
          <div className="value text-white text-2xl sm:text-3xl font-extrabold">{stats.membersInside}</div>
          <div className="text-[11px] font-mono font-medium text-stone-300 mt-1">
            Active passholders
          </div>
        </div>

        <div className="util-box">
          <div className="label text-xs text-[#F5CE76] font-bold">MEMBER GUESTS</div>
          <div className="value text-white text-2xl sm:text-3xl font-extrabold">{stats.guestsInside}</div>
          <div className="text-[11px] font-mono font-medium text-stone-300 mt-1">
            Max 2 per member
          </div>
        </div>

        <div className="util-box">
          <div className="label text-xs text-[#F5CE76] font-bold">PROPRIETOR GUESTS</div>
          <div className="value flex items-baseline gap-1 text-white">
            <span className="text-2xl sm:text-3xl font-extrabold">{stats.proprietorGuestsInside}</span>
            <span className="text-base sm:text-lg text-[#F5CE76] font-semibold opacity-70">/5</span>
          </div>
          <div className="text-[11px] font-mono font-medium text-stone-300 mt-1">
            Christian / Jonny list
          </div>
        </div>

        <div
          onClick={() => setShowSmokingModal(true)}
          className="util-box cursor-pointer hover:bg-[#1A1216] transition-colors col-span-2 md:col-span-1 border-t sm:border-t-0 border-[#F5CE76]/30"
        >
          <div className="label flex items-center justify-between">
            <span className="text-amber-300 font-bold">TERRACE SMOKING</span>
            <span className="text-amber-300 font-bold">TERRACE</span>
          </div>
          <div className="value flex items-baseline gap-1 text-amber-300">
            <span className="text-2xl sm:text-3xl font-extrabold">{stats.smokersOutside}</span>
            <span className="text-base sm:text-lg text-amber-200 opacity-70">/10</span>
          </div>
          <div className="text-[11px] font-mono text-amber-300 font-semibold mt-1 flex items-center justify-between">
            <span>Manage Capacity</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>

      {/* Main Workspace - Compact on Mobile, High Contrast */}
      <section className="workspace p-3 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] gap-5 sm:gap-8">
        {/* Left Pane: Camera Surface & Control Grid */}
        <div className="pane space-y-4 sm:space-y-6">
          {/* Camera Surface: Modern Universal Kiosk Viewfinder */}
          <div className="rounded-2xl overflow-hidden border border-[#F5CE76]/30 bg-[#0D0A0C] flex flex-col shadow-xl">
            {isKioskScannerActive ? (
              <div className="relative w-full h-[380px] xs:h-[420px] sm:h-[460px] md:h-[480px]">
                {showScannerModal ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09080A] text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-full border border-[#F5CE76]/40 bg-[#1A1215] flex items-center justify-center text-[#FFE194]">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-mono uppercase font-bold text-[#FFE194]">
                      Camera Feed Active in Handheld Scanner
                    </div>
                    <div className="text-xs text-stone-300 max-w-xs font-medium">
                      Single-camera hardware lock prevented. Kiosk stream will resume when modal closes.
                    </div>
                  </div>
                ) : (
                  <UniversalCameraScanner
                    mode="inline"
                    isOpen={isKioskScannerActive && !showScannerModal}
                    onClose={() => setIsKioskScannerActive(false)}
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
                )}
              </div>
            ) : (
              <div className="p-5 sm:p-8 flex flex-col items-center justify-center text-center space-y-3.5 my-auto bg-gradient-to-b from-[#180E14] to-[#0D0A0C]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#780C1E] to-[#34050D] border border-[#F5CE76]/50 flex items-center justify-center text-[#FFE194] shadow-md">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="label tracking-[2px] text-[#F5CE76] text-xs font-bold">AMICA LATE · DOOR KIOSK</div>
                  <h3 className="font-serif text-xl text-white font-bold mt-0.5">
                    Universal QR Pass Scanner
                  </h3>
                  <p className="text-xs text-stone-300 max-w-sm mt-1 font-medium leading-relaxed">
                    Works on iPhone, iPad, Android, Mac/PC webcams, and USB scanners. Lens switching, flashlight, and file upload included.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 w-full sm:w-auto">
                  <button
                    onClick={() => setIsKioskScannerActive(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-[#780C1E] to-[#4A0813] hover:from-[#9B142A] hover:to-[#680A18] border border-[#F5CE76]/60 text-[#FFE194] font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Activate Live Kiosk</span>
                  </button>
                  <button
                    onClick={() => setShowScannerModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#171115] hover:bg-[#251A21] border border-[#F5CE76]/30 text-stone-200 font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-[#F5CE76]" />
                    <span>Scan Badge</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Control Grid - Amica Late High Contrast Buttons */}
          <div className="control-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            <button
              onClick={toggleFullScreenKiosk}
              className="button-var col-span-2 sm:col-span-1 bg-gradient-to-r from-[#780C1E] via-[#8E0E24] to-[#4A0813] hover:from-[#9B142A] hover:to-[#680A18] border-2 border-[#F5CE76] shadow-xl active:scale-95 cursor-pointer"
            >
              <Maximize2 className="w-5 h-5 text-[#FFE194]" />
              <span className="text-xs sm:text-sm font-extrabold text-[#FFE194] tracking-wider uppercase">FULLSCREEN KIOSK</span>
            </button>

            <button
              onClick={() => setShowScannerModal(true)}
              className="button-var primary shadow-lg cursor-pointer"
            >
              <QrCode className="w-5 h-5 text-[#FFE194]" />
              <span className="text-xs sm:text-sm font-bold text-white">Scan Badge</span>
            </button>

            <button
              onClick={() => setShowMemberLookup(true)}
              className="button-var cursor-pointer"
            >
              <Search className="w-5 h-5 text-[#F5CE76]" />
              <span className="text-xs sm:text-sm font-bold text-white">Database Search</span>
            </button>

            <button
              onClick={() => setShowAddGuestModal(true)}
              disabled={nightMode.mode === 'no_new_admissions'}
              className="button-var disabled:opacity-30 cursor-pointer"
            >
              <UserPlus className="w-5 h-5 text-[#FFE194]" />
              <span className="text-xs sm:text-sm font-bold text-white">Guest Registry</span>
            </button>

            <button
              onClick={() => setShowProprietorGuestModal(true)}
              disabled={nightMode.mode === 'no_new_admissions'}
              className="button-var disabled:opacity-30 cursor-pointer"
            >
              <Crown className="w-5 h-5 text-[#F5CE76]" />
              <span className="text-xs sm:text-sm font-bold text-white">Proprietor List</span>
            </button>

            <button
              onClick={() => setShowCheckOutModal(true)}
              className="button-var cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-stone-200" />
              <span className="text-xs sm:text-sm font-bold text-white">Checkout Mode</span>
            </button>

            <button
              onClick={() => setShowSmokingModal(true)}
              className="button-var gold cursor-pointer"
            >
              <Flame className="w-5 h-5 text-black" />
              <span className="text-xs sm:text-sm font-bold text-black">Smoking Terrace</span>
            </button>

            <button
              onClick={() => setShowIncidentModal(true)}
              className="button-var col-span-2 hover:bg-[#780C1E] border-rose-500/40 cursor-pointer"
            >
              <ShieldAlert className="w-5 h-5 text-rose-300" />
              <span className="text-xs sm:text-sm font-bold text-rose-100">Log Incident / Ejection</span>
            </button>

            <button
              onClick={() => setIsKioskScannerActive((prev) => !prev)}
              className="button-var cursor-pointer"
            >
              <Camera className="w-5 h-5 text-amber-300" />
              <span className="text-xs sm:text-sm font-bold text-white">Toggle Kiosk</span>
            </button>
          </div>

          {/* Biometric & Access Control Register */}
          <div className="rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/35 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F5CE76]/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FFE194]" />
                <span className="font-serif text-base sm:text-lg font-bold text-[#FFE194]">
                  Biometric Access Control Ledger
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                FIRESTORE SYNCED
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {clubStore.getDoorLogs().length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-stone-400">
                  No door verification events recorded yet. Activate Live Kiosk or Scan Badge to begin.
                </div>
              ) : (
                clubStore.getDoorLogs().slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-[#090507] border border-[#F5CE76]/20 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          log.granted ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {log.memberName} ({log.memberNumber})
                        </div>
                        <div className="text-[10px] text-[#F5CE76]">
                          {log.verificationMode.toUpperCase().replace(/_/g, ' ')}
                          {log.confidenceScore !== undefined && ` · ${log.confidenceScore}% Confidence`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.granted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/50'
                        }`}
                      >
                        {log.granted ? 'GRANTED' : 'REJECTED'}
                      </span>
                      <div className="text-[9px] text-stone-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

      {/* 4. SCANNED MEMBER STATUS PANEL (High Contrast & Compact) */}
      {scannedMember && (
        <div className="rounded-2xl bg-[#140E12] border-2 border-[#F5CE76]/60 shadow-2xl p-4 sm:p-7 relative overflow-hidden transition-all animate-fadeIn">
          {/* Close Panel Button */}
          <button
            onClick={() => setScannedMember(null)}
            className="absolute top-3.5 right-3.5 text-stone-300 hover:text-white p-2 rounded-xl bg-[#20141A] border border-[#F5CE76]/30 cursor-pointer"
          >
            <XCircle className="w-5 h-5 text-stone-300" />
          </button>

          {/* Biometric Face Template Badge */}
          <div className="mb-4">
            {scannedMember.faceDescriptor && scannedMember.faceDescriptor.length === 128 ? (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">128-Point Biometric Vector Enrolled</span>
                    <span className="text-[10px] text-stone-300 block">
                      GDPR Express Consent: {scannedMember.expressFacialConsent !== false ? 'OPTED-IN' : 'REVOKED'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEnrollTargetMember(scannedMember);
                    setShowEnrollModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#24171E] hover:bg-[#341F2B] border border-[#F5CE76]/40 text-[#FFE194] text-[10px] font-mono font-bold cursor-pointer"
                >
                  Update Vector
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#1C1117] border border-[#F5CE76]/30 text-[#FFE194] text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#F5CE76] shrink-0" />
                  <span>Biometric face vector not enrolled yet</span>
                </div>
                <button
                  onClick={() => {
                    setEnrollTargetMember(scannedMember);
                    setShowEnrollModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#780C1E] hover:bg-[#8E0E24] text-[#FFE194] font-bold text-xs border border-[#F5CE76]/50 cursor-pointer shadow-md"
                >
                  Enroll Biometrics
                </button>
              </div>
            )}
          </div>
          {scannedMember.status === 'active' ? (
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-[#F5CE76]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-300 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-serif text-2xl font-extrabold text-[#FFE194] tracking-wide">
                    ACTIVE MEMBER · VERIFIED
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-300 tracking-wider">
                    AMICA LATE · 23 FRITH STREET SOHO
                  </div>
                </div>
              </div>
            </div>
          ) : scannedMember.status === 'waiting_48_hours' || scannedMember.status === 'pending' ? (
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-[#F5CE76]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-950 border-2 border-amber-500 flex items-center justify-center text-amber-300 shadow-md">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-serif text-2xl font-extrabold text-amber-300 tracking-wide">
                    48-HOUR STATUTORY WAITING PERIOD
                  </div>
                  <div className="text-xs text-amber-200 font-mono font-semibold">
                    {validate48HourWaitingPeriod(scannedMember.appliedAt).reason}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-[#F5CE76]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-950 border-2 border-rose-500 flex items-center justify-center text-rose-300 shadow-md">
                  <XCircle className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-serif text-2xl font-extrabold text-rose-200 tracking-wide">
                    MEMBERSHIP NOT ACTIVE
                  </div>
                  <div className="text-xs text-rose-300 font-mono font-semibold">
                    {validateMemberStatus(scannedMember).reason}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Member Details Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
            {/* Left: Member Photo & Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[#F5CE76]/70 bg-[#1A1417] shrink-0 shadow-xl">
                {scannedMember.photoUrl ? (
                  <img
                    src={scannedMember.photoUrl}
                    alt={scannedMember.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#FFE194]">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                  {scannedMember.fullName}
                </h3>
                <div className="font-mono text-sm text-[#F5CE76] font-bold tracking-wider mt-0.5">
                  {scannedMember.memberNumber}
                </div>
                <div className="text-xs text-stone-200 mt-1 font-semibold">
                  {scannedMember.hospitalityRole} · <span className="text-stone-300">{scannedMember.employer}</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                  Applied: {new Date(scannedMember.appliedAt).toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Middle: Tonight's Attendance & Guest Allowance */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#191116] border border-[#F5CE76]/30">
              <div className="text-xs font-mono text-[#F5CE76] font-bold uppercase tracking-wider mb-1.5">
                Tonight's Guest Allocation
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                  {getMemberActiveGuestsCount(scannedMember.id)} / {MAX_GUESTS_PER_MEMBER_LATE_NIGHT}
                </span>
                <span className="text-xs font-medium text-stone-300">guests inside</span>
              </div>
              <div className="mt-2 text-xs font-mono font-semibold">
                {isMemberCurrentlyInside(scannedMember.id) ? (
                  <span className="text-emerald-400">● Currently inside venue</span>
                ) : (
                  <span className="text-stone-400">○ Not checked in tonight</span>
                )}
              </div>
            </div>

            {/* Right: Touch Actions */}
            <div className="flex flex-col gap-2">
              {scannedMember.status === 'active' ? (
                <>
                  {!isMemberCurrentlyInside(scannedMember.id) ? (
                    <button
                      onClick={() => handleCheckInMember(scannedMember)}
                      disabled={nightMode.mode === 'no_new_admissions'}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#780C1E] to-[#4A0813] hover:from-[#9B142A] hover:to-[#680A18] border border-[#F5CE76] text-[#FFE194] font-mono text-sm font-bold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {nightMode.mode === 'no_new_admissions'
                        ? 'ADMISSIONS CLOSED (01:30 CURFEW)'
                        : 'CHECK IN MEMBER'}
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs font-bold text-center font-mono">
                      ✓ MEMBER ALREADY CHECKED IN
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedSponsoringMemberId(scannedMember.id);
                      setShowAddGuestModal(true);
                    }}
                    disabled={
                      nightMode.mode === 'no_new_admissions' ||
                      getMemberActiveGuestsCount(scannedMember.id) >= MAX_GUESTS_PER_MEMBER_LATE_NIGHT
                    }
                    className="w-full py-2.5 rounded-xl bg-[#22171E] hover:bg-[#2F212A] border border-[#F5CE76]/40 text-stone-100 font-mono text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    ADD GUEST ({getMemberActiveGuestsCount(scannedMember.id)}/2)
                  </button>

                  {isMemberCurrentlyInside(scannedMember.id) && (
                    <>
                      {activeVisits.find((v) => v.memberId === scannedMember.id)?.isOutToSmoke ? (
                        <button
                          onClick={() => {
                            const visit = activeVisits.find((v) => v.memberId === scannedMember.id);
                            if (visit) {
                              clubStore.markSmokingReturnedByVisitId(visit.id);
                              playAudioFeedback(true);
                              setScanMessage(`RE-ENTRY GRANTED: Welcome back in from smoking break, ${scannedMember.fullName}!`);
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-200 font-mono text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>RETURN IN FROM SMOKING BREAK</span>
                        </button>
                      ) : (
                        <button
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
                          className="w-full py-2 rounded-xl bg-[#1C1318] hover:bg-[#281B23] border border-amber-500/40 text-amber-200 font-mono text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          STEP OUT TO SMOKE (10m Break)
                        </button>
                      )}
                    </>
                  )}

                  {/* Apple Wallet & Dispatch Pass Actions */}
                  <div className="pt-1 border-t border-[#F5CE76]/20 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWalletTargetMember(scannedMember);
                        setShowAppleWalletModal(true);
                      }}
                      className="py-2 px-2.5 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current text-white shrink-0" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
                      </svg>
                      <span>Wallet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWalletTargetMember(scannedMember);
                        setShowSendPassModal(true);
                      }}
                      className="py-2 px-2.5 rounded-xl bg-[#281620] hover:bg-[#381E2C] border border-[#F5CE76]/40 text-[#FFE194] font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Pass</span>
                    </button>
                  </div>
                </>
              ) : scannedMember.status === 'ready_for_review' ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500 text-amber-200 text-xs">
                  <div className="font-bold mb-1">48-Hour Waiting Satisfied</div>
                  <p className="text-[11px] text-amber-300 mb-2">
                    Applicant ready for manager approval.
                  </p>
                  <button
                    onClick={onNavigateToApplications}
                    className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-colors"
                  >
                    Open Approval Queue
                  </button>
                </div>
              ) : scannedMember.status === 'waiting_48_hours' || scannedMember.status === 'pending' ? (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[#191116] border border-amber-500/40 text-xs text-stone-200">
                    <div className="font-bold text-amber-300 mb-0.5 flex items-center justify-between">
                      <span>Statutory 48h Lockout</span>
                      <span className="text-[10px] font-mono text-stone-400">Section 2</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      Westminster condition requires 48 continuous hours between nomination and admission.
                    </p>
                  </div>

                  {/* ADMIN OVERRIDE OPTION */}
                  {currentStaff.role === 'admin' || currentStaff.role === 'manager' ? (
                    <div className="p-3 rounded-xl bg-[#23130E] border border-amber-500 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold uppercase text-[11px] mb-1">
                        <Shield className="w-3.5 h-3.5 text-[#FFE194]" />
                        <span>Admin Override Option</span>
                      </div>
                      <p className="text-[11px] text-amber-200 mb-2 leading-snug">
                        Confirm sign-up was completed 48h before (paper nomination / historical register).
                      </p>
                      <button
                        onClick={() => {
                          const updated = clubStore.bypass48HourWaiting(
                            scannedMember.id,
                            currentStaff,
                            'Admin verified sign-up was completed 48 hours prior (paper nomination / historical register).'
                          );
                          if (updated) {
                            setScannedMember(updated);
                            setScanMessage(`Admin Override Applied: ${updated.fullName} backdated to 48 hours prior. Membership is now ACTIVE.`);
                          }
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#780C1E] to-[#4A0813] hover:from-[#9B142A] hover:to-[#680A18] border border-[#F5CE76] text-[#FFE194] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#FFE194]" />
                        <span>Bypass · Backdate to 48h Ago</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-[#140E12] border border-white/10 text-xs text-stone-400 font-mono flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-500" />
                      <span>Admin login required to backdate sign-up time</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-200 text-xs">
                  <div className="font-bold mb-1">Admission Prohibited</div>
                  <p className="text-xs text-rose-200">
                    {scannedMember.status.toUpperCase()} status requires resolution with management.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Toast / Status Feedback */}
          {scanMessage && (
            <div className="mt-3 p-3 rounded-xl bg-[#22121A] border border-[#F5CE76]/40 text-xs font-mono font-bold text-[#FFE194] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#F5CE76] shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}
        </div>
      )}
        </div>

        {/* Right Pane: Live Attendance Register - Amica Late High Contrast */}
        <div className="pane">
          <div className="occupancy-log bg-[#120D10] border border-[#F5CE76]/30 rounded-2xl p-4 sm:p-5 h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5CE76]/20">
              <div className="label text-xs text-[#F5CE76] font-bold mb-0">LIVE ATTENDANCE REGISTER</div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#780C1E] border border-[#F5CE76]/40 text-[#FFE194]">
                {activeVisits.length} INSIDE
              </span>
            </div>

            <div className="my-3">
              <input
                type="text"
                value={checkoutSearchQuery}
                onChange={(e) => setCheckoutSearchQuery(e.target.value)}
                placeholder="Search admitted patrons or guests..."
                className="w-full px-3.5 py-2.5 bg-[#090708] border border-[#F5CE76]/30 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 font-mono focus:outline-none focus:border-[#F5CE76]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
              {filteredCheckouts.length === 0 ? (
                <div className="mt-12 text-center text-xs font-mono text-stone-400">
                  --- NO ADMITTED PATRONS FOUND ---
                </div>
              ) : (
                filteredCheckouts.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-[#1A1217] hover:bg-[#22171E] border border-[#F5CE76]/25 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                        <span>{v.memberName}</span>
                        {v.isOutToSmoke ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-950 border border-amber-500 text-amber-200 font-bold rounded">
                            SMOKER
                          </span>
                        ) : v.entryType === 'return' ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-950 border border-blue-400 text-blue-200 font-bold rounded">
                            RETURN
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-200 font-bold rounded">
                            ARRIVAL
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-[#F5CE76] mt-0.5">
                        {v.memberNumber || v.attendeeType.replace('_', ' ').toUpperCase()} ·{' '}
                        <span className="text-stone-300">
                          {new Date(v.checkInTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {v.guestNames && v.guestNames.length > 0 && (
                        <div className="text-[11px] text-stone-300 mt-1 font-medium">
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
                          className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-500 text-amber-200 text-xs font-mono font-bold rounded-lg cursor-pointer"
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
                          className="px-2.5 py-1.5 bg-[#251A20] hover:bg-[#34242D] border border-amber-500/40 text-amber-300 text-xs font-mono font-bold rounded-lg disabled:opacity-30 cursor-pointer"
                        >
                          Smoke
                        </button>
                      )}
                      <button
                        onClick={() => handleCheckOut(v.id)}
                        className="px-3 py-1.5 bg-[#780C1E] hover:bg-[#9B142A] border border-[#F5CE76]/40 text-[#FFE194] text-xs font-mono font-bold rounded-lg cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl p-4 sm:p-6 flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F5CE76]/25">
              <div className="flex items-center gap-2.5 text-[#FFE194] font-serif text-xl font-bold">
                <Search className="w-5 h-5 text-[#F5CE76]" />
                <span>Search Member Directory</span>
              </div>
              <button
                onClick={() => setShowMemberLookup(false)}
                className="text-stone-300 hover:text-white p-1.5 rounded-lg bg-[#1F1218] border border-[#F5CE76]/30 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-[#FFE194]" />
              </button>
            </div>

            <div className="my-3.5">
              <input
                type="text"
                autoFocus
                placeholder="Search name, member number, employer or email..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 font-mono focus:outline-none focus:border-[#FFE194]"
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
                    className="p-3 sm:p-3.5 rounded-xl bg-[#180E14] hover:bg-[#251520] border border-[#F5CE76]/30 hover:border-[#F5CE76]/70 cursor-pointer flex items-center justify-between gap-3 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#F5CE76]/60 bg-[#1E1117] shrink-0 shadow-md">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-full h-full p-2 text-[#FFE194]" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-white">{m.fullName}</div>
                        <div className="text-xs font-mono font-semibold text-[#FFE194]">
                          {m.memberNumber} · {m.hospitalityRole} at {m.employer}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${
                        m.status === 'active'
                          ? 'border-emerald-500/80 bg-emerald-950/60 text-emerald-300'
                          : m.status === 'waiting_48_hours'
                          ? 'border-amber-500/80 bg-amber-950/60 text-amber-300'
                          : 'border-rose-500/80 bg-rose-950/60 text-rose-300'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F5CE76]/25">
              <div className="flex items-center gap-2.5 text-[#FFE194] font-serif text-xl font-bold">
                <UserPlus className="w-5 h-5 text-[#F5CE76]" />
                <span>Register Named Guest (Max 2 Per Member)</span>
              </div>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="text-stone-300 hover:text-white p-1.5 rounded-lg bg-[#1F1218] border border-[#F5CE76]/30 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-[#FFE194]" />
              </button>
            </div>

            {guestErrorMessage && (
              <div className="mt-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{guestErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddGuestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#FFE194] font-bold mb-1.5">
                  Sponsoring Active Member *
                </label>
                <select
                  value={selectedSponsoringMemberId}
                  onChange={(e) => setSelectedSponsoringMemberId(e.target.value)}
                  required
                  className="w-full px-3.5 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white focus:outline-none focus:border-[#FFE194]"
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
                          className="bg-[#120A0E] text-white"
                        >
                          {m.fullName} ({m.memberNumber}) — {guestCount}/2 Guests tonight
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#FFE194] font-bold mb-1.5">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Thorne"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
                />
                <span className="text-xs text-stone-300 mt-1.5 block font-medium">
                  Licensing rule: Each member guest must be registered by full legal name and linked to their sponsoring host.
                </span>
              </div>

              <div className="pt-3.5 border-t border-[#F5CE76]/20 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#20131A] border border-[#F5CE76]/30 text-xs sm:text-sm font-bold text-stone-200 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white text-xs sm:text-sm font-bold font-mono shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F5CE76]/25">
              <div className="flex items-center gap-2.5 text-[#FFE194] font-serif text-xl font-bold">
                <Crown className="w-5 h-5 text-[#F5CE76]" />
                <span>Proprietor Guest (Max 5 Concurrent)</span>
              </div>
              <button
                onClick={() => setShowProprietorGuestModal(false)}
                className="text-stone-300 hover:text-white p-1.5 rounded-lg bg-[#1F1218] border border-[#F5CE76]/30 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-[#FFE194]" />
              </button>
            </div>

            <div className="my-3.5 p-3 rounded-xl bg-[#23150D] border border-amber-500/50 text-amber-200 text-xs sm:text-sm">
              <strong className="text-amber-300">Manager Authorisation Required:</strong> Currently <strong>{stats.proprietorGuestsInside} / 5</strong> proprietor guests admitted.
            </div>

            {proprietorErrorMessage && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{proprietorErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleProprietorGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#FFE194] font-bold mb-1.5">
                  Proprietor Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lady Beatrice Montgomery"
                  value={proprietorGuestName}
                  onChange={(e) => setProprietorGuestName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#FFE194] font-bold mb-1.5">
                  Affiliation / Business Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Freeholder / Visiting Sommelier / Soho Society"
                  value={proprietorReason}
                  onChange={(e) => setProprietorReason(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
                />
              </div>

              <div className="text-xs text-stone-200 font-mono">
                Authorising Manager: <strong className="text-[#FFE194]">{currentStaff.name} ({currentStaff.role.toUpperCase()})</strong>
              </div>

              <div className="pt-3.5 border-t border-[#F5CE76]/20 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProprietorGuestModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#20131A] border border-[#F5CE76]/30 text-xs sm:text-sm font-bold text-stone-200 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={currentStaff.role !== 'manager' && currentStaff.role !== 'admin'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white text-xs sm:text-sm font-bold font-mono shadow-lg disabled:opacity-40 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl p-4 sm:p-6 flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F5CE76]/25">
              <div className="flex items-center gap-2.5 text-[#FFE194] font-serif text-xl font-bold">
                <LogOut className="w-5 h-5 text-[#F5CE76]" />
                <span>Patron Check-Out ({activeVisits.length} Inside)</span>
              </div>
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="text-stone-300 hover:text-white p-1.5 rounded-lg bg-[#1F1218] border border-[#F5CE76]/30 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-[#FFE194]" />
              </button>
            </div>

            <div className="my-3.5">
              <input
                type="text"
                placeholder="Search patron by name or number..."
                value={checkoutSearchQuery}
                onChange={(e) => setCheckoutSearchQuery(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 font-mono focus:outline-none focus:border-[#FFE194]"
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
                    className="p-3 rounded-xl bg-[#180E14] hover:bg-[#251520] border border-[#F5CE76]/25 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="text-sm sm:text-base font-bold text-white">{v.memberName}</div>
                      <div className="text-xs text-[#FFE194] font-mono font-medium">
                        {v.memberNumber || v.attendeeType.replace('_', ' ')} · Checked in at {new Date(v.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckOut(v.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#8E0E24] hover:bg-[#B51330] border border-[#F5CE76]/50 text-white text-xs sm:text-sm font-mono font-bold shrink-0 cursor-pointer shadow-md"
                    >
                      Check Out
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#F5CE76]/20 flex justify-end">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#20131A] border border-[#F5CE76]/40 text-xs sm:text-sm font-bold text-white hover:bg-[#2C1A24] cursor-pointer"
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
          handleSelectMember(member);
        }}
        onAdmitDirectly={(member) => {
          handleCheckInMember(member);
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

              {/* Scanned Member Spotlight Card */}
              {scannedMember ? (
                <div className="p-4 rounded-2xl bg-[#140D12] border border-[#F5CE76]/35 shadow-xl space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F5CE76]/20">
                    <span className="text-[10px] font-mono font-bold text-[#F5CE76] uppercase tracking-wider">Active Patron Card</span>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                      {isMemberCurrentlyInside(scannedMember.id) ? 'CURRENTLY INSIDE' : 'STANDBY'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={scannedMember.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={scannedMember.fullName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#F5CE76]"
                    />
                    <div>
                      <div className="font-serif text-xl font-bold text-white">{scannedMember.fullName}</div>
                      <div className="text-xs font-mono text-[#FFE194] font-bold">{scannedMember.memberNumber}</div>
                      <div className="text-[11px] text-stone-300 capitalize">{scannedMember.tier || 'Full'} Member</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F5CE76]/20">
                    <button
                      onClick={() => handleCheckInMember(scannedMember)}
                      className="py-2.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white font-mono text-xs font-bold uppercase cursor-pointer"
                    >
                      ADMIT DIRECTLY
                    </button>
                    <button
                      onClick={() => setShowSmokingModal(true)}
                      className="py-2.5 rounded-xl bg-[#1C1218] hover:bg-[#281A23] border border-amber-500/50 text-amber-200 font-mono text-xs font-bold uppercase cursor-pointer"
                    >
                      SMOKING BREAK
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#140D12]/80 border border-[#F5CE76]/20 text-center my-auto flex flex-col items-center justify-center space-y-2">
                  <Scan className="w-8 h-8 text-[#F5CE76] animate-pulse" />
                  <div className="font-serif text-base font-bold text-white">Ready for Next Patron</div>
                  <div className="text-xs text-stone-300 font-mono">Position face in center frame for hands-free entry</div>
                </div>
              )}

              {/* Quick Actions Footer Bar */}
              <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                <button
                  onClick={() => setShowMemberLookup(true)}
                  className="py-2.5 rounded-xl bg-[#180E14] hover:bg-[#251621] border border-[#F5CE76]/30 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[#F5CE76]" />
                  <span>LOOKUP</span>
                </button>
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="py-2.5 rounded-xl bg-[#180E14] hover:bg-[#251621] border border-[#F5CE76]/30 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-300" />
                  <span>CHECKOUT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
