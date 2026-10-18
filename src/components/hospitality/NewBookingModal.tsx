import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  Tag,
  FileText,
  X,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { BookingRecord, TableItem } from '../../types';
import { clubStore } from '../../services/storage';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (booking: BookingRecord) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
}) => {
  const [bookingType, setBookingType] = useState<'booking' | 'event'>('booking');
  const [guestName, setGuestName] = useState<string>('Sophie Robinson');
  const [phone, setPhone] = useState<string>('+44 7700 900123');
  const [email, setEmail] = useState<string>('sophie@email.com');
  const [date, setDate] = useState<string>('2025-10-15');
  const [dateDisplay, setDateDisplay] = useState<string>('Wed 15 Oct 2025');
  const [time, setTime] = useState<string>('19:00');
  const [duration, setDuration] = useState<string>('2 hours');
  const [partySize, setPartySize] = useState<number>(4);
  const [selectedTableId, setSelectedTableId] = useState<string>('Table 3');
  const [occasion, setOccasion] = useState<string>('Birthday');
  const [specialRequests, setSpecialRequests] = useState<string>('Window table if possible');
  const [notes, setNotes] = useState<string>('Regular guest');
  const [space, setSpace] = useState<string>('Main Dining');

  if (!isOpen) return null;

  const suggestedTables = [
    { id: 'Table 3', capacity: '2–4 guests', status: 'Available' },
    { id: 'Table 4', capacity: '2–4 guests', status: 'Available' },
    { id: 'Table 5', capacity: '4–6 guests', status: 'Available' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter a guest name');
      return;
    }

    const newBooking: BookingRecord = {
      id: `book-${Date.now()}`,
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      date,
      time,
      duration,
      partySize,
      space,
      tableId: selectedTableId,
      tableCapacity: selectedTableId === 'Table 5' ? '4–6 guests' : '2–4 guests',
      occasion,
      specialRequests: specialRequests.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'confirmed',
      type: bookingType,
      accentColor: bookingType === 'event' ? 'purple' : 'green',
      guestHistory: [
        { date: '12 Sep 2025', guests: 4, type: 'Dinner' },
        { date: '7 Jul 2025', guests: 2, type: 'Drinks' },
        { date: '14 Feb 2025', guests: 4, type: 'Birthday' },
      ],
      createdAt: new Date().toISOString(),
    };

    clubStore.saveBooking(newBooking);

    // Update table status to booked
    const matchedTable = clubStore.getTables().find((t) => t.name === selectedTableId);
    if (matchedTable) {
      clubStore.updateTableStatus(matchedTable.id, 'booked');
    }

    if (onBookingCreated) {
      onBookingCreated(newBooking);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#E5DFD5]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#EDE7DF] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            Cancel
          </button>
          <h2 className="font-bold text-base text-stone-900 font-sans">
            New booking
          </h2>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Save
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-stone-900">
          {/* Segmented Control: Booking vs Event */}
          <div className="p-1 rounded-2xl bg-[#EBE5DC] flex gap-1">
            <button
              type="button"
              onClick={() => setBookingType('booking')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                bookingType === 'booking'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Booking
            </button>
            <button
              type="button"
              onClick={() => setBookingType('event')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                bookingType === 'event'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Event
            </button>
          </div>

          {/* Form Card Group */}
          <div className="bg-white rounded-2xl border border-[#EDE7DF] shadow-sm divide-y divide-[#F0EBE3]">
            {/* Guest Name */}
            <div className="flex items-center px-4 py-3 gap-3">
              <User className="w-4 h-4 text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                  Guest name
                </div>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full text-xs font-medium text-stone-900 focus:outline-none bg-transparent"
                  required
                />
              </div>
              {guestName && (
                <button
                  type="button"
                  onClick={() => setGuestName('')}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center px-4 py-3 gap-3">
              <Phone className="w-4 h-4 text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                  Phone
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 ..."
                  className="w-full text-xs font-medium text-stone-900 focus:outline-none bg-transparent font-mono"
                />
              </div>
              {phone && (
                <button
                  type="button"
                  onClick={() => setPhone('')}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Email (Optional) */}
            <div className="flex items-center px-4 py-3 gap-3">
              <Mail className="w-4 h-4 text-stone-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                  Email (optional)
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full text-xs font-medium text-stone-900 focus:outline-none bg-transparent"
                />
              </div>
              {email && (
                <button
                  type="button"
                  onClick={() => setEmail('')}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                    Date
                  </div>
                  <div className="text-xs font-medium text-stone-900">
                    {dateDisplay}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Time & Duration Row */}
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                    Time
                  </div>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-xs font-bold text-stone-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wider">
                  Duration
                </div>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="text-xs font-bold text-stone-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {['1.5 hours', '2 hours', '2.5 hours', '3 hours'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Party Size Stepper */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="text-xs font-medium text-stone-900">Party size</span>
              </div>
              <div className="flex items-center gap-3 bg-[#FAF8F5] rounded-xl px-2 py-1 border border-[#E5DFD5]">
                <button
                  type="button"
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className="w-7 h-7 rounded-lg bg-white text-stone-800 font-bold flex items-center justify-center hover:bg-stone-100 shadow-xs cursor-pointer"
                >
                  −
                </button>
                <span className="text-xs font-bold font-mono text-stone-900 w-5 text-center">
                  {partySize}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize(Math.min(30, partySize + 1))}
                  className="w-7 h-7 rounded-lg bg-white text-stone-800 font-bold flex items-center justify-center hover:bg-stone-100 shadow-xs cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Suggested Tables Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900">Suggested tables</span>
              <button
                type="button"
                onClick={() => alert('View all 8 tables available in Main Dining')}
                className="text-[11px] font-semibold text-stone-500 hover:text-stone-800"
              >
                View all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {suggestedTables.map((t) => {
                const isSelected = selectedTableId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#780C1E] bg-[#FFF8F9] ring-1 ring-[#780C1E]'
                        : 'border-[#EDE7DF] bg-white hover:border-stone-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-900">{t.id}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{t.capacity}</div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{t.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Occasion & Special Requests Card Group */}
          <div className="bg-white rounded-2xl border border-[#EDE7DF] shadow-sm divide-y divide-[#F0EBE3]">
            {/* Occasion */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="text-xs font-medium text-stone-900">Occasion</span>
              </div>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="text-xs font-semibold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {['Birthday', 'Dinner', 'Drinks', 'Anniversary', 'Business', 'Celebration', 'None'].map(
                  (occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Special Requests */}
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="text-xs font-medium text-stone-900">
                  Special requests (optional)
                </span>
              </div>
              <input
                type="text"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Window table if possible"
                className="w-full text-xs text-stone-700 pl-7 focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
