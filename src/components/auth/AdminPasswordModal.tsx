import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { adminAuth } from '../../services/adminAuth';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Admin Authorization Required',
  description = 'Please enter the Amica Soho admin password to unlock management controls, admissions approval, and licensing overrides.',
}) => {
  const [tab, setTab] = useState<'login' | 'change'>('login');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = adminAuth.login(password);
    if (result.success) {
      setSuccessMessage('Admin access authorized successfully.');
      setPassword('');
      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 600);
    } else {
      setErrorMessage(result.error || 'Incorrect password.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    const result = adminAuth.changePassword(currentPassword, newPassword);
    if (result.success) {
      setSuccessMessage('Admin password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setTab('login');
        setSuccessMessage(null);
      }, 1200);
    } else {
      setErrorMessage(result.error || 'Failed to update password.');
    }
  };

  const handleFillDefault = () => {
    setPassword(adminAuth.getDefaultPasswordHint());
    setErrorMessage(null);
  };

  const isAuth = adminAuth.isAuthenticated();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md rounded-[28px] border-[1.5px] border-[#D8AA4E] p-6 sm:p-7 relative shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden text-left"
        style={{
          background: 'radial-gradient(130% 100% at 50% 10%, #3D0712 0%, #20040A 60%, #0F0205 100%)',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-[#E5C378]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security Shield Icon & Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E5C378]/15 border border-[#E5C378]/50 flex items-center justify-center shadow-inner shrink-0">
            {isAuth ? (
              <Unlock className="w-6 h-6 text-[#E5C378]" />
            ) : (
              <Lock className="w-6 h-6 text-[#E5C378]" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5C378]">
              AMICA SOHO · 23 FRITH STREET
            </div>
            <h3 className="font-editorial text-2xl text-white font-normal leading-tight">
              {tab === 'login' ? title : 'Change Admin Password'}
            </h3>
          </div>
        </div>

        {/* Tabs: Unlock vs Change */}
        <div className="flex items-center gap-2 mb-5 p-1 rounded-xl bg-black/40 border border-[#E5C378]/25 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-[#E5C378] text-[#1A1005] shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Unlock Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('change');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              tab === 'change'
                ? 'bg-[#E5C378] text-[#1A1005] shadow-sm'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Set Password</span>
          </button>
        </div>

        {/* Status / Error Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 font-sans animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2 font-sans animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN / UNLOCK */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {description}
            </p>

            <div>
              <label className="block text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-1.5">
                Admin Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password or PIN"
                  className="w-full pl-4 pr-11 py-3.5 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm rounded-xl sm:rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378] shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-stone-500 hover:text-stone-800 p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Default Password Prompt / Hint */}
            <div className="p-3 rounded-xl bg-black/40 border border-[#E5C378]/20 flex items-center justify-between text-[11px] font-sans">
              <span className="text-stone-300">
                Default: <strong className="text-[#E5C378] font-mono">Amica2026</strong> (or PIN <strong className="text-[#E5C378] font-mono">1984</strong>)
              </span>
              <button
                type="button"
                onClick={handleFillDefault}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#E5C378] font-mono text-[10px] font-semibold border border-[#E5C378]/30 transition-colors cursor-pointer"
              >
                Auto-Fill
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-[0.14em] text-[#1A1005] shadow-[0_4px_24px_rgba(222,174,78,0.35)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)',
              }}
            >
              Unlock Admin Controls
            </button>
          </form>
        )}

        {/* TAB 2: CHANGE PASSWORD */}
        {tab === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              Update the master admin password for 23 Frith Street. Choose a secure phrase or code.
            </p>

            <div>
              <label className="block text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password (default: Amica2026)"
                className="w-full px-4 py-3 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new admin password"
                className="w-full px-4 py-3 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-sans font-bold tracking-[0.14em] uppercase text-[#FFF7EC] mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 bg-[#F9F4EB] text-stone-900 placeholder:text-stone-400 font-medium text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#E5C378]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl font-bold uppercase text-xs tracking-[0.14em] text-[#1A1005] shadow-[0_4px_24px_rgba(222,174,78,0.35)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, #F5D386 0%, #DFB04F 50%, #B8852B 100%)',
                }}
              >
                Save New Admin Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
