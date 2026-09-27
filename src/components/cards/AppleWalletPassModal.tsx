import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Share2,
  Info,
  RotateCcw,
  Check,
  Mail,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Member } from '../../types';
import { downloadAppleWalletPass, buildPassJson } from '../../services/appleWallet';
import { clubStore } from '../../services/storage';
import { generateSignedMemberToken } from '../../services/security';

interface AppleWalletPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  qrDataUrl?: string;
  qrToken?: string;
  secondsRemaining?: number;
  onOpenSendModal?: () => void;
}

export const AppleWalletPassModal: React.FC<AppleWalletPassModalProps> = ({
  isOpen,
  onClose,
  member,
  qrDataUrl: initialQrDataUrl,
  qrToken: initialQrToken,
  secondsRemaining: initialSecondsRemaining = 60,
  onOpenSendModal,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [computedQrUrl, setComputedQrUrl] = useState<string>(initialQrDataUrl || '');
  const [computedToken, setComputedToken] = useState<string>(initialQrToken || '');
  const [computedRemaining, setComputedRemaining] = useState<number>(initialSecondsRemaining);

  useEffect(() => {
    if (!isOpen || !member) return;

    if (initialQrDataUrl && initialQrToken) {
      setComputedQrUrl(initialQrDataUrl);
      setComputedToken(initialQrToken);
      return;
    }

    const tokenObj = generateSignedMemberToken(member.id);
    setComputedToken(tokenObj.token);
    setComputedRemaining(tokenObj.secondsRemaining);

    QRCode.toDataURL(tokenObj.token, {
      width: 280,
      margin: 1,
      color: {
        dark: '#161012',
        light: '#F5E6CA',
      },
    })
      .then((url) => setComputedQrUrl(url))
      .catch((err) => console.error('Apple Wallet QR generation error:', err));
  }, [isOpen, member?.id, initialQrDataUrl, initialQrToken]);

  if (!isOpen || !member) return null;

  const qrDataUrl = computedQrUrl || initialQrDataUrl || '';
  const qrToken = computedToken || initialQrToken || member.memberNumber;
  const secondsRemaining = computedRemaining;

  const memberSinceYear = new Date(member.appliedAt).getFullYear();

  const handleDownloadPkpass = async () => {
    try {
      setIsDownloading(true);
      await downloadAppleWalletPass(member, qrToken);
      setIsDownloading(false);
      setDownloadSuccess(true);

      const staff = clubStore.getCurrentStaff();
      clubStore.addAuditLog({
        actorId: staff.id,
        actorName: staff.name,
        actorRole: staff.role,
        action: 'DOWNLOAD_APPLE_WALLET_PASS',
        targetType: 'member',
        targetId: member.id,
        targetName: member.fullName,
        newValue: `.pkpass generated for ${member.memberNumber}`,
        reason: 'Apple Wallet pass downloaded to client device.',
      });

      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download .pkpass:', err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#121114] border border-[#581625] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] animate-fadeIn">
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-[#181518] border-b border-[#2C0E17] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Apple Wallet Icon badge */}
            <div className="w-8 h-8 rounded-xl bg-black border border-white/20 flex items-center justify-center text-white shadow-md">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
                Apple Wallet Pass
              </h2>
              <div className="text-[11px] font-mono text-[#C6A052]">
                Official PassKit Card · 23 Frith Street Soho
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Flip card button */}
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="p-2 rounded-xl bg-[#221C20] hover:bg-[#2C2429] border border-white/10 text-amber-200 text-xs font-mono flex items-center gap-1 transition-all active:scale-95"
              title="Flip to view back of pass"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isFlipped ? 'Front' : 'Back Details'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#221C20] hover:bg-[#34111C] text-stone-400 hover:text-white transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Interactive Apple Wallet Pass Viewport */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-[#09080A] overflow-y-auto">
          {/* Card perspective container */}
          <div className="w-full max-w-sm perspective-[1200px]">
            <div
              className={`relative w-full rounded-3xl bg-[#141215] border-2 border-[#C6A052]/70 shadow-2xl transition-all duration-500 transform-style-preserve-3d overflow-hidden ${
                isFlipped ? 'rotate-y-180 min-h-[460px]' : 'min-h-[480px]'
              }`}
            >
              {/* FRONT OF APPLE WALLET PASS */}
              <div
                className={`w-full h-full p-5 sm:p-6 flex flex-col justify-between backface-hidden ${
                  isFlipped ? 'hidden' : 'block'
                }`}
              >
                {/* Pass Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-[#C6A052] bg-[#1C1216] flex items-center justify-center text-[#E5C378] font-serif font-bold text-sm">
                      J
                    </div>
                    <div>
                      <div className="font-serif text-xl font-bold tracking-wider text-[#E5C378]">
                        JONNY&apos;S
                      </div>
                      <div className="text-[9px] font-mono tracking-[2px] uppercase text-white/40">
                        23 Frith Street · Soho
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[9px] font-mono uppercase text-stone-400">PASS TYPE</div>
                    <div className="text-xs font-mono font-bold text-[#C6A052]">MEMBER</div>
                  </div>
                </div>

                {/* Primary Field: Member Name */}
                <div className="mt-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#C6A052]">
                    MEMBER NAME
                  </div>
                  <div className="font-serif text-2xl font-bold text-white tracking-wide truncate">
                    {member.fullName}
                  </div>
                  <div className="text-xs text-stone-300 font-mono mt-0.5 truncate">
                    {member.hospitalityRole} · {member.employer}
                  </div>
                </div>

                {/* Secondary Row: Member Number & Status */}
                <div className="grid grid-cols-3 gap-2 my-3 py-2.5 px-3 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <div className="text-[9px] font-mono uppercase text-stone-400">ID NUMBER</div>
                    <div className="text-xs font-mono font-bold text-[#E5C378]">
                      {member.memberNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase text-stone-400">STATUS</div>
                    <div
                      className={`text-xs font-mono font-bold uppercase ${
                        member.status === 'active'
                          ? 'text-emerald-400'
                          : member.status === 'waiting_48_hours'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {member.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase text-stone-400">SINCE</div>
                    <div className="text-xs font-mono text-stone-200">
                      {memberSinceYear}
                    </div>
                  </div>
                </div>

                {/* Apple Wallet QR Barcode Box */}
                <div className="my-2 bg-[#F6EBD9] p-3 rounded-2xl flex flex-col items-center justify-center border border-[#C6A052] shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Apple Wallet Member QR"
                      className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-xs font-mono text-stone-800">
                      Generating Pass Token...
                    </div>
                  )}
                  <div className="mt-1 text-[10px] font-mono text-stone-800 text-center tracking-wider font-semibold">
                    {member.memberNumber} · ROTATING TOKEN
                  </div>
                </div>

                {/* Auxiliary Details */}
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mt-1">
                  <span>Guest Right: <strong>Max 2 Guests</strong></span>
                  <span className="text-[#C6A052]">Expires: {secondsRemaining}s</span>
                </div>

                {/* Flip affordance button at bottom right */}
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[9px] font-mono text-white/40">
                    Westminster City Council Licensing Schedule Compliant
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="p-1 rounded-full bg-white/10 text-stone-300 hover:text-white"
                    title="Flip for conditions"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* BACK OF APPLE WALLET PASS */}
              <div
                className={`w-full h-full p-5 sm:p-6 flex flex-col justify-between rotate-y-180 backface-hidden bg-[#100F12] ${
                  isFlipped ? 'block' : 'hidden'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="font-serif text-lg font-bold text-[#E5C378]">
                    Pass Details & Regulations
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="text-xs font-mono text-[#C6A052] hover:underline"
                  >
                    Done
                  </button>
                </div>

                <div className="space-y-3.5 my-3 text-left overflow-y-auto max-h-[360px] pr-1">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#C6A052]">
                      WESTMINSTER LICENSING REGULATIONS
                    </div>
                    <div className="text-xs text-stone-300 leading-snug mt-0.5">
                      Admissions after 01:00 AM are restricted strictly to verified members and their signed-in bona fide guests. Max 2 guests per member. Capacity strictly limited to 80 persons.
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#C6A052]">
                      01:30 AM ADMISSIONS CURFEW
                    </div>
                    <div className="text-xs text-stone-300 leading-snug mt-0.5">
                      No new admissions or guest registrations after 01:30 AM. Only returning terrace smokers with verified door stamps may re-enter.
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#C6A052]">
                      VENUE LOCATION & CONTACT
                    </div>
                    <div className="text-xs text-stone-300 leading-snug mt-0.5">
                      Jonny&apos;s Soho, 23 Frith Street, Soho, London W1D 4RR
                    </div>
                    <div className="text-[11px] font-mono text-stone-400">
                      reception@jonnys-soho.co.uk · +44 (0)20 7437 2300
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#C6A052]">
                      HOUSE CODE & CONDUCT
                    </div>
                    <div className="text-xs text-stone-300 leading-snug mt-0.5">
                      Smart casual dress code. Discretion and respect for Soho neighbours required upon entering and leaving the venue.
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-center">
                  <button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="w-full py-2 bg-[#1C1619] hover:bg-[#2A1E24] border border-[#581625] text-xs font-mono text-[#E5C378] rounded-xl transition-colors"
                  >
                    Return to Front QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Official "Add to Apple Wallet" Action Badge */}
          <div className="w-full max-w-sm mt-5 space-y-2.5">
            <button
              type="button"
              onClick={handleDownloadPkpass}
              disabled={isDownloading}
              className="w-full py-3.5 px-5 rounded-2xl bg-black hover:bg-neutral-900 border border-white/20 text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl group cursor-pointer"
            >
              {/* Official Apple Logo SVG */}
              <svg className="w-6 h-6 fill-current text-white shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] font-sans uppercase tracking-wider text-stone-400 leading-none">
                  Add to
                </div>
                <div className="text-base font-semibold tracking-tight text-white leading-tight">
                  Apple Wallet
                </div>
              </div>
              <Download className="w-4 h-4 text-stone-400 ml-auto group-hover:text-white transition-colors" />
            </button>

            {downloadSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center justify-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4 shrink-0" />
                <span>Pass package (.pkpass) downloaded successfully!</span>
              </div>
            )}

            {/* Secondary actions: Send Pass / Share */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSendModal) onOpenSendModal();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#1A1417] hover:bg-[#251A1F] border border-[#3E101B] text-stone-200 text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Mail className="w-3.5 h-3.5 text-[#C6A052]" />
                <span>Send Pass Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `JONNY'S Membership Pass - ${member.fullName}`,
                      text: `Digital membership pass for Jonny's Soho at 23 Frith Street (${member.memberNumber})`,
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Pass link copied to clipboard!');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-[#1A1417] hover:bg-[#251A1F] border border-[#3E101B] text-stone-200 text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-400" />
                <span>Share Pass Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer guidance note */}
        <div className="px-5 py-3 bg-[#120F12] border-t border-[#2C0E17] flex items-center justify-between text-[11px] text-stone-400 font-mono">
          <span>Tap pass to view reverse side</span>
          <span className="text-[#C6A052]">iOS & macOS Compatible</span>
        </div>
      </div>
    </div>
  );
};
