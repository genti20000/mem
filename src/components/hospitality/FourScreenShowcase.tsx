import React, { useState } from 'react';
import {
  Wifi,
  Battery,
  Signal,
  Menu,
  CalendarDays,
  SlidersHorizontal,
  ChevronLeft,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { BookingRecord, TableItem } from '../../types';
import { ReservationsCalendarView } from './ReservationsCalendarView';
import { NewBookingModal } from './NewBookingModal';
import { BookingDetailsModal } from './BookingDetailsModal';
import { SpacesFloorPlanView } from './SpacesFloorPlanView';
import { AmicaBottomNav } from './AmicaBottomNav';
import { INITIAL_BOOKINGS } from '../../data/mockBookings';

interface FourScreenShowcaseProps {
  onOpenDoorControl?: () => void;
  onOpenPasses?: () => void;
}

export const FourScreenShowcase: React.FC<FourScreenShowcaseProps> = ({
  onOpenDoorControl,
  onOpenPasses,
}) => {
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord>(
    INITIAL_BOOKINGS[2] // Sophie Robinson
  );
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [focusedScreen, setFocusedScreen] = useState<number | null>(null);

  // Phone Frame Component
  const IPhoneFrame: React.FC<{
    titleNumber: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    screenIndex: number;
  }> = ({ titleNumber, title, subtitle, children, screenIndex }) => {
    const isFocused = focusedScreen === screenIndex;

    return (
      <div className={`flex flex-col items-center transition-all duration-300 ${isFocused ? 'scale-100 z-30' : ''}`}>
        {/* Title & Subtitle matching the reference mockup */}
        <div className="text-center mb-4 px-2">
          <div className="font-serif text-lg font-bold text-[#E5C378] tracking-wide">
            {titleNumber}. {title}
          </div>
          <div className="text-xs text-stone-400 font-sans tracking-wide">
            {subtitle}
          </div>
        </div>

        {/* iPhone Chassis */}
        <div className="relative w-[340px] sm:w-[365px] h-[740px] rounded-[52px] bg-[#0A0709] p-3.5 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-4 border-[#2D2128] ring-1 ring-[#5E4452] flex flex-col overflow-hidden">
          {/* Hardware Buttons on outer edge */}
          <div className="absolute -left-1 top-24 w-1 h-8 bg-[#42323B] rounded-l-md" />
          <div className="absolute -left-1 top-36 w-1 h-12 bg-[#42323B] rounded-l-md" />
          <div className="absolute -left-1 top-52 w-1 h-12 bg-[#42323B] rounded-l-md" />
          <div className="absolute -right-1 top-32 w-1 h-16 bg-[#42323B] rounded-r-md" />

          {/* Screen Glass Surface */}
          <div className="relative w-full h-full rounded-[44px] overflow-hidden bg-[#FAF8F5] flex flex-col select-none">
            {/* iOS Status Bar with Dynamic Island */}
            <div className="h-11 bg-[#0F0A0D] text-white px-7 flex items-center justify-between text-xs font-semibold shrink-0 select-none z-30">
              <span className="font-mono text-[13px] tracking-tight">9:41</span>

              {/* Dynamic Island Pill */}
              <div className="w-24 h-6 rounded-full bg-black mx-auto flex items-center justify-end pr-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#181115] border border-stone-800" />
              </div>

              {/* Icons right */}
              <div className="flex items-center gap-1.5 text-stone-300">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4 text-white fill-white" />
              </div>
            </div>

            {/* Screen Inner Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-[#FAF8F5]">
              {children}
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="h-5 bg-white shrink-0 flex items-center justify-center">
              <div className="w-32 h-1 rounded-full bg-stone-300" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0A0709] py-8 px-4 overflow-x-auto">
      {/* View Switcher Banner */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-[#140D12] border border-[#3A1F2D] text-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#780C1E] to-[#3B060F] border border-[#F5CE76]/40 flex items-center justify-center text-[#FFE194] shadow-md">
            <Sparkles className="w-5 h-5 text-[#FFE194]" />
          </div>
          <div>
            <h2 className="font-cinzel text-base sm:text-lg font-bold text-[#FFE194] tracking-[0.15em]">
              AMICA SOHO · DESIGN SUITE
            </h2>
            <p className="text-xs text-stone-400 font-sans">
              High-design hospitality management experience for 23 Frith Street, Soho
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {focusedScreen !== null && (
            <button
              onClick={() => setFocusedScreen(null)}
              className="px-3.5 py-2 rounded-xl bg-[#23151E] hover:bg-[#341F2C] border border-[#F5CE76]/30 text-[#FFE194] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Show All 4 Screens</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-2xl border border-stone-800">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setFocusedScreen(focusedScreen === num ? null : num)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  focusedScreen === num
                    ? 'bg-[#780C1E] text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Screen {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Screens Grid / Horizontal Scroll Presentation */}
      <div className="flex items-start justify-center gap-6 xl:gap-8 flex-wrap lg:flex-nowrap overflow-x-auto pb-8 pt-2">
        {/* Screen 1: Reservations Calendar */}
        {(focusedScreen === null || focusedScreen === 1) && (
          <IPhoneFrame
            screenIndex={1}
            titleNumber="1"
            title="Reservations Calendar"
            subtitle="Live view of bookings, spaces and availability"
          >
            {/* Header: Dark Soho Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F0A0D] border-b border-[#2A1620] shrink-0">
              <button className="text-stone-300 hover:text-white">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-cinzel text-sm font-bold tracking-[0.2em] text-[#E5C378]">
                AMICA SOHO
              </span>
              <button className="text-stone-300 hover:text-white relative">
                <CalendarDays className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#780C1E]" />
              </button>
            </div>

            {/* Calendar Content */}
            <div className="flex-1 relative overflow-y-auto">
              <ReservationsCalendarView
                onSelectBooking={(b) => {
                  setSelectedBooking(b);
                  setIsDetailsOpen(true);
                }}
                onOpenNewBooking={() => setIsNewBookingOpen(true)}
              />
            </div>

            {/* Bottom Nav */}
            <AmicaBottomNav currentTab="calendar" onSelectTab={() => {}} />
          </IPhoneFrame>
        )}

        {/* Screen 2: New Booking */}
        {(focusedScreen === null || focusedScreen === 2) && (
          <IPhoneFrame
            screenIndex={2}
            titleNumber="2"
            title="New Booking"
            subtitle="Fast, intelligent booking flow"
          >
            {/* Static or interactive Mockup of Screen 2 */}
            <div className="flex-1 flex flex-col bg-[#FAF8F5]">
              <div className="flex-1 overflow-y-auto">
                <NewBookingModal
                  isOpen={true}
                  onClose={() => {}}
                  onBookingCreated={(b) => setSelectedBooking(b)}
                />
              </div>
            </div>
          </IPhoneFrame>
        )}

        {/* Screen 3: Booking Details */}
        {(focusedScreen === null || focusedScreen === 3) && (
          <IPhoneFrame
            screenIndex={3}
            titleNumber="3"
            title="Booking Details"
            subtitle="Everything at a glance"
          >
            <div className="flex-1 flex flex-col bg-[#FAF8F5]">
              <div className="flex-1 overflow-y-auto">
                <BookingDetailsModal
                  isOpen={true}
                  booking={selectedBooking}
                  onClose={() => {}}
                />
              </div>
            </div>
          </IPhoneFrame>
        )}

        {/* Screen 4: Spaces / Floor Plan */}
        {(focusedScreen === null || focusedScreen === 4) && (
          <IPhoneFrame
            screenIndex={4}
            titleNumber="4"
            title="Spaces / Floor Plan"
            subtitle="Visual table management"
          >
            {/* Header: Dark Soho Bar with Filter Icon */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F0A0D] border-b border-[#2A1620] shrink-0">
              <button className="text-stone-300 hover:text-white">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-cinzel text-sm font-bold tracking-[0.2em] text-[#E5C378]">
                AMICA SOHO
              </span>
              <button className="text-stone-300 hover:text-white">
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Floor Plan View */}
            <div className="flex-1 relative overflow-y-auto">
              <SpacesFloorPlanView
                onOpenNewBookingWithTable={(tableName) => {
                  setIsNewBookingOpen(true);
                }}
              />
            </div>

            {/* Bottom Nav */}
            <AmicaBottomNav currentTab="spaces" onSelectTab={() => {}} />
          </IPhoneFrame>
        )}
      </div>

      {/* Interactive Overlays when user clicks modals inside preview */}
      {isNewBookingOpen && (
        <NewBookingModal
          isOpen={isNewBookingOpen}
          onClose={() => setIsNewBookingOpen(false)}
          onBookingCreated={(b) => {
            setSelectedBooking(b);
            setIsNewBookingOpen(false);
          }}
        />
      )}

      {isDetailsOpen && (
        <BookingDetailsModal
          isOpen={isDetailsOpen}
          booking={selectedBooking}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </div>
  );
};
