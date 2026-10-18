import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { BookingRecord, BookingStatus } from '../../types';
import { clubStore } from '../../services/storage';

interface BookingsListViewProps {
  onSelectBooking: (booking: BookingRecord) => void;
  onOpenNewBooking: () => void;
}

export const BookingsListView: React.FC<BookingsListViewProps> = ({
  onSelectBooking,
  onOpenNewBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [spaceFilter, setSpaceFilter] = useState<string>('all');

  const bookings = clubStore.getBookings();

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      !searchQuery.trim() ||
      b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.tableId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesSpace = spaceFilter === 'all' || b.space === spaceFilter;
    return matchesSearch && matchesStatus && matchesSpace;
  });

  return (
    <div className="flex flex-col min-h-full bg-[#FAF8F5] text-stone-900 pb-24">
      {/* Top Search & Filter Bar */}
      <div className="px-4 py-3 bg-white border-b border-[#EDE7DF] space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search bookings by guest, phone, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] rounded-xl text-xs font-medium text-stone-900 border border-[#EDE7DF] focus:outline-none focus:border-[#780C1E]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Bookings' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'seated', label: 'Seated' },
            { id: 'arrived', label: 'Arrived' },
            { id: 'walk_in', label: 'Walk-ins' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-[#780C1E] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-stone-600 border border-[#EDE7DF] hover:bg-[#F2ECE3]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List Count Header */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs font-bold text-stone-500">
        <span>{filtered.length} reservations found</span>
        <span>Wed 15 Oct 2025</span>
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {filtered.map((b) => (
          <div
            key={b.id}
            onClick={() => onSelectBooking(b)}
            className="p-3.5 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs hover:border-stone-400 transition-all cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-stone-900 truncate">
                  {b.guestName}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    b.status === 'confirmed'
                      ? 'bg-[#E8F5EE] text-[#2E7D52]'
                      : b.status === 'arrived' || b.status === 'seated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                <span>{b.partySize} guests</span>
                <span>•</span>
                <span>{b.tableId}</span>
                <span>•</span>
                <span>{b.space}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right shrink-0">
              <div>
                <div className="text-xs font-bold font-mono text-stone-800">{b.time}</div>
                <div className="text-[10px] text-stone-400">{b.duration}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Add CTA */}
      <div className="fixed bottom-20 inset-x-0 z-30 px-6 max-w-md mx-auto pointer-events-none">
        <button
          onClick={onOpenNewBooking}
          className="w-full py-3.5 bg-[#780C1E] hover:bg-[#8E1026] text-white rounded-2xl font-semibold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer pointer-events-auto border border-[#9E142B]/50"
        >
          <Plus className="w-4 h-4" />
          <span>New booking</span>
        </button>
      </div>
    </div>
  );
};
