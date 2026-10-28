/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StaffUser } from './types';
import { clubStore, subscribeToStore, getVenueCurrentDate } from './services/storage';
import { getNightModeState } from './services/ruleEngine';
import { DoorReceptionView } from './components/door/DoorReceptionView';
import { MembershipApplicationFlow } from './components/application/MembershipApplicationFlow';
import { AmicaLuxuryRegistrationCard } from './components/application/AmicaLuxuryRegistrationCard';
import { DigitalMemberCard } from './components/cards/DigitalMemberCard';
import { AttendanceRegisterView } from './components/register/AttendanceRegisterView';
import { IncidentLogView } from './components/incidents/IncidentLogView';
import { ManagementDashboard } from './components/management/ManagementDashboard';
import { TestRunnerModal } from './components/compliance/TestRunnerModal';
import { VenueTimeController } from './components/common/VenueTimeController';
import { StandalonePassView } from './components/cards/StandalonePassView';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { getPublicRegistrationUrl, getMemberPassUrl } from './services/appleWallet';
import { adminAuth, subscribeAdminAuth } from './services/adminAuth';
import { AdminPasswordModal } from './components/auth/AdminPasswordModal';
import {
  Menu,
  X,
  QrCode,
  CreditCard,
  BookOpen,
  BarChart3,
  ShieldAlert,
  UserPlus,
  ChevronDown,
  ShieldCheck,
  Eye,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
} from 'lucide-react';

export type AppView =
  | 'door'
  | 'cards'
  | 'ledger'
  | 'management'
  | 'incidents'
  | 'applications'
  | 'public_register'
  | 'pass';

interface RouteInfo {
  view: AppView;
  passMemberNumber?: string;
}

const ROUTE_CONFIG: Record<
  string,
  { path: string; title: string; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }
> = {
  door: { path: '/door', title: 'Door Control · Amica Soho', label: 'Door Control', shortLabel: 'Door', icon: QrCode },
  cards: { path: '/cards', title: 'Member Passes · Amica Soho', label: 'Member Passes', shortLabel: 'Passes', icon: CreditCard },
  ledger: { path: '/ledger', title: 'Guest Ledger · Amica Soho', label: 'Guest Ledger', shortLabel: 'Ledger', icon: BookOpen },
  management: { path: '/occupancy', title: 'Occupancy & Queue · Amica Soho', label: 'Occupancy & Queue', shortLabel: 'Occupancy', icon: BarChart3 },
  incidents: { path: '/incidents', title: 'Incident Log · Amica Soho', label: 'Incident Log', shortLabel: 'Incidents', icon: ShieldAlert },
  applications: { path: '/admin', title: 'Admissions Admin · Amica Soho', label: 'Admissions & Admin', shortLabel: 'Admin', icon: UserPlus },
};

function resolveCurrentRoute(): RouteInfo {
  if (typeof window === 'undefined') {
    return { view: 'door' };
  }

  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Standalone Pass URL (via /pass, /pass/AM-1001, ?pass=..., or ?member=...)
  const passQueryParam =
    searchParams.get('pass') ||
    (searchParams.get('tab') === 'pass' ? searchParams.get('member') : null) ||
    searchParams.get('member');

  if (pathname.startsWith('/pass')) {
    const pathParts = pathname.split('/').filter(Boolean);
    const memberFromPath = pathParts.length > 1 ? decodeURIComponent(pathParts[1]) : null;
    const resolvedPass = passQueryParam || memberFromPath;
    if (resolvedPass) {
      return { view: 'pass', passMemberNumber: resolvedPass };
    }
    const saved = localStorage.getItem('amica_saved_member_pass');
    if (saved) {
      return { view: 'pass', passMemberNumber: saved };
    }
  }

  if (passQueryParam && (searchParams.has('pass') || searchParams.get('tab') === 'pass')) {
    return { view: 'pass', passMemberNumber: passQueryParam };
  }

  // 2. Saved Member Pass on mobile screen - ONLY when running in installed PWA standalone mode
  const savedPass = localStorage.getItem('amica_saved_member_pass');
  const isPwaStandalone =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(display-mode: standalone)').matches;

  if (savedPass && isPwaStandalone && pathname === '/') {
    return { view: 'pass', passMemberNumber: savedPass };
  }

  // 3. Public-Facing Member Registration URL (/register, /apply, /join)
  if (
    pathname === '/register' ||
    pathname === '/apply' ||
    pathname === '/join' ||
    searchParams.get('page') === 'register' ||
    searchParams.get('page') === 'apply' ||
    searchParams.get('tab') === 'register_public'
  ) {
    return { view: 'public_register' };
  }

  // 4. Staff Tab Navigation URLs
  if (pathname === '/cards' || pathname === '/passes' || searchParams.get('tab') === 'cards') {
    return { view: 'cards' };
  }
  if (pathname === '/ledger' || pathname === '/register' || pathname === '/register-guests' || searchParams.get('tab') === 'ledger' || searchParams.get('tab') === 'register') {
    // If exact /register and no query params, we prioritize public_register
    if (pathname === '/register' && !searchParams.has('staff')) {
      return { view: 'public_register' };
    }
    return { view: 'ledger' };
  }
  if (pathname === '/occupancy' || pathname === '/management' || searchParams.get('tab') === 'management') {
    return { view: 'management' };
  }
  if (pathname === '/incidents' || searchParams.get('tab') === 'incidents') {
    return { view: 'incidents' };
  }
  if (pathname === '/admin' || pathname === '/applications' || searchParams.get('tab') === 'applications' || searchParams.get('tab') === 'admin') {
    return { view: 'applications' };
  }

  return { view: 'door' };
}

