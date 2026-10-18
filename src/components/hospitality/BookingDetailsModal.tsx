import React, { useState } from 'react';
import {
  ChevronLeft,
  MoreHorizontal,
  Phone,
  Mail,
  MessageCircle,
  FilePlus,
  Calendar,
  Clock,
  Users,
  UtensilsCrossed,
  Tag,
  FileText,
  BookmarkCheck,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { BookingRecord } from '../../types';
import { clubStore } from '../../services/storage';

interface BookingDetailsModalProps {
  booking: BookingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: any) => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(
    booking?.status || 'confirmed'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkArrived = () => {
    clubStore.updateBookingStatus(booking.id, 'arrived');
    setCurrentStatus('arrived');
    showToast(`${booking.guestName} marked as Arrived & Seated at ${booking.tableId}!`);
    if (onUpdateStatus) {
      onUpdateStatus(booking.id, 'arrived');
    }
  };

  const handleCancel = () => {
    if (confirm(`Cancel reservation for ${booking.guestName}?`)) {
      clubStore.updateBookingStatus(booking.id, 'cancelled');
      setCurrentStatus('cancelled');
      showToast('Reservation cancelled');
      if (onUpdateStatus) {
        onUpdateStatus(booking.id, 'cancelled');
      }
      setTimeout(onClose, 800);
    }
  };

  const handleMove = () => {
    alert(`Move Table: Select another table in ${booking.space} to reassign.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-[#FAF8F5] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-[#E5DFD5]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#EDE7DF] shrink-0">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-stone-700 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="font-cinzel text-sm font-bold tracking-[0.2em] text-[#A67C1E]">
            AMICA SOHO
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Edit reservation details')}
              className="text-xs font-semibold text-[#780C1E] hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => alert('Options: Print docket, re-send confirmation, guest notes')}
              className="p-1 text-stone-500 hover:text-stone-800"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-stone-900">
          {/* Toast Notice */}
          {toastMessage && (
            <div className="p-3 bg-emerald-900 text-emerald-100 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-md animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Guest Title & Status Badge */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              {booking.guestName}
            </h1>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                currentStatus === 'arrived' || currentStatus === 'seated'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentStatus === 'cancelled'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-[#E8F5EE] text-[#2E7D52] border border-[#C5E8D2]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="capitalize">{currentStatus}</span>
            </span>
          </div>

          {/* Quick Action Circles Row */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => {
                showToast(`Dialling ${booking.phone}...`);
                window.open(`tel:${booking.phone}`);
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white transition-all group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#EBE5DC] group-hover:bg-[#E2DBD1] flex items-center justify-center text-stone-800 transition-colors shadow-xs">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-stone-600">Call</span>
            </button>

            <button
              onClick={() => {
                if (booking.email) {
                  showToast(`Opening mail client for ${booking.email}...`);
                  window.open(`mailto:${booking.email}`);
                } else {
                  showToast('No email address provided for guest');
                }
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white transition-all group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#EBE5DC] group-hover:bg-[#E2DBD1] flex items-center justify-center text-stone-800 transition-colors shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-stone-600">Email</span>
            </button>

            <button
              onClick={() => showToast(`SMS sent to ${booking.phone}`)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white transition-all group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#EBE5DC] group-hover:bg-[#E2DBD1] flex items-center justify-center text-stone-800 transition-colors shadow-xs">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-stone-600">Message</span>
            </button>

            <button
              onClick={() => {
                const note = prompt('Add guest note:', booking.notes || '');
                if (note) {
                  booking.notes = note;
                  clubStore.saveBooking(booking);
                  showToast('Note updated on reservation');
                }
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-white transition-all group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-full bg-[#EBE5DC] group-hover:bg-[#E2DBD1] flex items-center justify-center text-stone-800 transition-colors shadow-xs">
                <FilePlus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-stone-600">Add note</span>
            </button>
          </div>

          {/* Details Card List */}
          <div className="bg-white rounded-2xl border border-[#EDE7DF] shadow-sm divide-y divide-[#F0EBE3]">
            {/* Date */}
            <div className="flex items-center px-4 py-3 gap-3">
              <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="text-xs font-semibold text-stone-800">
                Wed 15 Oct 2025
              </span>
            </div>

            {/* Time & Duration */}
            <div className="flex items-center px-4 py-3 gap-3">
              <Clock className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="text-xs font-semibold text-stone-800">
                {booking.time} –{' '}
                {parseInt(booking.time.split(':')[0], 10) +
                  parseInt(booking.duration.split(' ')[0] || '2', 10)}
                :00 ({booking.duration})
              </span>
            </div>

            {/* Guests */}
            <div className="flex items-center px-4 py-3 gap-3">
              <Users className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="text-xs font-semibold text-stone-800">
                {booking.partySize} guests
              </span>
            </div>

            {/* Table */}
            <div
              onClick={() => alert(`Table assigned: ${booking.tableId} (${booking.tableCapacity}) in ${booking.space}`)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-stone-50"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-4 h-4 text-stone-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-stone-800">
                    {booking.tableId}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {booking.tableCapacity} · {booking.space}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Occasion */}
            {booking.occasion && (
              <div className="flex items-center px-4 py-3 gap-3">
                <Tag className="w-4 h-4 text-stone-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-semibold text-stone-600">Occasion</div>
                  <div className="text-xs font-semibold text-stone-800">{booking.occasion}</div>
                </div>
              </div>
            )}

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-2 text-[10px] uppercase font-semibold text-stone-600">
                  <FileText className="w-3.5 h-3.5 text-stone-400" />
                  <span>Special requests</span>
                </div>
                <div className="text-xs text-stone-800 pl-5.5 font-medium">
                  {booking.specialRequests}
                </div>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="px-4 py-3 space-y-0.5">
                <div className="flex items-center gap-2 text-[10px] uppercase font-semibold text-stone-600">
                  <BookmarkCheck className="w-3.5 h-3.5 text-stone-400" />
                  <span>Notes</span>
                </div>
                <div className="text-xs text-stone-800 pl-5.5 font-medium">
                  {booking.notes}
                </div>
              </div>
            )}
          </div>

          {/* Guest History Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900">Guest history</span>
              <button
                onClick={() => alert('View complete guest visit timeline')}
                className="text-[11px] font-semibold text-stone-500 hover:text-stone-800"
              >
                View all
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#EDE7DF] shadow-sm divide-y divide-[#F0EBE3]">
              {booking.guestHistory && booking.guestHistory.length > 0 ? (
                booking.guestHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:bg-stone-50 transition-colors"
                  >
                    <span className="text-stone-800 font-semibold">{item.date}</span>
                    <div className="flex items-center gap-1 text-stone-500">
                      <span>
                        {item.guests} guests · {item.type}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-stone-500 text-center">
                  First recorded visit for this guest
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 bg-white border-t border-[#EDE7DF] flex items-center gap-3 shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-2xl bg-[#F4EFEA] hover:bg-[#ECE5DD] text-stone-800 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleMove}
            className="flex-1 py-3 rounded-2xl bg-[#F4EFEA] hover:bg-[#ECE5DD] text-stone-800 text-xs font-bold transition-all cursor-pointer"
          >
            Move
          </button>

          <button
            onClick={handleMarkArrived}
            className="flex-1 py-3 rounded-2xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
          >
            Arrived
          </button>
        </div>
      </div>
    </div>
  );
};
