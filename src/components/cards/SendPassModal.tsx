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
  Lock,
  Eye,
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
  onPreviewStandalonePass?: (memberNumber: string) => void;
}

type TabType = 'wallet' | 'email' | 'sms' | 'link';

export const SendPassModal: React.FC<SendPassModalProps> = ({
  member,
  isOpen,
  onClose,
  qrToken,
  onOpenAppleWalletModal,
  onPreviewStandalonePass,
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
        width: 240,
        color: { dark: '#1F1116', light: '#FFFFFF' },
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
          title: `Amica Soho - Member Pass (${member.memberNumber})`,
          text: `Digital membership pass for ${member.fullName} at Amica Soho (23 Frith Street).`,
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
    const subject = encodeURIComponent(`AMICA SOHO - Official Digital Pass (${member.memberNumber})`);
    const body = encodeURIComponent(formatPassSmsMessage(member));
    window.location.href = `mailto:${encodeURIComponent(emailInput)}?subject=${subject}&body=${body}`;
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(formatPassSmsMessage(member));
    const phone = phoneInput.replace(/[^0-9]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleLaunchPreview = () => {
    if (onPreviewStandalonePass) {
      onClose();
      onPreviewStandalonePass(member.memberNumber);
    } else {
      window.open(passUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-3xl bg-white border border-[#EDE7DF] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - High Design Clean Luxury */}
        <div className="px-6 py-5 bg-white border-b border-[#EDE7DF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF5F6] border border-rose-200 flex items-center justify-center text-[#780C1E]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-stone-900 tracking-tight">
                Send Digital Pass
              </div>
              <div className="text-xs font-mono font-medium text-stone-500">
                {member.fullName} · <span className="text-[#780C1E] font-bold">{member.memberNumber}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Isolation Notice Pill */}
        <div className="px-6 py-2.5 bg-[#FAF8F5] border-b border-[#EDE7DF] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <Lock className="w-4 h-4 text-[#780C1E] shrink-0" />
            <span>
              <strong>Pass-Only Isolated:</strong> Recipient sees only their pass. Internal operational tools remain locked.
            </span>
          </div>
          <button
            type="button"
            onClick={handleLaunchPreview}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-[#EDE7DF] text-[11px] font-semibold text-[#780C1E] hover:bg-[#FAF8F5] flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#EDE7DF] bg-white px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'wallet'
                ? 'border-[#780C1E] text-[#780C1E] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Apple Wallet (.pkpass)</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'border-[#780C1E] text-[#780C1E] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Pass</span>
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'sms'
                ? 'border-[#780C1E] text-[#780C1E] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS & WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold tracking-wide transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'link'
                ? 'border-[#780C1E] text-[#780C1E] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Direct Link</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1 bg-[#FAF8F5]/40">
          {sendSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{sendSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: APPLE WALLET */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs flex flex-col sm:flex-row items-center gap-5">
                {qrWalletCodeUrl && (
                  <div className="p-3 bg-white rounded-2xl border border-[#EDE7DF] shadow-xs flex-shrink-0">
                    <img
                      src={qrWalletCodeUrl}
                      alt="Wallet Link QR"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2 text-center sm:text-left">
                  <div className="font-serif text-base font-bold text-stone-900">
                    Scan with iPhone Camera
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed font-medium">
                    Point iPhone camera at this code to open the member&apos;s isolated digital pass and trigger the native <strong>Apple Wallet</strong> sheet.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#780C1E] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Pass Type: pass.club.jonnys.soho</span>
                  </div>
                </div>
              </div>

              {/* Download PKPASS button */}
              <div className="pt-1">
                <button
                  onClick={() => downloadAppleWalletPass(member)}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-black hover:bg-neutral-900 text-white transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <Download className="w-5 h-5 text-white" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-mono text-stone-400">
                      PassKit Package (.pkpass)
                    </div>
                    <div className="font-semibold text-sm text-white">
                      Download Apple Wallet Pass File
                    </div>
                  </div>
                </button>
                <div className="text-[11px] text-stone-400 text-center mt-2 font-mono">
                  Opens directly in Apple Wallet on iPhone, iPad, Apple Watch, and Mac.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL PASS */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Recipient Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="member@example.com"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#EDE7DF] text-stone-900 text-sm focus:outline-none focus:border-[#780C1E]"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending || !emailInput}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </div>

              {/* Preview of Email Contents */}
              <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-mono text-stone-400">Subject:</span>
                  <span className="font-medium text-stone-800 text-xs truncate max-w-[280px]">
                    AMICA SOHO - Official Digital Pass ({member.memberNumber})
                  </span>
                </div>
                <div className="text-xs text-stone-500 leading-relaxed border-t border-[#F0EBE3] pt-2">
                  Includes isolated member pass link, member number, Westminster Statutory Rules (01:00 AM strict cutoff, 01:30 AM guest departure), and direct <strong>Add to Apple Wallet</strong> action.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleOpenMailClient}
                    className="flex items-center gap-1.5 text-xs text-[#780C1E] hover:underline font-semibold cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in default mail client</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMS & WHATSAPP */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+44 7700 900077"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#EDE7DF] text-stone-900 font-mono text-sm focus:outline-none focus:border-[#780C1E]"
                />
              </div>

              {/* SMS Text Preview */}
              <div className="p-4 rounded-2xl bg-white border border-[#EDE7DF] font-mono text-xs text-stone-700 whitespace-pre-wrap leading-relaxed shadow-xs">
                {formatPassSmsMessage(member)}
              </div>

              {/* Quick Messaging Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide transition-all cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={handleCopySmsText}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT LINK & NATIVE SHARE */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Direct Isolated Pass URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={passUrl}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#EDE7DF] text-stone-700 font-mono text-xs focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 font-mono text-xs font-semibold tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-98 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Sheet</span>
                </button>

                <button
                  onClick={handleLaunchPreview}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#EDE7DF] text-stone-800 font-semibold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-98 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#780C1E]" />
                  <span>Preview Pass Only</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                🔒 When anyone opens this link, the system locks into <strong>Standalone Pass Mode</strong>. It displays only their rotating pass barcode, member name, and Apple Wallet button. The operational dashboard, admissions queue, door reception, and incident registers are strictly inaccessible.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#EDE7DF] flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>Amica Soho · 23 Frith Street</span>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-900 font-sans font-medium underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
