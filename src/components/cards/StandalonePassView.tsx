import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Share2,
  Lock,
  User,
  Smartphone,
  X,
  MessageCircle,
  Award,
  Fingerprint,
} from 'lucide-react';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';
import { generateSignedMemberToken } from '../../services/security';
import { downloadAppleWalletPass } from '../../services/appleWallet';
import { FancyMemberQRCode } from './FancyMemberQRCode';

interface StandalonePassViewProps {
  memberNumber: string;
}

export const StandalonePassView: React.FC<StandalonePassViewProps> = ({ memberNumber }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [activeToken, setActiveToken] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

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

    const updateQr = () => {
      const now = Date.now();
      const tokenObj = generateSignedMemberToken(member.id, now);
      setActiveToken(tokenObj.token);
      setSecondsRemaining(tokenObj.secondsRemaining);
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
      <div className="min-h-screen bg-[#080507] text-[#FAF7F2] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-sm bg-[#140A0F] border border-[#DFBE7B]/40 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#5A0D1C]/50 border border-[#E8CCA0]/30 text-[#E8CCA0] flex items-center justify-center mx-auto mb-4 shadow-inner">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
            Member Pass Not Found
          </h1>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed">
            The pass reference (<span className="font-mono text-[#E8CCA0] font-bold">{memberNumber}</span>) was not located. Please present photo ID at reception.
          </p>
          <div className="text-[11px] font-mono text-[#DFBE7B]/80 border-t border-white/10 pt-4">
            Amica Soho · 23 Frith Street, London W1D 4RR
          </div>
        </div>
      </div>
    );
  }

  const memberSinceYear = new Date(member.appliedAt).getFullYear();
  const guestAllowance = member.guestAllowance ?? 2;
  const whatsappUrl = `https://wa.me/442074372323?text=${encodeURIComponent(
    `Hello Amica Soho Concierge, I am getting in touch regarding my membership pass (${member.memberNumber}) for ${member.fullName}.`
  )}`;

  return (
    <div className="min-h-screen bg-[#080507] text-[#FDFBF7] flex flex-col justify-between py-4 sm:py-6 px-3 sm:px-4 antialiased selection:bg-[#780C1E] selection:text-[#FFEAA7]">
      {/* 1. Header Wordmark with Official Amica Soho Logo */}
      <header className="max-w-[390px] mx-auto w-full text-center mb-3">
        {/* Verified Pass Chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#180E13] border border-[#DFBE7B]/40 shadow-xs text-[10px] font-mono uppercase tracking-widest text-[#E8CCA0] mb-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Official Digital Membership Pass</span>
        </div>

        {/* Official Amica Soho Header Logo from amicasoho.com */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="/images/amica-header-logo.png"
            srcSet="/images/amica-header-logo.png 1x, /images/amica-header-logo-2x.png 2x"
            alt="AMICA Soho"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md mx-auto"
          />
          <div className="flex items-center gap-2 mt-1.5 text-[#DFBE7B]">
            <span className="w-4 h-[1px] bg-[#DFBE7B]/70" />
            <span className="font-sans text-[8.5px] font-medium tracking-[0.24em] uppercase text-[#E8CCA0]/90">
              23 Frith Street · Soho · London W1
            </span>
            <span className="w-4 h-[1px] bg-[#DFBE7B]/70" />
          </div>
        </div>
      </header>

      {/* 2. Primary Luxury Digital Pass Card with Security Hallmarks */}
      <main className="max-w-[390px] mx-auto w-full">
        <div className="rounded-[32px] bg-gradient-to-b from-[#4A0713] via-[#2A050D] to-[#0E0609] border-2 border-[#DFBE7B] shadow-2xl p-5 sm:p-6 relative overflow-hidden text-center text-white">
          {/* SECURITY HALLMARK 1: Animated Iridescent Holographic Foil Ribbon */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-[#FFEAA7] via-[#DFBE7B] via-[#E8CCA0] to-transparent opacity-90 animate-pulse" />

          {/* SECURITY HALLMARK 2: Fine Guilloche Wave Background Watermark */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07] stroke-[#DFBE7B]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 600"
            fill="none"
          >
            <circle cx="200" cy="180" r="140" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="200" cy="180" r="170" strokeWidth="0.8" />
            <circle cx="200" cy="180" r="200" strokeWidth="0.5" strokeDasharray="6 2" />
            <path
              d="M-50,150 Q100,50 200,150 T450,150 M-50,220 Q100,120 200,220 T450,220 M-50,290 Q100,190 200,290 T450,290 M-50,360 Q100,260 200,360 T450,360"
              strokeWidth="0.75"
            />
            <path
              d="M-50,100 Q100,200 200,100 T450,100 M-50,170 Q100,270 200,170 T450,170 M-50,240 Q100,340 200,240 T450,240 M-50,310 Q100,410 200,310 T450,310"
              strokeWidth="0.75"
            />
          </svg>

          {/* Card Top Brand & Westminster Seal */}
          <div className="relative z-10 pb-3 border-b border-[#DFBE7B]/30 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[8px] font-mono tracking-[0.24em] uppercase text-[#E8CCA0] font-bold">
                PRIVATE MEMBERS SUITE
              </div>
              <div className="font-cinzel text-xs font-black tracking-[0.28em] text-[#FFEAA7] uppercase mt-0.5">
                AMICA SOHO
              </div>
            </div>

            {/* SECURITY HALLMARK 3: Official Licensing Hallmark Stamp */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-[#DFBE7B]/40 text-[8px] font-mono text-[#E8CCA0] shadow-inner">
              <ShieldCheck className="w-3 h-3 text-[#DFBE7B]" />
              <span>WESTMINSTER S.2</span>
            </div>
          </div>

          {/* SECURITY HALLMARK 4: Micro-text Security Ribbon */}
          <div className="my-1.5 overflow-hidden whitespace-nowrap text-[6.5px] font-mono text-[#DFBE7B]/60 tracking-[0.2em] uppercase select-none">
            ✦ AMICA SOHO ✦ 23 FRITH STREET ✦ VERIFIED LICENSED PASS ✦ NON-TRANSFERABLE ✦ 2003 ACT COMPLIANT ✦
          </div>

          {/* Member Photo (Enlarged, Premium Dual-Ring Gold Frame) */}
          <div className="my-3 relative flex justify-center">
            <div className="relative">
              {/* Outer Metallic Bevel Glow */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-[#DFBE7B] via-[#FFEAA7] to-[#9D7E54] shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#14080D] bg-[#1F1117] relative">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#E8CCA0]">
                      <User className="w-14 h-14" />
                    </div>
                  )}
                </div>
              </div>

              {/* SECURITY HALLMARK 5: Gold Embossed Verified Crest Badge */}
              <div className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#5A0D1C] to-[#2A050D] border-2 border-[#DFBE7B] shadow-lg">
                <Award className="w-3.5 h-3.5 text-[#FFEAA7]" />
                <span className="text-[9px] font-mono font-bold tracking-wider text-[#FFEAA7] uppercase">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Member Name & Credentials */}
          <div className="space-y-0.5 mt-2">
            <h2 className="font-serif text-2xl sm:text-[26px] font-bold text-white tracking-wide leading-tight">
              {member.fullName}
            </h2>
            <div className="text-[11px] font-mono font-semibold text-[#DFBE7B] uppercase tracking-wider">
              {member.hospitalityRole || 'Private Member'}
              {member.employer ? ` · ${member.employer}` : ' · Soho London'}
            </div>
          </div>

          {/* Member Number & Metadata Strip */}
          <div className="my-3 py-2 px-3 rounded-2xl bg-black/50 border border-[#DFBE7B]/35 flex items-center justify-between text-left shadow-inner">
            <div>
              <div className="text-[8.5px] font-mono uppercase text-[#DFBE7B] font-bold tracking-wider">
                MEMBER NO.
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide">
                {member.memberNumber}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] font-mono uppercase text-stone-400 font-bold tracking-wider">
                SINCE
              </div>
              <div className="text-xs font-mono font-semibold text-white">
                {memberSinceYear}
              </div>
            </div>
            <div>
              <div className="text-[8.5px] font-mono uppercase text-[#DFBE7B] font-bold tracking-wider">
                PRIVILEGES
              </div>
              <div className="text-xs font-mono font-bold text-emerald-300">
                +{guestAllowance} GUESTS
              </div>
            </div>
          </div>

          {/* FANCY QR CODE: Custom Rounded Dots, Art Deco Finders & Amica Center Crest */}
          <div className="my-2.5 flex flex-col items-center justify-center">
            <FancyMemberQRCode
              text={activeToken || `AMICA-${member.memberNumber}-${Date.now()}`}
              size={210}
            />
          </div>

          {/* SECURITY HALLMARK 6: Dynamic Cryptographic Anti-Screenshot Bar */}
          <div className="mt-1 px-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#E8CCA0] font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-[#DFBE7B]" />
                <span>Anti-Screenshot Guard</span>
              </span>
              <span className="text-[10px] text-[#FFEAA7]">Refreshes in {secondsRemaining}s</span>
            </div>
            <div className="w-full bg-black/70 h-2 rounded-full overflow-hidden border border-[#DFBE7B]/35 p-[1px]">
              <div
                className="bg-gradient-to-r from-[#DFBE7B] via-[#FFEAA7] to-[#E8CCA0] h-full rounded-full transition-all duration-1000 ease-linear shadow-xs"
                style={{ width: `${(secondsRemaining / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Pass Footer Guidance */}
          <div className="mt-3 pt-2.5 border-t border-[#DFBE7B]/20 text-[10px] text-stone-300 leading-snug font-medium font-sans">
            Present this digital screen to reception scanners at 23 Frith Street for automated entry.
          </div>
        </div>

        {/* 3. Action Buttons Section */}
        <div className="mt-3.5 space-y-2.5">
          {/* BUTTON A: WHATSAPP CONCIERGE BUTTON (Need to get in touch) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-[#132219] hover:bg-[#1A2D22] border border-[#25D366]/50 text-[#E8F8EE] transition-all shadow-md active:scale-98 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <MessageCircle className="w-4 h-4 fill-white text-white" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5 text-white">
                <span>Concierge WhatsApp</span>
                <span className="text-[10px] font-mono font-normal text-emerald-400">· Need to get in touch?</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-200/80 truncate">
                Direct line for table bookings & guest assistance
              </div>
            </div>
          </a>

          {/* BUTTON B: Save Pass as App to Phone Screen */}
          <button
            type="button"
            onClick={() => setShowInstallGuide(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-[#5A0D1C] hover:bg-[#780C1E] border border-[#DFBE7B]/50 text-white font-semibold text-xs sm:text-sm transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-[#FFEAA7]" />
            <span>Save Pass to Phone Screen (Add App)</span>
          </button>

          {/* BUTTON C: Download Apple Wallet .pkpass */}
          <button
            type="button"
            onClick={handleDownloadWallet}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-black/80 hover:bg-neutral-900 border border-neutral-700 text-stone-200 font-medium text-xs transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.19-9.57-11.05-20.44-14.57-32.61-3.52-12.18-5.28-23.71-5.28-34.6 0-14.03 3.69-25.79 11.08-35.26 7.39-9.48 16.64-14.34 27.75-14.6 5.33 0 11.25 1.45 17.75 4.35 6.5 2.89 10.37 4.39 11.61 4.5 1.52-.22 5.58-1.78 12.19-4.67 6.6-2.9 12.15-4.22 16.64-3.98 12.83.63 22.84 5.24 30.03 13.84-11.31 6.86-16.85 16.32-16.62 28.38.22 9.46 3.91 17.38 11.08 23.77 7.17 6.39 15.65 10.12 25.43 11.2-.87 2.73-1.85 5.5-2.93 8.32zM119.22 33.15c0-7.72 2.72-15.01 8.16-21.87 5.43-6.85 12.18-11.02 20.23-12.51.22 1.3.33 2.5.33 3.59 0 7.6-2.83 14.9-8.49 21.89-5.65 6.99-12.62 11.16-20.9 12.51-.43-1.09-.64-2.18-.64-3.27z" />
            </svg>
            <span>{isDownloading ? 'Generating .pkpass...' : 'Download Apple Wallet File (.pkpass)'}</span>
          </button>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-400 text-emerald-300 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Apple Wallet pass file downloaded successfully!</span>
            </div>
          )}

          {/* 4. Westminster Licensing Conditions Notice Box */}
          <div className="bg-[#12090E] border border-[#DFBE7B]/30 rounded-2xl p-3.5 shadow-sm text-xs space-y-1.5">
            <div className="font-serif font-bold text-[#E8CCA0] text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#DFBE7B]" />
              <span>Westminster Licensing House Rules</span>
            </div>
            <ul className="space-y-1 text-stone-300 text-[10.5px] leading-relaxed pl-2 border-l-2 border-[#DFBE7B]/40">
              <li>
                <strong className="text-white">Strict Last Entry: 01:00 AM</strong> — No admissions permitted after 01:00 AM.
              </li>
              <li>
                <strong className="text-white">Guest Curfew: 01:30 AM</strong> — All guests must depart by 01:30 AM.
              </li>
              <li>
                <strong className="text-white">Guest Allowance:</strong> Up to +{guestAllowance} named guests admitted simultaneously with member.
              </li>
              <li>
                <strong className="text-white">Integrity:</strong> Non-transferable. Screenshots are strictly rejected.
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* 5. Minimal Discreet Clean Footer (Staff login link completely removed) */}
      <footer className="max-w-[390px] mx-auto w-full text-center mt-5 pt-3 border-t border-white/10 text-[10.5px] text-stone-500 font-mono">
        <div>Amica Soho · 23 Frith Street, London W1D 4RR</div>
        <div className="text-[9px] text-[#DFBE7B]/50 mt-0.5">
          Westminster City Council Licensing Act 2003 Registered
        </div>
      </footer>

      {/* Instructions Modal: Save Pass to Phone Home Screen */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#140A0F] rounded-3xl p-6 shadow-2xl border border-[#DFBE7B]/50 space-y-4 text-[#FDFBF7]">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#FFEAA7]" />
                <span className="font-serif font-bold text-white text-base">
                  Save Pass to Phone Screen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Save your Amica Soho Pass directly to your phone’s home screen. It will open instantly with one tap like a native app — fast, private, and offline-ready at 23 Frith Street!
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-[#DFBE7B]/30 space-y-1.5">
                <div className="font-serif font-bold text-[#FFEAA7] text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-mono font-bold">
                    
                  </span>
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-[11px] text-stone-300 list-decimal list-inside space-y-1 font-medium pl-1">
                  <li>Tap the <strong>Share icon</strong> (square with arrow up ⎋) at the bottom</li>
                  <li>Scroll down and tap <strong>'Add to Home Screen'</strong> (⊞)</li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-[#DFBE7B]/30 space-y-1.5">
                <div className="font-serif font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
                    🤖
                  </span>
                  <span>Android (Chrome)</span>
                </div>
                <ol className="text-[11px] text-stone-300 list-decimal list-inside space-y-1 font-medium pl-1">
                  <li>Tap the <strong>three dots menu (⋮)</strong> at top right</li>
                  <li>Tap <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong></li>
                  <li>Confirm by tapping <strong>Install</strong></li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-3 rounded-xl bg-[#5A0D1C] hover:bg-[#780C1E] text-white text-xs font-semibold cursor-pointer shadow-md"
            >
              Done · Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
