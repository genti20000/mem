import React, { useState } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  UserCheck,
  UserX,
  History,
  Lock,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Camera,
} from 'lucide-react';
import { Member, StaffUser, ClubRuleVersion, AuditEvent } from '../../types';
import { clubStore } from '../../services/storage';
import { validate48HourWaitingPeriod } from '../../services/ruleEngine';
import { PhotoCaptureModal } from '../common/PhotoCapture';

interface ManagementDashboardProps {
  currentStaff: StaffUser;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ currentStaff }) => {
  const [activeTab, setActiveTab] = useState<'applications' | 'members' | 'rules' | 'audit'>(
    'applications'
  );

  const members = clubStore.getMembers();
  const stats = clubStore.getCapacityStats();
  const ruleVersions = clubStore.getRuleVersions();
  const auditLogs = clubStore.getAuditLogs();

  // Selected member for modal actions (Suspend / Revoke / Info)
  const [actionMember, setActionMember] = useState<Member | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'revoke' | 'reinstate' | 'info' | null>(
    null
  );
  const [actionReason, setActionReason] = useState('');

  // Admin 48-Hour Backdate Bypass Modal
  const [backdateTargetMember, setBackdateTargetMember] = useState<Member | null>(null);
  const [backdateJustification, setBackdateJustification] = useState(
    'Paper nomination form received 48+ hours prior'
  );

  // Reject Application Modal
  const [rejectTargetMember, setRejectTargetMember] = useState<Member | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Photo Capture Modal for Applications and Members
  const [photoTargetMember, setPhotoTargetMember] = useState<Member | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Error / Warning Message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Rule Version Modal state
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleVersion, setNewRuleVersion] = useState('');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleText, setNewRuleText] = useState('');

  // Counts
  const activeCount = members.filter((m) => m.status === 'active').length;
  const waitingCount = members.filter(
    (m) => m.status === 'waiting_48_hours' || m.status === 'pending'
  ).length;
  const readyCount = members.filter((m) => m.status === 'ready_for_review').length;
  const suspendedCount = members.filter((m) => m.status === 'suspended').length;

  const isAuthorizedManager =
    currentStaff.role === 'manager' || currentStaff.role === 'admin';

  // Handle Approval Workflow
  const handleApprove = (member: Member) => {
    if (!isAuthorizedManager) return;

    // Server-grade validation check
    const waitCheck = validate48HourWaitingPeriod(member.appliedAt);
    if (!waitCheck.allowed) {
      setErrorMessage(`Cannot approve: ${waitCheck.reason}`);
      return;
    }

    const updated: Member = {
      ...member,
      status: 'active',
      approvedAt: new Date().toISOString(),
      approvedBy: currentStaff.name,
    };

    clubStore.saveMember(
      updated,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Application approved by ${currentStaff.name}. Verified hospitality employment at ${member.employer}.`
    );
  };

  // Admin Option: Open modal to bypass 48-Hour Waiting by backdating sign-up time
  const handleOpenAdminBackdateModal = (member: Member) => {
    if (!isAuthorizedManager) return;
    setBackdateTargetMember(member);
    setBackdateJustification('Paper nomination form received 48+ hours prior');
  };

  const handleConfirmAdminBackdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdateTargetMember || !isAuthorizedManager) return;

    clubStore.bypass48HourWaiting(
      backdateTargetMember.id,
      currentStaff,
      backdateJustification || 'Paper nomination form received 48+ hours prior'
    );

    setBackdateTargetMember(null);
  };

  const handleOpenRejectModal = (member: Member) => {
    if (!isAuthorizedManager) return;
    setRejectTargetMember(member);
    setRejectReason('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetMember || !isAuthorizedManager) return;

    const updated: Member = {
      ...rejectTargetMember,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedReason: rejectReason || 'Did not meet membership requirements',
    };

    clubStore.saveMember(
      updated,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      `Application rejected. Reason: ${rejectReason || 'Did not meet requirements'}`
    );

    setRejectTargetMember(null);
  };

  const handleExecuteMemberAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionMember || !actionType) return;

    let updated: Member = { ...actionMember };
    let actionLabel = '';

    if (actionType === 'suspend') {
      updated.status = 'suspended';
      updated.suspendedAt = new Date().toISOString();
      updated.suspendedReason = actionReason;
      actionLabel = 'SUSPEND_MEMBERSHIP';
    } else if (actionType === 'revoke') {
      updated.status = 'revoked';
      updated.revokedAt = new Date().toISOString();
      updated.revokedReason = actionReason;
      actionLabel = 'REVOKE_MEMBERSHIP';
    } else if (actionType === 'reinstate') {
      updated.status = 'active';
      updated.suspendedAt = undefined;
      updated.suspendedReason = undefined;
      actionLabel = 'REINSTATE_MEMBERSHIP';
    } else if (actionType === 'info') {
      updated.notes = `${updated.notes || ''}\n[Info Requested ${new Date().toLocaleDateString()}]: ${actionReason}`;
      actionLabel = 'REQUEST_ADDITIONAL_INFO';
    }

    clubStore.saveMember(
      updated,
      { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role },
      actionReason
    );

    setActionMember(null);
    setActionType(null);
    setActionReason('');
  };

  const handlePublishNewRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleVersion.trim() || !newRuleTitle.trim() || !newRuleText.trim()) return;

    const versionObj: ClubRuleVersion = {
      version: newRuleVersion.trim(),
      effectiveDate: new Date().toISOString(),
      title: newRuleTitle.trim(),
      summary: 'Management promulgated revision.',
      rules: newRuleText
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
    };

    clubStore.addRuleVersion(versionObj, currentStaff);
    setShowNewRuleModal(false);
    setNewRuleVersion('');
    setNewRuleTitle('');
    setNewRuleText('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & RBAC Notice */}
      <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.2em] text-[#780C1E]">
              AMICA SOHO
            </span>
            <span className="text-stone-300">·</span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Licensing & Governance Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-mono uppercase tracking-wider font-bold">
              {currentStaff.role.toUpperCase()}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            23 Frith Street Soho · Statutory 48-hour admissions review engine, licensing capacity & governance.
          </p>
        </div>

        {!isAuthorizedManager && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs">
            <Lock className="w-5 h-5 shrink-0 text-amber-700" />
            <span>
              <strong className="text-amber-800">Read-Only Mode:</strong> Approvals require Manager or Admin role. Switch operator in top right.
            </span>
          </div>
        )}
      </div>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-950 p-1 font-mono text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS - Clean White Porcelain Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
            Active Members
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-stone-900">
            {activeCount}
          </div>
          <div className="mt-0.5 text-xs text-emerald-700 font-semibold">Validated passes</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
            48h Waiting
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-amber-700">
            {waitingCount}
          </div>
          <div className="mt-0.5 text-xs text-amber-600 font-semibold">Statutory lockout</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-bold">
            Ready for Review
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-blue-800">
            {readyCount}
          </div>
          <div className="mt-0.5 text-xs text-blue-600 font-semibold">48h elapsed</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold">
            Suspended
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-rose-700">
            {suspendedCount}
          </div>
          <div className="mt-0.5 text-xs text-rose-600 font-semibold">Disciplinary hold</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
            Occupancy Live
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-stone-900">
            {stats.totalCustomers} <span className="text-sm text-stone-400 font-normal">/ 80</span>
          </div>
          <div className="mt-0.5 text-xs text-stone-500 font-semibold">Inside venue</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold">
            Proprietor
          </div>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-stone-900">
            {stats.proprietorGuestsInside} <span className="text-sm text-amber-600 font-semibold">/ 5</span>
          </div>
          <div className="mt-0.5 text-xs text-stone-500 font-semibold">Statutory limit</div>
        </div>
      </div>

      {/* Tabs - Refined Segmented Control */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-[#EDE7DF] rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-[#780C1E] text-white shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          48-Hour Waiting & Review Queue ({waitingCount + readyCount})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-[#780C1E] text-white shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          Member Roster & Actions ({members.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-[#780C1E] text-white shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          Club Rules & Versions ({ruleVersions.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#780C1E] text-white shadow-xs font-bold'
              : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
          }`}
        >
          Immutable Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: 48-HOUR WAITING & REVIEW QUEUE */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 text-sm">
                Statutory 48-Hour Rule Enforcement
              </div>
              <div className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Under the venue’s operating schedule, applicants cannot be approved before 48 continuous hours have elapsed. The system programmatically disables approval controls until the exact second of eligibility.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {members
              .filter(
                (m) =>
                  m.status === 'waiting_48_hours' ||
                  m.status === 'ready_for_review' ||
                  m.status === 'pending'
              )
              .map((app) => {
                const waitCheck = validate48HourWaitingPeriod(app.appliedAt);
                const isEligibleForApproval = waitCheck.allowed;

                return (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl bg-white border border-[#EDE7DF] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 max-w-xl">
                      {/* Photo Thumbnail with Add/Take Photo Trigger */}
                      <div className="relative group shrink-0">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#EDE7DF] bg-[#FAF8F5] shadow-xs flex items-center justify-center">
                          {app.photoUrl ? (
                            <img src={app.photoUrl} alt={app.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-[#FAF8F5]">
                              <Camera className="w-4 h-4 text-stone-400" />
                              <span className="text-[7px] font-mono text-stone-400">NO PHOTO</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoTargetMember(app);
                            setShowPhotoModal(true);
                          }}
                          className="mt-1 w-full text-[9px] font-mono py-0.5 px-1 rounded-md bg-[#FAF8F5] hover:bg-stone-100 border border-[#EDE7DF] text-stone-700 text-center flex items-center justify-center gap-1 cursor-pointer"
                          title="Add photo or take new"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>{app.photoUrl ? 'Retake' : '+ Photo'}</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-lg font-bold text-stone-900">
                            {app.fullName}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#780C1E]">
                            ({app.memberNumber})
                          </span>
                          <span
                            className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
                              isEligibleForApproval
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            {isEligibleForApproval
                              ? 'Ready for Manager Approval'
                              : 'In 48h Waiting Period'}
                          </span>
                        </div>

                        <div className="text-xs text-stone-700">
                          <strong>{app.hospitalityRole}</strong> at <strong>{app.employer}</strong>
                        </div>

                        {app.employerAddressOrWebsite && (
                          <div className="text-[11px] text-stone-500">
                            {app.employerAddressOrWebsite}
                          </div>
                        )}

                        {app.employmentEvidenceNote && (
                          <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] text-[11px] text-stone-700">
                            <strong className="text-stone-900">Evidence:</strong> {app.employmentEvidenceNote}
                          </div>
                        )}

                        <div className="text-[10px] font-mono text-stone-500 flex items-center gap-2 pt-1">
                          <span>Applied: {new Date(app.appliedAt).toLocaleString('en-GB')}</span>
                          <span>·</span>
                          <span>Accepted Rules: v{app.ruleAcceptance.ruleVersion}</span>
                        </div>

                        {/* Remaining countdown banner if still waiting */}
                        {!isEligibleForApproval && (
                          <div className="text-xs text-amber-700 font-mono flex items-center gap-1.5 pt-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{waitCheck.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                      {isEligibleForApproval ? (
                        <button
                          onClick={() => handleApprove(app)}
                          disabled={!isAuthorizedManager}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
                        >
                          Approve Membership
                        </button>
                      ) : (
                        <>
                          <button
                            disabled
                            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-500 text-xs font-mono font-semibold disabled:opacity-80 cursor-not-allowed"
                            title="Standard 48-hour countdown is currently active"
                          >
                            48h Lock Active
                          </button>

                          {isAuthorizedManager && (
                            <button
                              onClick={() => handleOpenAdminBackdateModal(app)}
                              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
                              title="Admin option: record that sign-up was completed 48 hours before"
                            >
                              <span>Admin Bypass (Done 48h Prior)</span>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          setPhotoTargetMember(app);
                          setShowPhotoModal(true);
                        }}
                        className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#EDE7DF] text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Add photo or take new with device camera"
                      >
                        <Camera className="w-3.5 h-3.5 text-stone-600" />
                        <span>Photo</span>
                      </button>

                      {isAuthorizedManager && (
                        <button
                          onClick={() => handleOpenRejectModal(app)}
                          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: ALL MEMBERS & ACTIONS */}
      {activeTab === 'members' && (
        <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EDE7DF] text-stone-500 font-mono uppercase text-[10px]">
                <th className="pb-3 w-12">Photo</th>
                <th className="pb-3">Member</th>
                <th className="pb-3">Trade Role & Employer</th>
                <th className="pb-3">Rules Accepted</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE7DF]">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTargetMember(m);
                        setShowPhotoModal(true);
                      }}
                      className="relative group w-10 h-10 rounded-xl overflow-hidden border border-[#EDE7DF] bg-[#FAF8F5] block cursor-pointer"
                      title="Update member photo (Add or Take New)"
                    >
                      {m.photoUrl ? (
                        <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 bg-[#FAF8F5]">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </td>
                  <td className="py-3 font-medium text-stone-900">
                    <div className="text-sm font-serif font-bold text-stone-900">
                      {m.fullName}
                    </div>
                    <div className="text-[10px] font-mono text-[#780C1E] font-semibold">
                      {m.memberNumber} {m.email ? `· ${m.email}` : ''}
                    </div>
                  </td>
                  <td className="py-3 text-stone-700">
                    <div>{m.hospitalityRole}</div>
                    <div className="text-[11px] text-stone-400">{m.employer}</div>
                  </td>
                  <td className="py-3 font-mono text-stone-500">
                    v{m.ruleAcceptance.ruleVersion}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
                        m.status === 'active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : m.status === 'waiting_48_hours'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : m.status === 'ready_for_review'
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setPhotoTargetMember(m);
                          setShowPhotoModal(true);
                        }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#EDE7DF] text-stone-700 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Update member photo (Add or Take New)"
                      >
                        <Camera className="w-3 h-3 text-stone-600" />
                        <span>Photo</span>
                      </button>

                      {m.status === 'suspended' ? (
                        <button
                          onClick={() => {
                            setActionMember(m);
                            setActionType('reinstate');
                          }}
                          disabled={!isAuthorizedManager}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold cursor-pointer disabled:opacity-40"
                        >
                          Reinstate
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActionMember(m);
                            setActionType('suspend');
                          }}
                          disabled={!isAuthorizedManager}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-semibold cursor-pointer disabled:opacity-40"
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActionMember(m);
                          setActionType('revoke');
                        }}
                        disabled={!isAuthorizedManager}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold cursor-pointer disabled:opacity-40"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CLUB RULES VERSION ENGINE */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Club rules with statutory versioning. Members are bound by the version accepted at application.
            </p>
            <button
              onClick={() => setShowNewRuleModal(true)}
              disabled={!isAuthorizedManager}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Rule Revision</span>
            </button>
          </div>

          <div className="space-y-4">
            {ruleVersions.map((ruleVer) => (
              <div
                key={ruleVer.version}
                className="p-5 rounded-2xl bg-white border border-[#EDE7DF] space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DF]">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      {ruleVer.title}
                    </h3>
                    <div className="text-[11px] font-mono text-stone-500">
                      Version {ruleVer.version} · Effective from {new Date(ruleVer.effectiveDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-stone-100 border border-stone-200 text-stone-700 px-2.5 py-0.5 rounded-full font-bold">
                    Immutable
                  </span>
                </div>

                <div className="space-y-2 text-xs text-stone-700 leading-relaxed">
                  {ruleVer.rules.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF]">
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: IMMUTABLE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 shadow-xs overflow-x-auto">
          <div className="text-xs font-mono text-stone-500 mb-3">
            Every staff and manager decision creates an immutable regulatory audit trail.
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EDE7DF] text-stone-500 font-mono uppercase text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Actor (Staff)</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Previous State</th>
                <th className="pb-3">New State / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE7DF]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3 font-mono text-stone-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString('en-GB')}
                  </td>
                  <td className="py-3 font-medium text-stone-900">
                    <div>{log.actorName}</div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">
                      {log.actorRole}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-xs font-bold text-[#780C1E]">
                    {log.action}
                  </td>
                  <td className="py-3 text-stone-700">
                    {log.targetName || log.targetId}
                  </td>
                  <td className="py-3 font-mono text-stone-400">
                    {log.previousValue || '—'}
                  </td>
                  <td className="py-3 text-stone-800">
                    <div>{log.newValue}</div>
                    {log.reason && (
                      <div className="text-[10px] text-stone-500 italic mt-0.5">
                        "{log.reason}"
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: MEMBER DISCIPLINARY / REASON MODAL */}
      {actionMember && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#EDE7DF] shadow-2xl p-6">
            <h3 className="font-serif text-lg font-bold text-stone-900 capitalize">
              {actionType} Membership: {actionMember.fullName}
            </h3>

            <p className="text-xs text-stone-500 mt-1 mb-4">
              Enter official justification. This action is permanently recorded in the licensing audit history.
            </p>

            <form onSubmit={handleExecuteMemberAction} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 mb-1 font-bold">
                  Regulatory Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Detail the infraction, investigation, or reinstatement conditions..."
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#780C1E]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionMember(null);
                    setActionType(null);
                    setActionReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirm & Commit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH NEW CLUB RULES */}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121214] border border-[#581625] shadow-2xl p-6">
            <h3 className="font-serif text-lg font-bold text-[#E5C378]">
              Promulgate New Club Rules Version
            </h3>
            <p className="text-xs text-stone-300 mt-1 mb-4">
              Historical versions are preserved immutably. Applicants will be required to accept this new version upon submission.
            </p>

            <form onSubmit={handlePublishNewRules} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                    Version Identifier (e.g. 2.1) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2.1"
                    value={newRuleVersion}
                    onChange={(e) => setNewRuleVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B090A] border border-[#3E101B] rounded-lg text-xs text-stone-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Amica Soho Charter 2026 Revision"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B090A] border border-[#3E101B] rounded-lg text-xs text-stone-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                  Rule Clauses (One per line) *
                </label>
                <textarea
                  required
                  rows={6}
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="1. Clause one...\n2. Clause two..."
                  className="w-full px-3 py-2 bg-[#0B090A] border border-[#3E101B] rounded-lg text-xs text-stone-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#221B1E] text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#581625] hover:bg-[#6F1C30] border border-[#C6A052]/40 text-[#E5C378] text-xs font-mono font-bold"
                >
                  Publish Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN 48-HOUR BACKDATE OVERRIDE MODAL */}
      {backdateTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121214] border border-[#581625] shadow-2xl p-6">
            <div className="flex items-center gap-2.5 text-[#E5C378] mb-2">
              <Shield className="w-5 h-5 text-[#C6A052]" />
              <h3 className="font-serif text-lg font-bold">
                Admin 48-Hour Backdate Override
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-[#26150D] border border-amber-600/40 text-xs text-amber-200/90 mb-4 space-y-1">
              <div className="font-bold text-amber-300">
                Applicant: {backdateTargetMember.fullName} ({backdateTargetMember.memberNumber})
              </div>
              <p className="text-[11px] leading-relaxed">
                Westminster Licensing statutory condition requires 48 continuous hours between nomination and privileges. Use this option to certify that the nomination or paper application was physically completed 48+ hours ago.
              </p>
              <div className="text-[10px] text-amber-400 font-mono pt-1">
                ● Backdates applied timestamp to 49 hours ago<br />
                ● Immediately activates membership status<br />
                ● Permanently logs audit trail under {currentStaff.name} ({currentStaff.badgeNumber})
              </div>
            </div>

            <form onSubmit={handleConfirmAdminBackdate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Regulatory Justification / Reference *
                </label>
                <input
                  type="text"
                  required
                  value={backdateJustification}
                  onChange={(e) => setBackdateJustification(e.target.value)}
                  placeholder="e.g. Paper nomination form received 48+ hours prior at reception"
                  className="w-full px-3.5 py-2.5 bg-[#0B090A] border border-[#3E101B] rounded-lg text-xs text-stone-200 focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBackdateTargetMember(null)}
                  className="px-4 py-2 rounded-lg bg-[#221B1E] text-xs text-stone-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#581625] hover:bg-[#6F1C30] border border-[#C6A052]/50 text-[#E5C378] text-xs font-mono font-bold shadow-lg flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E5C378]" />
                  <span>Confirm & Activate Immediately</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT APPLICANT MODAL */}
      {rejectTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-rose-900/60 shadow-2xl p-6">
            <h3 className="font-serif text-lg font-bold text-rose-300">
              Reject Application: {rejectTargetMember.fullName}
            </h3>
            <p className="text-xs text-stone-300 mt-1 mb-4">
              Specify reason for refusal (e.g. non-hospitality profession, incomplete verification, regulatory grounds).
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State statutory or governance reason..."
                  className="w-full px-3 py-2 bg-[#0B090A] border border-[#3E101B] rounded-lg text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTargetMember(null)}
                  className="px-4 py-2 rounded-lg bg-[#221B1E] text-xs text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-600/50 text-rose-200 text-xs font-mono font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Capture Modal (Take New or Add Photo) for Applications and Members */}
      {photoTargetMember && (
        <PhotoCaptureModal
          isOpen={showPhotoModal}
          onClose={() => {
            setShowPhotoModal(false);
            setPhotoTargetMember(null);
          }}
          member={photoTargetMember}
          onPhotoUpdated={(updated) => {
            setPhotoTargetMember(updated);
          }}
        />
      )}
    </div>
  );
};
