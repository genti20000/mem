import React, { useState } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Send,
  Download,
  Sparkles,
  ShieldCheck,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';
import { Member } from '../../types';
import { clubStore } from '../../services/storage';
import { generateMemberPassEmail, downloadAppleWalletPass } from '../../services/appleWallet';
import { generateSignedMemberToken } from '../../services/security';

interface SendPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  qrToken?: string;
  onOpenAppleWalletModal?: () => void;
}

export const SendPassModal: React.FC<SendPassModalProps> = ({
  isOpen,
  onClose,
  member,
  qrToken: initialQrToken,
  onOpenAppleWalletModal,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(member?.email || '');
  const [recipientPhone, setRecipientPhone] = useState(member?.phone || '');
  const [activeChannel, setActiveChannel] = useState<'email' | 'sms' | 'link'>('email');
  const [customNote, setCustomNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !member) return null;

  const qrToken = initialQrToken || generateSignedMemberToken(member.id).token;

  const emailDetails = generateMemberPassEmail(member, qrToken);
  const passUrl = emailDetails.passUrl;

  // Handle Dispatch via Email
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) return;

    setIsSending(true);

    // Formulate mailto payload as instant client dispatch
    const subject = encodeURIComponent(emailDetails.subject);
    const bodyText = `${emailDetails.body}${
      customNote.trim() ? `\n\nMESSAGE FROM STAFF:\n${customNote.trim()}` : ''
    }`;
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`;

    // Log the audit event in the club store
    const staff = clubStore.getCurrentStaff();
    clubStore.addAuditLog({
      actorId: staff.id,
      actorName: staff.name,
      actorRole: staff.role,
      action: 'DISPATCH_MEMBER_PASS',
      targetType: 'member',
      targetId: member.id,
      targetName: member.fullName,
      newValue: `Channel: EMAIL to ${recipientEmail.trim()}`,
      reason: 'Digital pass with Apple Wallet link dispatched to member.',
    });

    // Trigger email client or confirm dispatch
    window.location.href = mailtoUrl;

    setTimeout(() => {
      setIsSending(false);
      setSendSuccessMessage(`Pass invitation prepared for ${recipientEmail}!`);
      setTimeout(() => setSendSuccessMessage(null), 4000);
    }, 600);
  };

  // Handle Dispatch via WhatsApp / SMS
  const handleSendSmsOrWhatsApp = (channel: 'whatsapp' | 'sms') => {
    const text = encodeURIComponent(
      `Hello ${member.fullName}, here is your official JONNY’S Soho Digital Membership Pass (${member.memberNumber}) for 23 Frith Street:\n\n${passUrl}\n\nPresent this dynamic pass or add to Apple Wallet at the reception kiosk.`
    );

    const staff = clubStore.getCurrentStaff();
    clubStore.addAuditLog({
      actorId: staff.id,
      actorName: staff.name,
      actorRole: staff.role,
      action: 'DISPATCH_MEMBER_PASS',
      targetType: 'member',
      targetId: member.id,
      targetName: member.fullName,
      newValue: `Channel: ${channel.toUpperCase()} to ${recipientPhone || 'client'}`,
      reason: 'Digital pass link sent via messaging.',
    });

    if (channel === 'whatsapp') {
      const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
      const url = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
      window.open(url, '_blank');
    } else {
      window.location.href = `sms:${recipientPhone}?body=${text}`;
    }

    setSendSuccessMessage(`Opening ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to send pass...`);
    setTimeout(() => setSendSuccessMessage(null), 3500);
  };

  // Copy Direct Pass URL
  const handleCopyLink = () => {
    navigator.clipboard.writeText(passUrl);
    setCopiedLink(true);

    const staff = clubStore.getCurrentStaff();
    clubStore.addAuditLog({
      actorId: staff.id,
      actorName: staff.name,
      actorRole: staff.role,
      action: 'COPY_MEMBER_PASS_LINK',
      targetType: 'member',
      targetId: member.id,
      targetName: member.fullName,
      newValue: passUrl,
      reason: 'Pass direct URL copied to clipboard.',
    });

    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-[#131014] border border-[#581625] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-fadeIn">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#181318] border-b border-[#2C0E17] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D141C] border border-[#581625] flex items-center justify-center text-[#E5C378]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                Send Member Pass
              </h2>
              <div className="text-[11px] font-mono text-[#C6A052]">
                Dispatch Pass & Apple Wallet Link to Patron
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#20181D] hover:bg-[#34111C] text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Preview Banner */}
        <div className="p-4 bg-[#1B1519] border-b border-[#2C0E17] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#C6A052]/50 bg-black shrink-0">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#E5C378]">
                  <User className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-serif text-base font-bold text-white truncate">
                {member.fullName}
              </div>
              <div className="text-xs font-mono text-[#E5C378]">
                {member.memberNumber} · {member.hospitalityRole}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {member.employer} · {member.email}
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0 ${
              member.status === 'active'
                ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/40'
                : 'border-amber-500/60 text-amber-300 bg-amber-950/40'
            }`}
          >
            {member.status.replace('_', ' ')}
          </span>
        </div>

        {/* Channel Selector Segmented Control */}
        <div className="p-4 bg-[#120F12] border-b border-[#25161B]">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#1A1417] rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveChannel('email')}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeChannel === 'email'
                  ? 'bg-[#581625] text-[#E5C378] shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Pass</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChannel('sms')}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeChannel === 'sms'
                  ? 'bg-[#581625] text-[#E5C378] shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS / WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChannel('link')}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeChannel === 'link'
                  ? 'bg-[#581625] text-[#E5C378] shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Direct Link</span>
            </button>
          </div>
        </div>

        {/* Body content based on channel */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Notification Alert */}
          {sendSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{sendSuccessMessage}</span>
            </div>
          )}

          {/* CHANNEL 1: EMAIL */}
          {activeChannel === 'email' && (
            <form onSubmit={handleSendEmail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="member@domain.com"
                  className="w-full px-3.5 py-2.5 bg-[#0B080A] border border-[#3E101B] rounded-xl text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Optional Note from Reception Desk
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Table reserved on terrace, looking forward to welcoming you tonight!"
                  className="w-full px-3.5 py-2 bg-[#0B080A] border border-[#3E101B] rounded-xl text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              {/* Email Content Preview */}
              <div className="p-3 rounded-xl bg-[#090709] border border-white/5 space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-[#C6A052] flex items-center justify-between">
                  <span>Email Content Preview:</span>
                  <span>Includes Apple Wallet .pkpass link</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400 bg-[#120F12] p-2.5 rounded-lg border border-white/5 max-h-28 overflow-y-auto whitespace-pre-wrap leading-snug">
                  {emailDetails.body}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                {onOpenAppleWalletModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAppleWalletModal();
                    }}
                    className="text-xs font-mono text-[#C6A052] hover:underline"
                  >
                    View Apple Wallet Pass
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-[#581625] hover:bg-[#6E1C30] border border-[#C6A052]/50 text-[#E5C378] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Pass Email</span>
                </button>
              </div>
            </form>
          )}

          {/* CHANNEL 2: SMS & WHATSAPP */}
          {activeChannel === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Recipient Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+44 7911 123456"
                  className="w-full px-3.5 py-2.5 bg-[#0B080A] border border-[#3E101B] rounded-xl text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C6A052]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendSmsOrWhatsApp('whatsapp')}
                  className="p-3 rounded-xl bg-[#13281E] hover:bg-[#1A382A] border border-emerald-500/40 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-serif font-bold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Dispatch</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 leading-snug">
                    Open pre-formatted WhatsApp chat with member pass link.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSmsOrWhatsApp('sms')}
                  className="p-3 rounded-xl bg-[#1C1824] hover:bg-[#252030] border border-purple-500/40 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-purple-300 font-serif font-bold text-sm">
                    <Send className="w-4 h-4" />
                    <span>Direct SMS Text</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 leading-snug">
                    Launch device messaging app with pass link.
                  </div>
                </button>
              </div>

              {/* Web Share API */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.share({
                        title: `JONNY'S Membership Pass - ${member.fullName}`,
                        text: `Your digital membership pass for Jonny's Soho at 23 Frith Street (${member.memberNumber})`,
                        url: passUrl,
                      }).catch(() => {});
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1B1519] hover:bg-[#251A22] border border-white/10 text-stone-200 text-xs font-mono flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4 text-[#C6A052]" />
                    <span>Open Native Share Sheet (AirDrop / Messages / Mail)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CHANNEL 3: DIRECT LINK & PKPASS DOWNLOAD */}
          {activeChannel === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 mb-1">
                  Direct Digital Pass URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={passUrl}
                    className="flex-1 px-3 py-2 bg-[#090708] border border-[#3E101B] rounded-xl text-xs text-stone-400 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-[#581625] hover:bg-[#6E1C30] border border-[#C6A052]/40 text-[#E5C378] text-xs font-mono font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Apple Wallet .pkpass Download Box */}
              <div className="p-4 rounded-2xl bg-[#0F0D11] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="font-serif text-sm font-bold text-white">
                    Apple Wallet Package (.pkpass)
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Download authentic PassKit bundle for iOS Wallet integration.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await downloadAppleWalletPass(member, qrToken);
                    setSendSuccessMessage('.pkpass file downloaded!');
                    setTimeout(() => setSendSuccessMessage(null), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 text-white text-xs font-mono font-semibold flex items-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .pkpass</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#100D11] border-t border-[#25161B] flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>Licensing Act 2003 Compliant</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1B1519] hover:bg-[#251A22] text-stone-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
