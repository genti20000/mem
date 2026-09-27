import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Share2,
  RotateCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Member } from '../../types';
import { generateSignedMemberToken } from '../../services/security';
import { downloadAppleWalletPass } from '../../services/appleWallet';

interface AppleWalletPassCardProps {
  member: Member;
  onOpenSendModal?: () => void;
}

export const AppleWalletPassCard: React.FC<AppleWalletPassCardProps> = ({
  member,
  onOpenSendModal,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Generate dynamic rotating QR token
  useEffect(() => {
    let isMounted = true;

    const updateToken = async () => {
      const { token, secondsRemaining: rem } = generateSignedMemberToken(member.id);
      if (isMounted) {
        setSecondsRemaining(rem);
        try {
          const url = await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 260,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          if (isMounted) setQrDataUrl(url);
        } catch (e) {
          console.error('Failed to generate pass QR:', e);
        }
      }
    };

    updateToken();
    const interval = setInterval(updateToken, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [member.id]);

  const handleDownloadWallet = async () => {
    try {
      setIsGenerating(true);
      await downloadAppleWalletPass(member);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error downloading Apple Wallet pass:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const roleTitle =
    member.tier ||
    (member.hospitalityRole ? member.hospitalityRole.toUpperCase() : 'MEMBER');
  const guestAllowance = member.guestAllowance ?? 2;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Perspective Container for 3D Flip */}
      <div
        className="w-full relative [perspective:1200px] cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`w-full transition-all duration-700 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* ================= FRONT OF APPLE WALLET PASS ================= */}
          <div
            className={`w-full rounded-[24px] overflow-hidden shadow-2xl border border-[#C6A052]/30 [backface-visibility:hidden] relative bg-gradient-to-b from-[#1E1116] via-[#120D10] to-[#0A0709]`}
            style={{
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(198, 160, 82, 0.25)',
            }}
          >
            {/* Top Apple Wallet Pass Notch / Header Bar */}
            <div className="px-6 pt-5 pb-3 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2A0F17] border border-[#C6A052]/40 flex items-center justify-center text-[#C6A052] font-serif font-bold text-sm shadow-inner">
                  J
                </div>
                <div>
                  <div className="font-serif tracking-[3px] text-[#C6A052] font-bold text-base leading-none">
                    JONNY&apos;S
                  </div>
                  <div className="font-mono text-[9px] text-white/50 tracking-wider uppercase mt-0.5">
                    23 Frith St · Soho
                  </div>
                </div>
              </div>

              {/* Header Right: Membership Tier */}
              <div className="text-right">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#C6A052]/80">
                  MEMBERSHIP
                </div>
                <div className="font-sans font-bold text-xs text-white tracking-wider uppercase">
                  {roleTitle}
                </div>
              </div>
            </div>

            {/* Pass Strip / Brand Banner */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-[#380E1A] via-[#1F0C13] to-[#120B0F] border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#C6A052]">
                  MEMBER PASS
                </div>
                <div className="font-sans font-bold text-xl text-white tracking-wide mt-0.5 drop-shadow-sm">
                  {member.fullName}
                </div>
              </div>
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#C6A052]/60 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#C6A052] font-serif font-bold text-lg">
                  {member.fullName.charAt(0)}
                </div>
              )}
            </div>

            {/* Secondary Fields (Number & Status) */}
            <div className="px-6 py-3 grid grid-cols-2 gap-4 border-b border-white/[0.06] bg-black/20">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                  MEMBER NO.
                </div>
                <div className="font-mono font-bold text-sm text-[#C6A052] tracking-wider">
                  {member.memberNumber}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                  STATUS
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {member.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Auxiliary Fields (Rules & Guests) */}
            <div className="px-6 py-2.5 grid grid-cols-3 gap-2 border-b border-white/[0.06] bg-black/30 font-mono text-[10px]">
              <div>
                <div className="text-white/40 text-[8px] uppercase tracking-wider">GUESTS</div>
                <div className="font-semibold text-white/90 mt-0.5">+{guestAllowance} Limit</div>
              </div>
              <div className="text-center">
                <div className="text-[#C6A052] text-[8px] uppercase tracking-wider">LAST ENTRY</div>
                <div className="font-bold text-[#E5C378] mt-0.5">01:00 AM</div>
              </div>
              <div className="text-right">
                <div className="text-white/40 text-[8px] uppercase tracking-wider">GUEST EXIT</div>
                <div className="font-semibold text-white/90 mt-0.5">01:30 AM</div>
              </div>
            </div>

            {/* Apple Wallet Barcode / QR Surface */}
            <div className="p-6 flex flex-col items-center justify-center bg-[#070506]">
              <div className="p-3 bg-white rounded-2xl shadow-xl border border-white/20 relative group/qr">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Apple Wallet Pass QR"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <RotateCw className="w-6 h-6 text-stone-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Dynamic rotating countdown */}
              <div className="flex items-center gap-2 mt-3.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-[#C6A052]">
                  <Clock className="w-3 h-3 text-[#C6A052] animate-pulse" />
                  <span>Cycle: {secondsRemaining}s</span>
                </div>
                <span className="font-mono text-[10px] text-white/40">
                  {member.memberNumber}
                </span>
              </div>
            </div>

            {/* Card Footer: Tap to Flip indicator */}
            <div className="px-6 py-2.5 bg-black/60 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#C6A052]" />
                Westminster Regulated
              </span>
              <span className="flex items-center gap-1 text-[#C6A052]/80 hover:text-[#C6A052]">
                <Info className="w-3 h-3" />
                Tap card to view back
              </span>
            </div>
          </div>

          {/* ================= BACK OF APPLE WALLET PASS ================= */}
          <div
            className={`w-full rounded-[24px] overflow-hidden shadow-2xl border border-[#C6A052]/30 [backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-[#0E0B0D] flex flex-col justify-between`}
            style={{
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(198, 160, 82, 0.25)',
            }}
          >
            {/* Back Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] bg-black/40 flex items-center justify-between">
              <div className="font-serif text-lg font-bold tracking-wider text-[#C6A052]">
                JONNY&apos;S SOHO
              </div>
              <div className="font-mono text-[10px] text-white/40 uppercase">
                Pass Information
              </div>
            </div>

            {/* Back Scrollable Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[460px] text-left">
              <div>
                <div className="font-mono text-[10px] text-[#C6A052] uppercase tracking-wider">
                  Club Location
                </div>
                <div className="font-sans text-sm text-white font-medium mt-0.5">
                  23 Frith Street, Soho, London W1D 4RR
                </div>
                <div className="font-mono text-[10px] text-white/40">
                  Westminster Licensing Act 2003
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="font-mono text-[10px] text-[#C6A052] uppercase font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Statutory Rule 4 · 01:00 AM Last Entry
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Strict last admission for members is <strong>01:00 AM</strong>. No new entry or re-admission is permitted after 01:00 AM.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="font-mono text-[10px] text-[#C6A052] uppercase font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Statutory Rule 6 · 01:30 AM Guest Departure
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  All non-member guests must vacate the premises by <strong>01:30 AM</strong>. Members in good standing may remain until terminal hour.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06] text-xs">
                <div>
                  <div className="font-mono text-[9px] text-white/40 uppercase">Club Secretary / DPS</div>
                  <div className="text-white font-medium mt-0.5">Christian Pettitt</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] text-white/40 uppercase">Door Reception</div>
                  <div className="text-white font-medium mt-0.5">+44 20 7437 2300</div>
                </div>
              </div>

              <div className="text-[10px] text-stone-400 font-mono pt-2">
                This digital pass is strictly non-transferable. Present at the 23 Frith Street door reception kiosk.
              </div>
            </div>

            {/* Back Footer */}
            <div className="px-6 py-3 bg-black/60 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Rev 2.4 · Westminster DPS</span>
              <span className="text-[#C6A052]">Tap card to view front</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ACTION BUTTONS BELOW PASS ================= */}
      <div className="w-full mt-6 space-y-3">
        {/* Official "Add to Apple Wallet" Styled Badge Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadWallet();
          }}
          disabled={isGenerating}
          className="w-full group/btn relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-black border border-white/20 hover:border-[#C6A052]/80 transition-all shadow-xl active:scale-[0.98]"
        >
          {/* Apple Logo SVG */}
          <svg
            className="w-6 h-6 fill-white transition-transform group-hover/btn:scale-105"
            viewBox="0 0 170 170"
          >
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.91-14.42-5.46-8.58-9.84-18.42-13.14-29.5-3.3-11.08-4.96-21.73-4.96-31.96 0-14.93 3.65-27.13 10.95-36.59 7.3-9.46 16.51-14.28 27.63-14.46 5.34 0 11.01 1.41 17.02 4.22 6.01 2.82 9.88 4.29 11.62 4.41 1.34 0 5.46-1.57 12.37-4.7 6.9-3.13 13.04-4.56 18.4-4.29 13.9.72 24.69 5.64 32.37 14.75-12.18 7.35-18.15 17.48-17.91 30.38.25 10.15 4.13 18.66 11.64 25.53 7.51 6.87 16.42 10.87 26.74 12.01-2.2 6.74-4.87 13.68-8.01 20.81zM119.22 31.84c0-7.72 2.76-14.92 8.28-21.6 5.52-6.68 12.43-10.87 20.73-12.57.18 1.1.27 2.05.27 2.85 0 7.6-2.89 14.86-8.67 21.78-5.78 6.92-12.87 11.04-21.27 12.36-.24-.96-.34-1.9-.34-2.82z" />
          </svg>
          <div className="flex flex-col text-left">
            <span className="font-mono text-[9px] tracking-wider text-white/50 uppercase leading-none">
              Download .pkpass
            </span>
            <span className="font-sans text-sm font-bold text-white tracking-wide leading-tight">
              {isGenerating ? 'Packaging Pass...' : 'Download Apple Wallet File (.pkpass)'}
            </span>
          </div>
          {downloadSuccess && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto animate-bounce" />
          )}
        </button>

        {/* Live Web Pass for iPhone Button */}
        <a
          href={`/?tab=cards&member=${encodeURIComponent(member.memberNumber)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3E101B] to-[#250A11] hover:from-[#4E1422] hover:to-[#2F0D16] border border-[#C6A052]/50 text-[#F5E6CA] text-xs font-mono font-bold shadow-md cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E5C378]" />
          <span>Save to iPhone (Safari: Share → Add to Home Screen)</span>
        </a>

        {/* Send Pass / Share Actions Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onOpenSendModal?.()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2A0F17] hover:bg-[#38141F] text-[#C6A052] border border-[#C6A052]/40 text-xs font-semibold tracking-wide transition-all shadow-md active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4 text-[#C6A052]" />
            Send Member Pass
          </button>

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/80 border border-white/10 text-xs font-semibold tracking-wide transition-all active:scale-[0.98]"
          >
            <RotateCw className="w-4 h-4 text-white/60" />
            {isFlipped ? 'Show Front' : 'Club Rules'}
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pass downloaded! On iPhone, open the file or use "Add to Home Screen" for instant door access.</span>
          </div>
        )}
      </div>
    </div>
  );
};
