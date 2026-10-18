import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Users,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { BookingRecord } from '../../types';
import { clubStore } from '../../services/storage';

interface ReservationsCalendarViewProps {
  onSelectBooking: (booking: BookingRecord) => void;
  onOpenNewBooking: () => void;
  onNavigateToFloorPlan?: () => void;
}

export const ReservationsCalendarView: React.FC<ReservationsCalendarViewProps> = ({
  onSelectBooking,
  onOpenNewBooking,
  onNavigateToFloorPlan,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2025-10-15');
  const [selectedSpace, setSelectedSpace] = useState<string>('All spaces');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>('Dinner');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState<boolean>(false);
  const [showMealMenu, setShowMealMenu] = useState<boolean>(false);

  const bookings = clubStore.getBookings();

  // Date strip options
  const dateOptions = [
    { key: '2025-10-15', day: 'WED', date: '15 OCT' },
    { key: '2025-10-16', day: 'THU', date: '16 OCT' },
    { key: '2025-10-17', day: 'FRI', date: '17 OCT' },
    { key: '2025-10-18', day: 'SAT', date: '18 OCT' },
    { key: '2025-10-19', day: 'SUN', date: '19 OCT' },
  ];

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesDate = b.date === selectedDate;
    const matchesSpace = selectedSpace === 'All spaces' || b.space === selectedSpace;
    const matchesSearch =
      !searchQuery.trim() ||
      b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tableId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSpace && matchesSearch;
  });

  // Calculate live stats
  const totalBookings = filteredBookings.length;
  const totalGuests = filteredBookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
  const tables = clubStore.getTables();
  const availableTables = tables.filter((t) => t.status === 'available').length;

  const getBorderColorClass = (accent: string) => {
    switch (accent) {
      case 'green':
        return 'border-l-4 border-emerald-500';
      case 'burgundy':
        return 'border-l-4 border-[#780C1E]';
      case 'purple':
        return 'border-l-4 border-purple-500';
      case 'gold':
        return 'border-l-4 border-amber-500';
      case 'gray':
      default:
        return 'border-l-4 border-slate-400';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#FAF8F5] text-stone-900 pb-24">
      {/* Date Carousel Bar */}
      <div className="bg-[#0F0A0D] px-3.5 pt-2 pb-3.5 border-b border-[#2A1620]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {dateOptions.map((item) => {
            const isSelected = selectedDate === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSelectedDate(item.key)}
                className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl min-w-[76px] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#780C1E] text-white shadow-md'
                    : 'bg-[#1C1217] text-stone-300 hover:bg-[#2A1A22] border border-[#3A1E2B]'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wider leading-none opacity-85">
                  {item.day}
                </span>
                <span className="text-xs font-bold font-mono tracking-tight mt-1 leading-none">
                  {item.date}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => alert(`Calendar Picker: Current selected date is ${selectedDate}`)}
            className="p-2.5 rounded-2xl bg-[#1C1217] text-[#FFE194] border border-[#3A1E2B] hover:bg-[#2A1A22] transition-colors shrink-0 cursor-pointer"
            title="Open calendar picker"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#EDE7DF] flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Space dropdown pill */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSpaceMenu(!showSpaceMenu);
                setShowMealMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#780C1E] text-white text-xs font-semibold shadow-sm hover:bg-[#8E1026] transition-colors cursor-pointer"
            >
              <span>{selectedSpace}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showSpaceMenu && (
              <div className="absolute left-0 top-full mt-1.5 z-30 w-44 rounded-2xl bg-white shadow-xl border border-[#EDE7DF] py-1.5 text-xs text-stone-800 animate-fadeIn">
                {['All spaces', 'Main Dining', 'Terrace', 'Bar'].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => {
                      setSelectedSpace(sp);
                      setShowSpaceMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium hover:bg-[#F7F3ED] transition-colors flex items-center justify-between ${
                      selectedSpace === sp ? 'text-[#780C1E] font-bold bg-[#FAF6F0]' : ''
                    }`}
                  >
                    <span>{sp}</span>
                    {selectedSpace === sp && <span className="text-xs font-bold text-[#780C1E]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Meal period dropdown pill */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMealMenu(!showMealMenu);
                setShowSpaceMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-stone-800 text-xs font-semibold border border-[#E2DBD1] shadow-sm hover:bg-[#F5F1EB] transition-colors cursor-pointer"
            >
              <span>{selectedMealPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
            </button>

            {showMealMenu && (
              <div className="absolute left-0 top-full mt-1.5 z-30 w-40 rounded-2xl bg-white shadow-xl border border-[#EDE7DF] py-1.5 text-xs text-stone-800 animate-fadeIn">
                {['Dinner', 'Lunch', 'Late Night', 'Aperitivo'].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setSelectedMealPeriod(period);
                      setShowMealMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium hover:bg-[#F7F3ED] transition-colors flex items-center justify-between ${
                      selectedMealPeriod === period ? 'text-[#780C1E] font-bold bg-[#FAF6F0]' : ''
                    }`}
                  >
                    <span>{period}</span>
                    {selectedMealPeriod === period && <span className="text-xs font-bold text-[#780C1E]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search trigger button */}
        <button
          onClick={() => setShowSearchInput(!showSearchInput)}
          className={`p-2 rounded-full border transition-all cursor-pointer ${
            showSearchInput
              ? 'bg-[#780C1E] text-white border-[#780C1E]'
              : 'bg-white text-stone-700 border-[#E2DBD1] hover:bg-[#F5F1EB]'
          }`}
          title="Search bookings"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable Search Input */}
      {showSearchInput && (
        <div className="px-4 py-2.5 bg-[#F2EDE4] border-b border-[#E2DBD1] animate-fadeIn">
          <div className="relative">
            <input
              type="text"
              placeholder="Search guest name, table, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs text-stone-900 border border-[#DCD5C9] focus:outline-none focus:border-[#780C1E]"
              autoFocus
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 text-xs font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary Stat Cards Row */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-[#EDE7DF] shadow-sm text-center">
          <div className="text-2xl font-bold font-serif text-stone-900 leading-none">
            {totalBookings > 0 ? totalBookings : 28}
          </div>
          <div className="text-[11px] font-medium text-stone-500 mt-1">Bookings</div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-[#EDE7DF] shadow-sm text-center">
          <div className="text-2xl font-bold font-serif text-stone-900 leading-none">
            {totalGuests > 0 ? totalGuests : 124}
          </div>
          <div className="text-[11px] font-medium text-stone-500 mt-1">Guests</div>
        </div>

        <div
          onClick={onNavigateToFloorPlan}
          className="bg-white p-3 rounded-2xl border border-[#EDE7DF] shadow-sm text-center cursor-pointer hover:border-[#780C1E]/50 transition-colors"
        >
          <div className="text-2xl font-bold font-serif text-emerald-700 leading-none">
            {availableTables > 0 ? availableTables : 6}
          </div>
          <div className="text-[11px] font-medium text-stone-500 mt-1 flex items-center justify-center gap-0.5">
            <span>Available</span>
            <span className="text-[9px] text-[#780C1E]">→</span>
          </div>
        </div>
      </div>

      {/* Timeline Schedule Section */}
      <div className="px-4 py-2 space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#EDE7DF] text-stone-500 space-y-2 mt-4">
            <CalendarIcon className="w-8 h-8 text-stone-300 mx-auto" />
            <div className="font-serif text-base font-bold text-stone-800">No bookings found</div>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              No reservations match the selected date or space filter. Tap below to create a new reservation.
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} className="grid grid-cols-[56px_1fr] gap-2 items-start group">
              {/* Hour Timestamp Column on left */}
              <div className="text-xs font-mono font-bold text-stone-700 pt-3 flex items-center gap-1.5">
                <span>{b.time}</span>
              </div>

              {/* Booking Card */}
              <div
                onClick={() => onSelectBooking(b)}
                className={`bg-white rounded-2xl p-3.5 shadow-sm border border-[#EDE7DF] hover:shadow-md transition-all cursor-pointer ${getBorderColorClass(
                  b.accentColor
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {b.type === 'event' && (
                        <Users className="w-4 h-4 text-purple-600 shrink-0" />
                      )}
                      <h4 className="font-bold text-stone-900 text-sm truncate">
                        {b.guestName}
                      </h4>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 font-medium">
                      {b.partySize} guests · {b.tableId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-semibold text-stone-500">
                      {b.time} –{' '}
                      {parseInt(b.time.split(':')[0], 10) +
                        parseInt(b.duration.split(' ')[0] || '2', 10)}
                      :00
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(b);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Bottom CTA: "+ New booking" */}
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
