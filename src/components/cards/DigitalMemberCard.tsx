import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  Download,
  AlertTriangle,
  User,
  ChevronDown,
  Camera,
  CheckCircle2,
  Mail,
  Send,
  Share2,
} from 'lucide-react';
import { Member } from '../../types';
import { clubStore, subscribeToStore } from '../../services/storage';
import { generateSignedMemberToken } from '../../services/security';
import { UniversalCameraScanner } from '../camera/UniversalCameraScanner';
import { AppleWalletPassModal } from './AppleWalletPassModal';
import { SendPassModal } from './SendPassModal';

export const DigitalMemberCard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(clubStore.getMembers());
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members.find((m) => m.status === 'active')?.id || members[0]?.id || ''
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [activeToken, setActiveToken] = useState<string>('');
  const [showTestScanner, setShowTestScanner] = useState<boolean>(false);
  const [showAppleWalletModal, setShowAppleWalletModal] = useState<boolean>(false);
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [verifiedMember, setVerifiedMember] = useState<Member | null>(null);

  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setMembers(clubStore.getMembers());
    });
    return unsub;
  }, []);

  const activeMember = members.find((m) => m.id === selectedMemberId) || members[0];

  // Rotate QR code token every 60 seconds
  useEffect(() => {
    if (!activeMember) return;

    const updateQr = async () => {
      const now = Date.now();
      const tokenObj = generateSignedMemberToken(activeMember.id, now);
      setActiveToken(tokenObj.token);
      setSecondsRemaining(tokenObj.secondsRemaining);

      try {
        const url = await QRCode.toDataURL(tokenObj.token, {
          width: 280,
          margin: 1,
          color: {
            dark: '#161012',
            light: '#F5E6CA',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };

    updateQr();
    const interval = setInterval(updateQr, 1000);

    return () => clearInterval(interval);
  }, [activeMember?.id]);

  if (!activeMember) {
    return (
      <div className="p-8 text-center text-stone-400">
        No membership records available.
      </div>
    );
  }

  const memberSinceYear = new Date(activeMember.appliedAt).getFullYear();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Selector & Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/35 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-script text-2xl font-bold text-[#FFE194]">Amica</span>
            <span className="font-cinzel text-xs font-bold tracking-[2px] text-[#F5CE76]">LATE</span>
            <span className="text-xs text-[#F5CE76]/40">·</span>
            <span className="font-mono text-xs font-bold text-white uppercase">Passes</span>
          </div>
          <p className="text-xs text-stone-200 mt-0.5 font-medium">
            Rotating dynamic QR tokens for 23 Frith Street door scanner & Apple Wallet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="px-3 py-2 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-[#FFE194]"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#120A0E] text-white">
                {m.fullName} ({m.memberNumber}) — {m.status.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAppleWalletModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-neutral-900 border border-white/30 text-white text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Open Apple Wallet Pass"
          >
            <span>Apple Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Send Pass to Member"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Luxury Digital Membership Card Container */}
      <div className="flex justify-center p-1 sm:p-4">
        <div className="w-full max-w-sm rounded-[28px] bg-gradient-to-b from-[#8E0E24] via-[#4A0813] to-[#12080D] border-2 border-[#F5CE76] shadow-2xl p-6 sm:p-7 relative overflow-hidden text-center">
          {/* Subtle Art Deco Gold Background Ornaments */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFE194] to-transparent opacity-90" />
          <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full border border-[#F5CE76]/25 pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full border border-[#FFE194]/20 pointer-events-none" />

          {/* Card Header Brand Lockup */}
          <div className="relative z-10 pb-3.5 border-b border-[#F5CE76]/30">
            <div className="text-[11px] font-mono tracking-[0.25em] uppercase text-[#FFE194] font-bold">
              23 FRITH STREET · SOHO
            </div>
            <div className="font-script text-4xl sm:text-5xl font-bold text-[#FFE194] drop-shadow-md my-0.5">
              Amica
            </div>
            <div className="font-cinzel text-xs font-extrabold tracking-[3px] text-[#F5CE76] uppercase">
              LATE
            </div>
            <div className="font-mono text-xs font-bold text-white tracking-wider uppercase mt-1">
              Sub: <span className="text-[#FFE194]">Jonny&apos;s Late Show</span>
            </div>
          </div>

          {/* Member Photo & Crest */}
          <div className="my-4 relative flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#F5CE76] shadow-xl bg-[#1F1117]">
                {activeMember.photoUrl ? (
                  <img
                    src={activeMember.photoUrl}
                    alt={activeMember.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#FFE194]">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#8E0E24] border border-[#F5CE76] flex items-center justify-center text-[#FFE194] text-xs font-serif font-bold shadow-md">
                A
              </div>
            </div>
          </div>

          {/* Member Name & Credentials */}
          <div className="space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              {activeMember.fullName}
            </h2>
            <div className="text-xs sm:text-sm font-bold text-[#FFE194] uppercase tracking-wider">
              {activeMember.hospitalityRole}
            </div>
            <div className="text-xs text-stone-200 font-medium">
              {activeMember.employer}
            </div>
          </div>

          {/* Member Number & Metadata Strip */}
          <div className="my-3.5 py-2.5 px-3.5 rounded-xl bg-black/40 border border-[#F5CE76]/35 flex items-center justify-between text-left shadow-inner">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#FFE194] font-bold">MEMBER NO.</div>
              <div className="text-sm font-mono font-bold text-white">
                {activeMember.memberNumber}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-300 font-bold">SINCE</div>
              <div className="text-xs font-mono font-semibold text-white">
                {memberSinceYear}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#FFE194] font-bold">STATUS</div>
              <div
                className={`text-xs font-mono font-bold uppercase ${
                  activeMember.status === 'active'
                    ? 'text-emerald-300'
                    : activeMember.status === 'waiting_48_hours'
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }`}
              >
                {activeMember.status.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* High Security Rotating QR Code Frame */}
          <div className="p-3 bg-white rounded-2xl shadow-xl inline-block my-2 border-2 border-[#F5CE76]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Dynamic Member QR"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-stone-800 text-xs">
                Generating Token...
              </div>
            )}
          </div>

          {/* Dynamic Screenshot Protection Gauge */}
          <div className="mt-3 px-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#FFE194] font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F5CE76]" />
                Rotating Security Token
              </span>
              <span>Expires in {secondsRemaining}s</span>
            </div>
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-[#F5CE76]/30">
              <div
                className="bg-gradient-to-r from-[#F5CE76] to-[#FFE194] h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Disclaimer Footer */}
          <div className="mt-4 pt-3 border-t border-[#F5CE76]/25 text-[11px] text-stone-200 leading-tight font-medium">
            Non-transferable. Present at 23 Frith Street door kiosk. 01:00 AM admission cut-off.
          </div>
        </div>
      </div>

      {/* Primary Pass Actions: Add to Apple Wallet & Send Member Pass */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        {/* Official "Add to Apple Wallet" Button */}
        <button
          type="button"
          onClick={() => setShowAppleWalletModal(true)}
          className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-black hover:bg-neutral-900 border border-white/30 text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl group cursor-pointer"
        >
          <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
          </svg>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-300 leading-none">
              Add to
            </div>
            <div className="text-sm font-bold tracking-tight text-white leading-tight">
              Apple Wallet
            </div>
          </div>
        </button>

        {/* Send Member Pass Button */}
        <button
          type="button"
          onClick={() => setShowSendModal(true)}
          className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl font-mono text-xs uppercase tracking-wider font-bold cursor-pointer"
        >
          <Send className="w-4 h-4 shrink-0 text-[#FFE194]" />
          <span>Send Pass (Email / SMS)</span>
        </button>
      </div>

      {/* Quick Test Verification Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/35 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#281119] border border-[#F5CE76]/50 flex items-center justify-center text-[#FFE194] shadow-md shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-white tracking-wide">
              Test Device Camera Compatibility
            </h3>
            <p className="text-xs text-stone-300 font-medium">
              Verify this card or another member&apos;s pass using any device camera (front, back, webcam, or photo upload).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTestScanner(true)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#20131A] hover:bg-[#8E0E24] border border-[#F5CE76]/50 text-white text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-[#FFE194]" />
          <span>Launch Camera Scanner</span>
        </button>
      </div>

      {/* Verified Member Notification Modal */}
      {verifiedMember && (
        <div className="p-4 rounded-xl bg-[#141417] border-2 border-emerald-500 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-emerald-400 font-bold">
                CAMERA VERIFICATION SUCCESS
              </div>
              <div className="text-sm font-serif font-bold text-white">
                {verifiedMember.fullName} ({verifiedMember.memberNumber})
              </div>
              <div className="text-[11px] text-stone-400">
                {verifiedMember.hospitalityRole} · {verifiedMember.employer} · Status: {verifiedMember.status.toUpperCase()}
              </div>
            </div>
          </div>
          <button
            onClick={() => setVerifiedMember(null)}
            className="text-xs text-stone-400 hover:text-white px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Universal Camera Scanner Modal */}
      <UniversalCameraScanner
        mode="modal"
        isOpen={showTestScanner}
        onClose={() => setShowTestScanner(false)}
        onMemberScanned={(member) => {
          setVerifiedMember(member);
          setShowTestScanner(false);
        }}
      />

      {/* Apple Wallet Pass Modal */}
      <AppleWalletPassModal
        isOpen={showAppleWalletModal}
        onClose={() => setShowAppleWalletModal(false)}
        member={activeMember}
        qrDataUrl={qrDataUrl}
        qrToken={activeToken}
        secondsRemaining={secondsRemaining}
        onOpenSendModal={() => setShowSendModal(true)}
      />

      {/* Send Member Pass Modal */}
      <SendPassModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        member={activeMember}
        qrToken={activeToken}
        onOpenAppleWalletModal={() => setShowAppleWalletModal(true)}
      />
    </div>
  );
};
