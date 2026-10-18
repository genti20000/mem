import React, { useState } from 'react';
import {
  Search,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  History,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { clubStore } from '../../services/storage';

interface GuestsDirectoryViewProps {
  onSelectMemberPass?: (memberId: string) => void;
}

export const GuestsDirectoryView: React.FC<GuestsDirectoryViewProps> = ({
  onSelectMemberPass,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const members = clubStore.getMembers();
  const bookings = clubStore.getBookings();

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery.trim() ||
      m.fullName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      (m.employer && m.employer.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-full bg-[#FAF8F5] text-stone-900 pb-24">
      {/* Header Search */}
      <div className="px-4 py-3 bg-white border-b border-[#EDE7DF] space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search member & guest profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] rounded-xl text-xs font-medium text-stone-900 border border-[#EDE7DF] focus:outline-none focus:border-[#780C1E]"
          />
        </div>
      </div>

      {/* Guest Directory List */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-stone-500 px-1">
          <span>Active Members & Regular Guests ({filteredMembers.length})</span>
          <span>Amica Soho</span>
        </div>

        {filteredMembers.map((m) => {
          const guestBookings = bookings.filter(
            (b) => b.guestName.toLowerCase().includes(m.fullName.toLowerCase())
          );

          return (
            <div
              key={m.id}
              onClick={() => onSelectMemberPass && onSelectMemberPass(m.id)}
              className="p-3.5 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs hover:border-stone-400 transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={m.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={m.fullName}
                  className="w-11 h-11 rounded-full object-cover border border-[#E5DFD5] shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-stone-900 truncate">
                      {m.fullName}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-[#A67C1E] bg-[#FAF3E0] px-2 py-0.5 rounded-md">
                      {m.memberNumber}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {m.employer ? `${m.employer} · ` : ''}
                    <span className="capitalize">{m.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {guestBookings.length > 0 ? `${guestBookings.length} bookings` : 'Verified'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