export default function App() {
  const [route, setRoute] = useState<RouteInfo>(resolveCurrentRoute);
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(clubStore.getCurrentStaff());
  const [currentDate, setCurrentDate] = useState<Date>(getVenueCurrentDate());
  const [showTestRunner, setShowTestRunner] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showStaffSelector, setShowStaffSelector] = useState<boolean>(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState<boolean>(false);

  // Admin Password Protection State
  const [isAdminAuth, setIsAdminAuth] = useState<boolean>(adminAuth.isAuthenticated());
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  const staffList = clubStore.getStaffList();
  const nightMode = getNightModeState(currentDate);

  // Subscribe to Admin Auth changes
  useEffect(() => {
    const unsub = subscribeAdminAuth(() => {
      setIsAdminAuth(adminAuth.isAuthenticated());
    });
    return unsub;
  }, []);

  // Sync route and document title with browser history
  const executeNavigate = useCallback((targetView: AppView, passNumber?: string) => {
    let nextUrl = '/';
    let nextTitle = 'AMICA SOHO · 23 Frith Street';

    if (targetView === 'pass') {
      const pNum = passNumber || route.passMemberNumber || localStorage.getItem('amica_saved_member_pass') || 'AM-1001';
      nextUrl = `/pass?member=${encodeURIComponent(pNum)}`;
      nextTitle = 'Digital Member Pass · Amica Soho';
      setRoute({ view: 'pass', passMemberNumber: pNum });
    } else if (targetView === 'public_register') {
      nextUrl = '/register';
      nextTitle = 'Member Registration · Amica Soho';
      setRoute({ view: 'public_register' });
    } else {
      const cfg = ROUTE_CONFIG[targetView];
      if (cfg) {
        nextUrl = cfg.path;
        nextTitle = cfg.title;
      }
      setRoute({ view: targetView });
    }

    try {
      window.history.pushState({}, '', nextUrl);
      document.title = nextTitle;
    } catch {
      // Fallback
    }
    setMobileMenuOpen(false);
  }, [route.passMemberNumber]);

  // Protected navigation requiring admin password
  const navigate = useCallback((targetView: AppView, passNumber?: string) => {
    if ((targetView === 'applications' || targetView === 'management') && !adminAuth.isAuthenticated()) {
      setPendingAdminAction(() => () => executeNavigate(targetView, passNumber));
      setShowAdminPasswordModal(true);
      return;
    }
    executeNavigate(targetView, passNumber);
  }, [executeNavigate]);

  // Listen to browser popstate (back / forward buttons) and store updates
  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setCurrentStaff(clubStore.getCurrentStaff());
      setCurrentDate(getVenueCurrentDate());
    });

    const timer = setInterval(() => {
      setCurrentDate(getVenueCurrentDate());
    }, 1000);

    const handlePopState = () => {
      const newRoute = resolveCurrentRoute();
      setRoute(newRoute);
      if (newRoute.view === 'pass') {
        document.title = 'Digital Member Pass · Amica Soho';
      } else if (newRoute.view === 'public_register') {
        document.title = 'Member Registration · Amica Soho';
      } else if (ROUTE_CONFIG[newRoute.view]) {
        document.title = ROUTE_CONFIG[newRoute.view].title;
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      unsub();
      clearInterval(timer);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleCopyPublicLink = () => {
    const url = getPublicRegistrationUrl();
    navigator.clipboard.writeText(url);
    setCopiedPublicLink(true);
    setTimeout(() => setCopiedPublicLink(false), 3000);
  };

  // =========================================================================
  // VIEW 1: STANDALONE DIGITAL MEMBER PASS
  // Dedicated member-facing app screen: only shows the pass, zero admin access
  // =========================================================================
  if (route.view === 'pass' && route.passMemberNumber) {
    return (
      <StandalonePassView
        memberNumber={route.passMemberNumber}
      />
    );
  }

  // =========================================================================
  // VIEW 2: PUBLIC MEMBER REGISTRATION PORTAL (/register or /apply)
  // Dedicated candidate-facing registration screen: shareable to public/website
  // =========================================================================
  if (route.view === 'public_register') {
    return (
      <div className="min-h-screen bg-[#070406] text-[#FAF7F2] font-sans antialiased flex flex-col justify-center items-center py-6 px-3 sm:px-6">
        <AmicaLuxuryRegistrationCard
          isPublicPortal={true}
          onOpenPass={(memberNum) => navigate('pass', memberNum)}
          onExitToStaffPortal={() => navigate('door')}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: STAFF & RECEPTION ADMIN PORTAL (/door, /cards, /ledger, etc.)
  // Full operational dashboard with top header, tabs, and licensing controls
  // =========================================================================
  const handleSwitchStaff = (staffId: string) => {
    const targetStaff = staffList.find((s) => s.id === staffId);
    if (targetStaff && (targetStaff.role === 'admin' || targetStaff.role === 'manager')) {
      if (!adminAuth.isAuthenticated()) {
        setPendingAdminAction(() => () => {
          clubStore.setCurrentStaff(staffId);
          setShowStaffSelector(false);
        });
        setShowAdminPasswordModal(true);
        setShowStaffSelector(false);
        return;
      }
    }
    clubStore.setCurrentStaff(staffId);
    setShowStaffSelector(false);
  };

  const handleLockAdmin = () => {
    adminAuth.logout();
    if (route.view === 'applications' || route.view === 'management') {
      executeNavigate('door');
    }
  };

  const navItems = [
    ROUTE_CONFIG.door,
    ROUTE_CONFIG.cards,
    ROUTE_CONFIG.ledger,
    ROUTE_CONFIG.management,
    ROUTE_CONFIG.incidents,
    ROUTE_CONFIG.applications,
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans antialiased flex flex-col">
      {/* 1. Top Header Bar - Deep Luxury Noir with Gold Serif Logo */}
      <header className="sticky top-0 z-40 bg-[#0F0A0D] border-b border-[#2A1620] shadow-md px-3 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Left: Mobile Menu Trigger & Club Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#FFE194] hover:text-white rounded-xl bg-[#1C1217] border border-[#3A1E2B] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C1217] border border-[#3A1E2B] text-xs font-mono text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[#FFE194] font-bold">23 FRITH ST</span>
            <span className="text-stone-500">·</span>
            <span>SOHO W1</span>
          </div>

          {/* Quick Copy Public Registration URL Button */}
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1217] hover:bg-[#2A1A22] border border-[#3A1E2B] text-xs font-mono text-[#FFE194] transition-all cursor-pointer shadow-2xs"
            title="Copy Public Registration URL to share on website or messages"
          >
            {copiedPublicLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPublicLink ? 'Copied Public URL!' : 'Public Reg Link (/register)'}</span>
          </button>
        </div>

        {/* Center: Gold Serif Brand Logo */}
        <div
          className="flex flex-col items-center cursor-pointer select-none"
          onClick={() => navigate('door')}
        >
          <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.22em] text-[#E5C378] drop-shadow-sm leading-tight">
            AMICA SOHO
          </span>
          <span className="text-[9px] font-mono tracking-widest text-[#F5CE76]/70 uppercase">
            23 FRITH STREET · PRIVATE SUITE
          </span>
        </div>

        {/* Right: Staff Switcher & Venue Clock */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Venue Clock */}
          <div className="hidden lg:flex flex-col items-end text-right pr-2">
            <span className="font-mono text-xs font-bold text-white tabular-nums">
              {currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[9px] font-mono font-bold text-[#F5CE76] uppercase">
              {nightMode.mode === 'no_new_admissions'
                ? 'Curfew Active'
                : nightMode.mode === 'members_mode'
                ? 'Post-1am Mode'
                : 'Normal Hours'}
            </span>
          </div>

          {/* Admin Lock / Unlock Status Button */}
          {isAdminAuth ? (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-mono transition-all cursor-pointer shadow-xs"
              title="Admin Mode Active (Password Authenticated). Click to Lock."
            >
              <Unlock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="hidden sm:inline font-bold">Admin Active</span>
              <span className="text-[10px] text-amber-200/80 hover:text-white underline ml-1">Lock</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPendingAdminAction(null);
                setShowAdminPasswordModal(true);
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-[#1C1217] hover:bg-[#2A1A22] border border-[#3A1E2B] hover:border-[#F5CE76]/50 text-stone-300 hover:text-[#F5CE76] text-xs font-mono transition-all cursor-pointer shadow-xs"
              title="Admin Controls Protected. Click to enter admin password."
            >
              <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="hidden sm:inline">Admin Mode</span>
            </button>
          )}

          {/* Active Staff Selector Badge */}
          <div className="relative">
            <button
              onClick={() => setShowStaffSelector(!showStaffSelector)}
              className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-[#1C1217] border border-[#3A1E2B] text-xs text-stone-200 hover:border-[#F5CE76]/40 cursor-pointer shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="hidden sm:inline font-mono font-medium truncate max-w-[100px]">
                {currentStaff.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {showStaffSelector && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#181015] border border-[#F5CE76]/30 shadow-2xl p-2 z-50 text-xs font-mono text-stone-200 animate-fadeIn">
                <div className="px-2 py-1 text-[10px] font-bold text-[#F5CE76] uppercase tracking-wider border-b border-stone-800 mb-1 flex items-center justify-between">
                  <span>Active On-Duty Staff</span>
                  {isAdminAuth && <span className="text-[9px] text-amber-400">ADMIN UNLOCKED</span>}
                </div>
                {staffList.map((st) => {
                  const requiresAdmin = st.role === 'admin' || st.role === 'manager';
                  const isLocked = requiresAdmin && !isAdminAuth;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleSwitchStaff(st.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between hover:bg-[#2A1A22] transition-colors ${
                        st.id === currentStaff.id ? 'bg-[#780C1E] text-white font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{st.name}</span>
                        {isLocked && <Lock className="w-3 h-3 text-amber-400/80 shrink-0" />}
                      </div>
                      <span className="text-[10px] uppercase opacity-75">{st.role}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[#2A1620]">
            <VenueTimeController onOpenTestRunner={() => setShowTestRunner(true)} />
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* 2. Top Navigation Tabs (Desktop & Tablet) - Clean Porcelain & Burgundy Bar */}
      <nav className="hidden md:flex items-center justify-center bg-white border-b border-[#EDE7DF] px-4 py-2 sticky top-[57px] z-30 shadow-xs">
        <div className="flex items-center gap-1.5 max-w-5xl w-full justify-between">
          <div className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const targetKey = Object.keys(ROUTE_CONFIG).find((k) => ROUTE_CONFIG[k].path === item.path) as AppView;
              const isActive = route.view === targetKey;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(targetKey)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#780C1E] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Public Portal Link in Nav Bar */}
          <button
            type="button"
            onClick={() => navigate('public_register')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-mono font-bold cursor-pointer transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
            <span>Public Registration View</span>
          </button>
        </div>
      </nav>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-fadeIn">
          <div className="w-4/5 max-w-xs bg-white h-full p-4 flex flex-col shadow-2xl border-r border-[#EDE7DF]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DF]">
              <span className="font-cinzel text-base font-bold text-[#780C1E]">AMICA SOHO</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const targetKey = Object.keys(ROUTE_CONFIG).find((k) => ROUTE_CONFIG[k].path === item.path) as AppView;
                const isActive = route.view === targetKey;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(targetKey)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#780C1E] text-white font-bold shadow-xs'
                        : 'text-stone-700 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#EDE7DF]">
                <button
                  type="button"
                  onClick={() => navigate('public_register')}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-amber-700" />
                  <span>Public Registration (/register)</span>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#EDE7DF] space-y-2">
              <button
                onClick={() => {
                  setShowTestRunner(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 text-xs font-semibold hover:bg-stone-100 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#780C1E]" />
                <span>Westminster Licensing Tests</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#FAF8F5]">
        <div className="flex-1 max-w-7xl mx-auto w-full">
          {route.view === 'door' && (
            <DoorReceptionView
              currentStaff={currentStaff}
              onOpenTestRunner={() => setShowTestRunner(true)}
              onNavigateToApplications={() => navigate('applications')}
            />
          )}

          {route.view === 'cards' && (
            <div className="p-3.5 sm:p-6 lg:p-8 max-w-4xl mx-auto">
              <DigitalMemberCard
                onPreviewStandalonePass={(memberNum) => navigate('pass', memberNum)}
              />
            </div>
          )}

          {route.view === 'ledger' && (
            <div className="p-3.5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <AttendanceRegisterView />
            </div>
          )}

          {route.view === 'management' && (
            <div className="p-3.5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              {!isAdminAuth ? (
                <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-[28px] bg-[#140508] border-[1.5px] border-[#D8AA4E] text-center shadow-2xl animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-[#E5C378]/15 border border-[#E5C378]/40 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-[#E5C378]" />
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-3xl text-white font-normal mb-2">
                    Admin Password Required
                  </h2>
                  <p className="text-xs text-stone-300 leading-relaxed max-w-sm mx-auto mb-6 font-sans">
                    Occupancy analytics, queue supervision, and management logs are password protected for Amica Soho management.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAdminAction(() => () => executeNavigate('management'));
                      setShowAdminPasswordModal(true);
                    }}
                    className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-wider text-[#1A1005] shadow-[0_4px_24px_rgba(222,174,78,0.35)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
                    style={{ background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)' }}
                  >
                    Enter Admin Password
                  </button>
                </div>
              ) : (
                <ManagementDashboard currentStaff={currentStaff} />
              )}
            </div>
          )}

          {route.view === 'incidents' && (
            <div className="p-3.5 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <IncidentLogView currentStaff={currentStaff} />
            </div>
          )}

          {route.view === 'applications' && (
            <div className="p-3.5 sm:p-6 lg:p-8 max-w-4xl mx-auto">
              {!isAdminAuth ? (
                <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-[28px] bg-[#140508] border-[1.5px] border-[#D8AA4E] text-center shadow-2xl animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-[#E5C378]/15 border border-[#E5C378]/40 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-[#E5C378]" />
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-3xl text-white font-normal mb-2">
                    Admin Password Required
                  </h2>
                  <p className="text-xs text-stone-300 leading-relaxed max-w-sm mx-auto mb-6 font-sans">
                    Access to candidate nominations, approval queue, and membership administration requires the Amica Soho admin password.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAdminAction(() => () => executeNavigate('applications'));
                      setShowAdminPasswordModal(true);
                    }}
                    className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-wider text-[#1A1005] shadow-[0_4px_24px_rgba(222,174,78,0.35)] hover:brightness-105 active:scale-98 transition-all cursor-pointer"
                    style={{ background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)' }}
                  >
                    Enter Admin Password
                  </button>
                </div>
              ) : (
                <MembershipApplicationFlow
                  isPublicPortal={false}
                  onOpenPass={(memberNum) => navigate('pass', memberNum)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* 5. Mobile Ergonomic Bottom Tab Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDE7DF] px-1 py-1.5 flex items-center justify-around shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const targetKey = Object.keys(ROUTE_CONFIG).find((k) => ROUTE_CONFIG[k].path === item.path) as AppView;
          const isActive = route.view === targetKey;
          return (
            <button
              key={item.path}
              onClick={() => navigate(targetKey)}
              className={`flex flex-col items-center justify-center py-1 px-1 min-w-[50px] transition-all cursor-pointer relative ${
                isActive ? 'text-[#780C1E]' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2] scale-110' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#780C1E]" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'font-bold text-[#780C1E]' : 'font-medium'
                }`}
              >
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Automated Boundary Tests Modal */}
      <TestRunnerModal
        isOpen={showTestRunner}
        onClose={() => setShowTestRunner(false)}
      />

      {/* Admin Password Authentication & Management Modal */}
      <AdminPasswordModal
        isOpen={showAdminPasswordModal}
        onClose={() => {
          setShowAdminPasswordModal(false);
          setPendingAdminAction(null);
        }}
        onSuccess={() => {
          setIsAdminAuth(true);
          if (pendingAdminAction) {
            pendingAdminAction();
            setPendingAdminAction(null);
          }
        }}
      />
    </div>
  );
}
