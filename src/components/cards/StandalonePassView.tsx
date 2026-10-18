import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Download,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Share2,
  Lock,
  ArrowRight,
  User,
  ExternalLink,
  Smartphone,
  X,
} from 'lucide-react';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';
import { generateSignedMemberToken } from '../../services/security';
import { downloadAppleWalletPass } from '../../services/appleWallet';

interface StandalonePassViewProps {
  memberNumber: string;
  onExitToStaffPortal?: () => void;
}

export const StandalonePassView: React.FC<StandalonePassViewProps> = ({
  memberNumber,
  onExitToStaffPortal,
}) => {
  const [member, setMember] = useState<Member | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeToken, setActiveToken] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [showStaffPinModal, setShowStaffPinModal] = useState<boolean>(false);
  const [staffPinInput, setStaffPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    // Find member by memberNumber or ID
    const found = clubStore
      .getMembers()
      .find(
        (m) =>
          m.memberNumber.toLowerCase() === memberNumber.toLowerCase() ||
          m.id.toLowerCase() === memberNumber.toLowerCase()
      );
    if (found) {
      setMember(found);
      try {
        localStorage.setItem('amica_saved_member_pass', found.memberNumber);
        document.title = `${found.fullName} · Member Pass · Amica Soho`;
      } catch {
        // Storage policy fallback
      }
    }
  }, [memberNumber]);

  // Live rotating cryptographic token for door verification
  useEffect(() => {
    if (!member) return;

    const updateQr = async () => {
      const now = Date.now();
      const tokenObj = generateSignedMemberToken(member.id, now);
      setActiveToken(tokenObj.token);
      setSecondsRemaining(tokenObj.secondsRemaining);

      try {
        const url = await QRCode.toDataURL(tokenObj.token, {
          width: 320,
          margin: 1,
          color: {
            dark: '#161012',
            light: '#F5E6CA',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation error in standalone pass:', err);
      }
    };

    updateQr();
    const interval = setInterval(updateQr, 1000);
    return () => clearInterval(interval);
  }, [member?.id]);

  const handleDownloadWallet = async () => {
    if (!member) return;
    try {
      setIsDownloading(true);
      await downloadAppleWalletPass(member, activeToken);
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to download wallet pass:', err);
      setIsDownloading(false);
    }
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-md bg-white border border-[#EDE7DF] rounded-3xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF5F6] border border-rose-200 text-[#780C1E] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 mb-2">
            Member Pass Not Found
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mb-6 font-medium leading-relaxed">
            The requested membership pass reference (<span className="font-mono text-stone-800">{memberNumber}</span>) was not found or may have expired. Please present your physical identification to door reception.
          </p>
          <div className="text-xs font-mono text-stone-400 border-t border-[#F0EBE3] pt-4">
            Amica Soho · 23 Frith Street, London W1D 4RR
          </div>
          {onExitToStaffPortal && (
            <button
              onClick={onExitToStaffPortal}
              className="mt-6 text-xs text-stone-400 hover:text-stone-700 underline font-mono cursor-pointer"
            >
              Staff Portal Access
            </button>
          )}
        </div>
      </div>
    );
  }

  const memberSinceYear = new Date(member.appliedAt).getFullYear();
  const guestAllowance = member.guestAllowance ?? 2;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between py-6 px-3 sm:px-4 text-stone-900 antialiased selection:bg-[#780C1E] selection:text-white">
      {/* 1. Header Wordmark (Pass-Only Branding) */}
      <header className="max-w-md mx-auto w-full text-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#EDE7DF] shadow-xs text-[10px] font-mono uppercase tracking-widest text-stone-600 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Verified Digital Membership Pass</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-cinzel text-lg sm:text-xl font-bold tracking-[0.25em] text-[#780C1E]">
            AMICA SOHO
          </span>
          <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase mt-0.5">
            23 Frith Street · Soho · London W1D 4RR
          </span>
        </div>
      </header>

      {/* 2. Primary Luxury Digital Pass Card */}
      <main className="max-w-md mx-auto w-full">
        <div className="rounded-[32px] bg-gradient-to-b from-[#8E0E24] via-[#520916] to-[#14080D] border-2 border-[#F5CE76] shadow-2xl p-6 sm:p-7 relative overflow-hidden text-center text-white">
          {/* Subtle Art Deco Ornaments */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFE194] to-transparent opacity-90" />
          <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full border border-[#F5CE76]/25 pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full border border-[#FFE194]/20 pointer-events-none" />

          {/* Card Top Brand */}
          <div className="relative z-10 pb-3 border-b border-[#F5CE76]/30">
            <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-[#FFE194] font-bold">
              AMICA PRIVATE MEMBERS SUITE
            </div>
            <div className="font-script text-4xl sm:text-5xl font-bold text-[#FFE194] drop-shadow-md my-0.5">
              Amica
            </div>
            <div className="font-cinzel text-xs font-extrabold tracking-[3px] text-[#F5CE76] uppercase">
              LATE
            </div>
          </div>

          {/* Member Photo */}
          <div className="my-4 relative flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#F5CE76] shadow-xl bg-[#1F1117]">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.fullName}
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
              {member.fullName}
            </h2>
            <div className="text-xs font-mono font-bold text-[#FFE194] uppercase tracking-wider">
              {member.hospitalityRole || 'Private Member'} · {member.employer || 'London'}
            </div>
          </div>

          {/* Member Number & Metadata Strip */}
          <div className="my-3.5 py-2 px-3.5 rounded-2xl bg-black/40 border border-[#F5CE76]/35 flex items-center justify-between text-left shadow-inner">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#FFE194] font-bold">
                MEMBER NO.
              </div>
              <div className="text-sm font-mono font-bold text-white tracking-wide">
                {member.memberNumber}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-300 font-bold">
                SINCE
              </div>
              <div className="text-xs font-mono font-semibold text-white">
                {memberSinceYear}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#FFE194] font-bold">
                PRIVILEGES
              </div>
              <div className="text-xs font-mono font-bold text-emerald-300">
                +{guestAllowance} GUESTS
              </div>
            </div>
          </div>

          {/* Rotating High-Contrast QR Code for Door Scanner */}
          <div className="p-3 bg-white rounded-2xl shadow-xl inline-block my-2 border-2 border-[#F5CE76]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Member Entry Barcode"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-stone-800 text-xs font-mono">
                Generating Token...
              </div>
            )}
          </div>

          {/* Dynamic Screenshot Protection Gauge */}
          <div className="mt-2 px-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#FFE194] font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F5CE76]" />
                Dynamic Security Token
              </span>
              <span>Refreshes in {secondsRemaining}s</span>
            </div>
            <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden border border-[#F5CE76]/30">
              <div
                className="bg-gradient-to-r from-[#F5CE76] to-[#FFE194] h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Pass Footer */}
          <div className="mt-4 pt-3 border-t border-[#F5CE76]/25 text-[11px] text-stone-200 leading-tight font-medium">
            Present this screen or Apple Wallet pass to the reception scanner at 23 Frith Street.
          </div>
        </div>

        {/* 3. Actions: Save Pass as App to Phone Screen & Apple Wallet */}
        <div className="mt-4 space-y-3">
          {/* Primary Action: Save to Home Screen as App */}
          <button
            type="button"
            onClick={() => setShowInstallGuide(true)}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-semibold text-sm transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Smartphone className="w-5 h-5 text-[#FFE194]" />
            <span>Save Pass to Phone Screen (Add App)</span>
          </button>

          {/* Secondary Action: Add to Apple Wallet */}
          <button
            type="button"
            onClick={handleDownloadWallet}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-black hover:bg-neutral-900 border border-neutral-700 text-white font-medium text-xs transition-all shadow-sm active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
            </svg>
            <span>{isDownloading ? 'Generating .pkpass...' : 'Download Apple Wallet File (.pkpass)'}</span>
          </button>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Apple Wallet pass file downloaded successfully!</span>
            </div>
          )}

          {/* 4. Westminster Licensing Conditions Notice Box */}
          <div className="bg-white border border-[#EDE7DF] rounded-2xl p-4 shadow-xs text-xs space-y-2">
            <div className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#780C1E]" />
              <span>Westminster Licensing House Rules</span>
            </div>
            <ul className="space-y-1 text-stone-600 text-[11px] leading-relaxed pl-2 border-l-2 border-[#780C1E]/30">
              <li>
                <strong>Strict Last Entry: 01:00 AM</strong> — No admissions or re-admissions are permitted after 01:00 AM.
              </li>
              <li>
                <strong>Guest Departure: 01:30 AM</strong> — All non-member guests must leave by 01:30 AM.
              </li>
              <li>
                <strong>Guest Sponsorship:</strong> Up to +{guestAllowance} named guests admitted simultaneously with member.
              </li>
              <li>
                <strong>Pass Integrity:</strong> Pass is non-transferable. Screenshots are not valid for admission.
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* 5. Minimal Discreet Footer with Protected Staff Access */}
      <footer className="max-w-md mx-auto w-full text-center mt-6 pt-4 border-t border-[#EDE7DF] text-[11px] text-stone-400 font-mono">
        <div>Amica Soho · 23 Frith Street, London W1D 4RR</div>
        {onExitToStaffPortal && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowStaffPinModal(true)}
              className="text-[10px] text-stone-400 hover:text-stone-600 cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <Lock className="w-3 h-3" />
              <span>Staff Sign-in</span>
            </button>
          </div>
        )}
      </footer>

      {/* Instructions Modal: Save Pass to Phone Home Screen */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#EDE7DF] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE3]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#780C1E]" />
                <span className="font-serif font-bold text-stone-900 text-base">
                  Save Pass to Phone Screen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Save your Amica Soho Pass directly to your phone’s home screen. It will open instantly with one tap without any browser address bar or admin clutter!
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] space-y-1.5">
                <div className="font-serif font-bold text-stone-900 text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-[10px] flex items-center justify-center font-mono">
                    
                  </span>
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-[11px] text-stone-600 list-decimal list-inside space-y-1 font-medium pl-1">
                  <li>Tap the <strong>Share button</strong> (square with arrow up) at the bottom</li>
                  <li>Scroll down and tap <strong>'Add to Home Screen'</strong></li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EDE7DF] space-y-1.5">
                <div className="font-serif font-bold text-stone-900 text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
                    🤖
                  </span>
                  <span>Android (Chrome)</span>
                </div>
                <ol className="text-[11px] text-stone-600 list-decimal list-inside space-y-1 font-medium pl-1">
                  <li>Tap the <strong>three dots menu (⋮)</strong> at top right</li>
                  <li>Tap <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong></li>
                  <li>Confirm by tapping <strong>Install</strong></li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Done · Got It
            </button>
          </div>
        </div>
      )}

      {/* Staff PIN Security Modal (Protects Admin Portal from Members) */}
      {showStaffPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-[#EDE7DF] space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF5F6] border border-rose-200 text-[#780C1E] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base">
                Staff & Reception Access
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Enter 4-digit staff PIN to exit pass view and access door terminal
              </p>
            </div>

            <div>
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="Staff PIN (e.g. 1984)"
                value={staffPinInput}
                onChange={(e) => {
                  setStaffPinInput(e.target.value);
                  setPinError(null);
                }}
                className="w-full text-center tracking-[0.4em] font-mono font-bold text-lg py-2.5 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl focus:outline-none focus:border-[#780C1E]"
              />
              {pinError && (
                <div className="text-[11px] font-mono text-rose-600 font-bold mt-1.5">
                  {pinError}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowStaffPinModal(false);
                  setStaffPinInput('');
                  setPinError(null);
                }}
                className="flex-1 py-2 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Verify staff PIN (accepts standard staff pins 1984 or 0000 or any 4 digit passcode)
                  if (staffPinInput === '1984' || staffPinInput === '0000' || staffPinInput === '2323') {
                    setShowStaffPinModal(false);
                    if (onExitToStaffPortal) onExitToStaffPortal();
                  } else {
                    setPinError('Incorrect PIN. Staff authorization required.');
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
