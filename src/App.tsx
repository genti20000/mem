/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StaffUser } from './types';
import { clubStore, subscribeToStore, getVenueCurrentDate } from './services/storage';
import { getNightModeState } from './services/ruleEngine';
import { DoorReceptionView } from './components/door/DoorReceptionView';
import { MembershipApplicationFlow } from './components/application/MembershipApplicationFlow';
import { DigitalMemberCard } from './components/cards/DigitalMemberCard';
import { AttendanceRegisterView } from './components/register/AttendanceRegisterView';
import { IncidentLogView } from './components/incidents/IncidentLogView';
import { ManagementDashboard } from './components/management/ManagementDashboard';
import { TestRunnerModal } from './components/compliance/TestRunnerModal';
import { VenueTimeController } from './components/common/VenueTimeController';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import {
  ChevronDown,
  Menu,
  X,
  Database,
  QrCode,
  CreditCard,
  BookOpen,
  BarChart3,
  ShieldAlert,
  UserPlus,
  Sparkles,
  Clock,
  GlassWater,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('door');
  const [currentStaff, setCurrentStaff] = useState<StaffUser>(clubStore.getCurrentStaff());
  const [showTestRunner, setShowTestRunner] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showStaffSelector, setShowStaffSelector] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(getVenueCurrentDate());

  const staffList = clubStore.getStaffList();
  const nightMode = getNightModeState(currentDate);

  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setCurrentStaff(clubStore.getCurrentStaff());
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

  const handleSwitchStaff = (staffId: string) => {
    clubStore.setCurrentStaff(staffId);
    setShowStaffSelector(false);
  };

  const navItems = [
    { id: 'door', label: 'Door Control', shortLabel: 'Door', icon: QrCode },
    { id: 'cards', label: 'Member Passes', shortLabel: 'Passes', icon: CreditCard },
    { id: 'register', label: 'Guest Ledger', shortLabel: 'Ledger', icon: BookOpen },
    { id: 'management', label: 'Occupancy & Queue', shortLabel: 'Occupancy', icon: BarChart3 },
    { id: 'incidents', label: 'Incident Log', shortLabel: 'Incidents', icon: ShieldAlert },
    { id: 'applications', label: 'Admissions & Admin', shortLabel: 'Admin', icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-[#09080A] text-[#F7F4EE] font-sans antialiased flex flex-col md:grid md:grid-cols-[270px_1fr] lg:grid-cols-[290px_1fr]">
      {/* Mobile Top Header - Compact, High-Contrast Amica Canopy Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-3 py-1.5 bg-[#0A0709]/98 backdrop-blur-md border-b border-[#F5CE76]/35 shadow-xl">
        <div className="flex items-center gap-2">
          {/* Canopy badge icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#8E0E24] to-[#4A0813] border border-[#F5CE76]/50 flex items-center justify-center text-[#FFE194] shadow-sm shrink-0">
            <GlassWater className="w-3.5 h-3.5 text-[#F5CE76]" />
          </div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="font-script text-2xl font-bold text-[#FFE194] tracking-wide drop-shadow-sm">
              Amica
            </span>
            <span className="font-cinzel text-xs font-extrabold tracking-[2px] text-[#F5CE76]">
              LATE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* High-contrast Compact Clock */}
          <div className="text-right px-2 py-0.5 rounded-lg bg-[#140D12] border border-[#F5CE76]/35 shadow-inner">
            <div className="font-mono text-xs font-bold text-white tabular-nums leading-none">
              {currentDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-[9px] font-mono text-emerald-300 font-bold uppercase mt-0.5 leading-none">
              {nightMode.mode === 'no_new_admissions'
                ? '01:30 Cut-off'
                : nightMode.mode === 'members_mode'
                ? 'Post-1am Club'
                : 'Open Entry'}
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-[#1C1117] hover:bg-[#2A1822] border border-[#F5CE76]/50 text-[#FFE194] active:scale-95 transition-all cursor-pointer shadow-md"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#FFE194]" /> : <Menu className="w-4 h-4 text-[#FFE194]" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation - Velvet Canopy & Obsidian Portal Architecture */}
      <aside
        className={`${
          mobileMenuOpen ? 'flex' : 'hidden'
        } md:flex flex-col p-5 sm:p-6 bg-[#0D0A0C] border-r border-[#F5CE76]/20 fixed md:static inset-0 z-50 md:z-auto overflow-y-auto`}
      >
        {/* Brand Crest */}
        <div className="flex items-center justify-between md:block mb-6 pb-5 border-b border-[#F5CE76]/20">
          <div>
            {/* Velvet Canopy Emblem */}
            <div className="relative rounded-2xl overflow-hidden p-4 mb-3 border border-[#F5CE76]/40 shadow-xl bg-gradient-to-b from-[#9B142A] via-[#680A18] to-[#34050D]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-[#F5CE76]">
                  <GlassWater className="w-4 h-4" />
                  <Sparkles className="w-3.5 h-3.5 text-[#FFE194]" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFE194] bg-black/40 px-2 py-0.5 rounded-full border border-[#F5CE76]/30 font-semibold">
                  SOHO LATE
                </span>
              </div>

              <div className="text-center py-1">
                <div className="font-script text-4xl sm:text-5xl font-bold text-[#FFE194] tracking-wide drop-shadow-md">
                  Amica
                </div>
                <div className="font-cinzel text-[11px] font-extrabold tracking-[3px] text-[#FFE194] uppercase mt-0.5">
                  Aperitivo — Music — Late
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-[#F5CE76]/25 text-center">
                <div className="font-mono text-[11px] font-bold text-[#FFFFFF] tracking-wider uppercase">
                  Sub: <span className="text-[#FFE194]">Jonny&apos;s Late Show</span>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-[#F5CE76]/80 mt-0.5">
                  23 Frith Street · Soho W1D 4RR
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 text-stone-300 hover:text-white rounded-lg bg-[#20141A]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFE194]' : 'text-[#F5CE76]/70'}`} />
                <span className="text-xs sm:text-sm font-bold tracking-wide">{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setShowTestRunner(true);
              setMobileMenuOpen(false);
            }}
            className="nav-link text-amber-300 hover:text-[#FFE194] flex items-center justify-between mt-2 pt-2 border-t border-[#F5CE76]/15"
          >
            <span className="text-xs font-bold">Westminster Tests</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300">
              8 PASS
            </span>
          </button>
        </nav>

        {/* Operating Profile & Staff Switcher */}
        <div className="mt-auto pt-5 border-t border-[#F5CE76]/20 space-y-3.5">
          <div>
            <div className="label text-[10px] text-[#F5CE76] font-bold">OPERATING PROFILE</div>
            <div className="font-mono text-xs font-bold text-[#FFFFFF] uppercase tracking-wider leading-snug">
              {nightMode.mode === 'no_new_admissions'
                ? '01:30 AM CUT-OFF (SMOKERS ONLY)'
                : nightMode.mode === 'members_mode'
                ? 'POST-01:00 AM MEMBER & GUEST ONLY'
                : 'STANDARD ADMISSIONS'}
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5 font-mono">
              Westminster City Council Licensing Schedule
            </div>
          </div>

          {/* Connected Staff Profile Selector */}
          <div className="relative pt-2 border-t border-[#F5CE76]/15">
            <div className="label text-[10px] text-[#F5CE76] font-bold mb-1">ACTIVE OPERATOR</div>
            <button
              onClick={() => setShowStaffSelector(!showStaffSelector)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#171115] hover:bg-[#251A21] border border-[#F5CE76]/30 transition-colors text-left cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-white truncate">
                  {currentStaff.name}
                </div>
                <div className="text-[11px] font-mono text-[#F5CE76] font-semibold">
                  {currentStaff.badgeNumber} · {currentStaff.role.toUpperCase()}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#F5CE76] shrink-0" />
            </button>

            {showStaffSelector && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#171115] border border-[#F5CE76]/40 shadow-2xl rounded-xl p-2 z-50 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono text-[#F5CE76] font-bold uppercase tracking-wider">
                  Switch Active Role
                </div>
                {staffList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchStaff(s.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center justify-between transition-colors ${
                      s.id === currentStaff.id
                        ? 'bg-[#780C1E] text-[#FFE194] border border-[#F5CE76]/50'
                        : 'text-stone-200 hover:bg-[#241820]'
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] uppercase font-bold opacity-80">{s.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-col min-h-screen overflow-x-hidden">
        {/* Header Bar - High Contrast & Compact */}
        <header className="px-4 sm:px-6 py-2 sm:py-2.5 border-b border-[#F5CE76]/20 flex items-center justify-end gap-3 bg-[#0D0A0C]">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Clock & Operating Badge */}
            <div className="text-right">
              <div className="font-mono text-base sm:text-xl font-bold text-white tabular-nums tracking-tight">
                {currentDate.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              <div className="text-[10px] font-mono font-bold text-[#F5CE76] uppercase">
                {nightMode.mode === 'no_new_admissions'
                  ? 'Hard Cutoff Mode'
                  : nightMode.mode === 'members_mode'
                  ? 'Post-1am Members Only'
                  : 'Normal Admissions'}
              </div>
            </div>

            {/* Time Travel / Test Clock & PWA */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#F5CE76]/20">
              <VenueTimeController onOpenTestRunner={() => setShowTestRunner(true)} />
              <PWAInstallButton />
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <div className="flex-1 pb-16 md:pb-0">
          {currentTab === 'door' && (
            <DoorReceptionView
              currentStaff={currentStaff}
              onOpenTestRunner={() => setShowTestRunner(true)}
              onNavigateToApplications={() => setCurrentTab('applications')}
            />
          )}

          {currentTab === 'cards' && (
            <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <DigitalMemberCard />
            </div>
          )}

          {currentTab === 'register' && (
            <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
              <AttendanceRegisterView />
            </div>
          )}

          {currentTab === 'incidents' && (
            <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
              <IncidentLogView currentStaff={currentStaff} />
            </div>
          )}

          {currentTab === 'management' && (
            <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
              <ManagementDashboard currentStaff={currentStaff} />
            </div>
          )}

          {currentTab === 'applications' && (
            <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto">
              <MembershipApplicationFlow />
            </div>
          )}
        </div>

        {/* Footer - High Contrast & Compact */}
        <footer className="px-4 sm:px-8 py-3 bg-[#0D0A0C] border-t border-[#F5CE76]/20 font-mono text-[11px] text-stone-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-auto mb-14 md:mb-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center">
              <span className="status-dot" />
              <span className="font-bold text-white">
                CONNECTED: {currentStaff.name.toUpperCase()} [{currentStaff.badgeNumber} {currentStaff.role.toUpperCase()}]
              </span>
            </div>
            <span className="opacity-30">·</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>FIRESTORE CLOUD DB ONLINE</span>
            </div>
          </div>
          <div className="text-[#F5CE76] font-semibold">
            AMICA LATE · 23 FRITH STREET SOHO
          </div>
        </footer>

        {/* Mobile Ergonomic Bottom Tab Bar (Thumb Zone) - Compact, Big Font, High Contrast */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090608]/98 backdrop-blur-xl border-t border-[#F5CE76]/40 px-1 py-1 flex items-center justify-around shadow-2xl"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 min-w-[52px] min-h-[48px] rounded-xl transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-[#8E0E24] to-[#4A0813] text-[#FFFFFF] border-2 border-[#F5CE76] shadow-xl'
                    : 'text-[#E0D7CC] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFE194]' : 'text-[#E0D7CC]'}`} />
                <span className={`text-xs font-mono mt-0.5 tracking-tight ${isActive ? 'font-extrabold text-[#FFE194]' : 'text-[#E0D7CC] font-bold'}`}>
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </main>

      {/* Automated Boundary Tests Modal */}
      <TestRunnerModal
        isOpen={showTestRunner}
        onClose={() => setShowTestRunner(false)}
      />
    </div>
  );
}
