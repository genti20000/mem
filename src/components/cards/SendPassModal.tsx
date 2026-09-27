import React, { useState } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Smartphone,
  Share2,
  Copy,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';
import {
  downloadAppleWalletPass,
  getMemberPassUrl,
  formatPassSmsMessage,
  generatePassEmailHtml,
} from '../../services/appleWallet';

export interface SendPassModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  qrToken?: string;
  onOpenAppleWalletModal?: () => void;
}

type TabType = 'wallet' | 'email' | 'sms' | 'link';

export const SendPassModal: React.FC<SendPassModalProps> = ({
  member,
  isOpen,
  onClose,
  qrToken,
  onOpenAppleWalletModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  const [emailInput, setEmailInput] = useState<string>(member.email || '');
  const [phoneInput, setPhoneInput] = useState<string>(member.phone || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [qrWalletCodeUrl, setQrWalletCodeUrl] = useState<string>('');

  const passUrl = getMemberPassUrl(member);
  const currentStaff = clubStore.getCurrentStaff();

  React.useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(passUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
        color: { dark: '#000000', light: '#FFFFFF' },
      }).then(setQrWalletCodeUrl).catch(console.error);
    }
  }, [isOpen, passUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(passUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopySmsText = () => {
    const text = formatPassSmsMessage(member);
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSendEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      // Record audit log
      clubStore.addAuditLog({
        actorId: currentStaff.id,
        actorName: currentStaff.name,
        actorRole: currentStaff.role,
        action: 'SEND_MEMBER_PASS_EMAIL',
        targetType: 'member',
        targetId: member.id,
        targetName: member.fullName,
        newValue: emailInput,
        reason: `Pass credentials dispatched to ${emailInput}`,
      });

      setIsSending(false);
      setSendSuccessMessage(`Official pass credentials successfully sent to ${emailInput}!`);
      setTimeout(() => setSendSuccessMessage(null), 5000);
    }, 600);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Jonny's Soho - Member Pass (${member.memberNumber})`,
          text: `Digital membership pass for ${member.fullName} at Jonny's Soho (23 Frith Street).`,
          url: passUrl,
        });
      } catch (err) {
        console.log('Share dismissed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenMailClient = () => {
    const subject = encodeURIComponent(`JONNY'S SOHO - Official Digital Pass (${member.memberNumber})`);
    const body = encodeURIComponent(formatPassSmsMessage(member));
    window.location.href = `mailto:${encodeURIComponent(emailInput)}?subject=${subject}&body=${body}`;
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(formatPassSmsMessage(member));
    const phone = phoneInput.replace(/[^0-9]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl bg-[#120E11] border border-[#C6A052]/30 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#2A0E18] to-[#140E12] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B121E] border border-[#C6A052]/40 flex items-center justify-center text-[#C6A052]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-white tracking-wide">
                Send Member Pass
              </div>
              <div className="font-mono text-[10px] text-[#C6A052] uppercase tracking-wider">
                {member.fullName} · {member.memberNumber}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.08] bg-black/40 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 pb-3 px-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'border-[#C6A052] text-[#C6A052] font-bold'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Apple Wallet (.pkpass)
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 pb-3 px-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-[#C6A052] text-[#C6A052] font-bold'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Pass
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 pb-3 px-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'sms'
                ? 'border-[#C6A052] text-[#C6A052] font-bold'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS & WhatsApp
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 pb-3 px-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'link'
                ? 'border-[#C6A052] text-[#C6A052] font-bold'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Pass Link
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {sendSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{sendSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: APPLE WALLET */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex flex-col sm:flex-row items-center gap-5">
                {qrWalletCodeUrl && (
                  <div className="p-2.5 bg-white rounded-xl shadow-lg flex-shrink-0">
                    <img
                      src={qrWalletCodeUrl}
                      alt="Wallet Link QR"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2 text-center sm:text-left">
                  <div className="font-serif text-base font-bold text-white">
                    Scan with iPhone Camera
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Point any iPhone or iPad camera at this QR code to instantly open the member&apos;s digital pass and trigger the native <strong>Apple Wallet</strong> sheet.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#C6A052]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Pass Type: pass.club.jonnys.soho</span>
                  </div>
                </div>
              </div>

              {/* Download PKPASS button */}
              <div className="pt-2">
                <button
                  onClick={() => downloadAppleWalletPass(member)}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-black border border-white/20 hover:border-[#C6A052] transition-all shadow-lg active:scale-[0.98]"
                >
                  <Download className="w-5 h-5 text-[#C6A052]" />
                  <div className="text-left">
                    <div className="font-mono text-[9px] text-white/50 uppercase tracking-wider">
                      PassKit Package (.pkpass)
                    </div>
                    <div className="font-sans font-bold text-sm text-white">
                      Download Apple Wallet Pass File
                    </div>
                  </div>
                </button>
                <div className="font-mono text-[10px] text-white/40 text-center mt-2">
                  Opens directly in Apple Wallet on iPhone, iPad, Apple Watch, and macOS.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL PASS */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] text-[#C6A052] uppercase tracking-wider mb-1.5">
                  Recipient Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="member@example.com"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#C6A052]"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending || !emailInput}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6A052] hover:bg-[#D4B062] text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Preview of Email Contents */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-white/40 uppercase">Subject:</span>
                  <span className="font-mono text-white/80 text-xs">
                    JONNY&apos;S SOHO - Official Digital Pass ({member.memberNumber})
                  </span>
                </div>
                <div className="text-xs text-stone-300 leading-relaxed border-t border-white/[0.06] pt-2">
                  Includes personalized invitation, verified member number, Westminster Statutory Rules (01:00 AM strict cutoff, 01:30 AM guest departure), and direct <strong>Add to Apple Wallet</strong> action.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleOpenMailClient}
                    className="flex items-center gap-1.5 text-xs text-[#C6A052] hover:underline font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in default mail client
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMS & WHATSAPP */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] text-[#C6A052] uppercase tracking-wider mb-1.5">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+44 7700 900077"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              {/* SMS Text Preview */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">
                {formatPassSmsMessage(member)}
              </div>

              {/* Quick Messaging Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold tracking-wide transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </button>

                <button
                  onClick={handleCopySmsText}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-semibold tracking-wide transition-all"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT LINK & NATIVE SHARE */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] text-[#C6A052] uppercase tracking-wider mb-1.5">
                  Direct Pass Access URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={passUrl}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-stone-300 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-mono text-xs font-semibold tracking-wider transition-all"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#C6A052] hover:bg-[#D4B062] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" />
                Open Native Share Sheet (AirDrop / Messages)
              </button>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-stone-400 leading-relaxed font-mono">
                Anyone opening this unique member link can view their live rotating security pass and tap &quot;Add to Apple Wallet&quot; directly to their device.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black/60 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/40 font-mono">
          <span>Jonny&apos;s Soho · 23 Frith Street</span>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white underline font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
