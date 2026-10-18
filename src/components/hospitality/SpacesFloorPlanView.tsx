import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  Users,
  CheckCircle2,
  Clock,
  X,
  Plus,
  UtensilsCrossed,
} from 'lucide-react';
import { TableItem, TableStatus } from '../../types';
import { clubStore } from '../../services/storage';

interface SpacesFloorPlanViewProps {
  onSelectTableBooking?: (table: TableItem) => void;
  onOpenNewBookingWithTable?: (tableName: string) => void;
}

export const SpacesFloorPlanView: React.FC<SpacesFloorPlanViewProps> = ({
  onSelectTableBooking,
  onOpenNewBookingWithTable,
}) => {
  const [viewMode, setViewMode] = useState<'floor_plan' | 'list'>('floor_plan');
  const [selectedSpace, setSelectedSpace] = useState<string>('Main Dining');
  const [showSpaceDropdown, setShowSpaceDropdown] = useState<boolean>(false);
  const [activeTable, setActiveTable] = useState<TableItem | null>(null);

  const tables = clubStore.getTables(selectedSpace);

  const handleUpdateStatus = (tableId: string, newStatus: TableStatus) => {
    clubStore.updateTableStatus(tableId, newStatus);
    if (activeTable && activeTable.id === tableId) {
      setActiveTable({ ...activeTable, status: newStatus });
    }
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-[#A8D5BA]',
          text: 'text-emerald-950',
          border: 'border-[#7CB894]',
          label: 'Available',
          dot: 'bg-[#2E7D52]',
        };
      case 'booked':
        return {
          bg: 'bg-[#E28B96]',
          text: 'text-[#4A0A12]',
          border: 'border-[#C96976]',
          label: 'Booked',
          dot: 'bg-[#780C1E]',
        };
      case 'occupied':
        return {
          bg: 'bg-[#E9D8A6]',
          text: 'text-[#5E4400]',
          border: 'border-[#D4BC7B]',
          label: 'Occupied',
          dot: 'bg-[#B45309]',
        };
      case 'blocked':
      default:
        return {
          bg: 'bg-[#D1D5DB]',
          text: 'text-stone-800',
          border: 'border-[#9CA3AF]',
          label: 'Blocked',
          dot: 'bg-stone-500',
        };
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#FAF8F5] text-stone-900 pb-24">
      {/* Segmented Control & Space Filter Bar */}
      <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#EDE7DF] flex flex-col gap-3">
        {/* Floor Plan vs List Toggle */}
        <div className="p-1 rounded-2xl bg-[#EBE5DC] flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('floor_plan')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'floor_plan'
                ? 'bg-[#780C1E] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            Floor plan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#780C1E] text-white shadow-sm'
                : 'text-stone-700 hover:text-stone-900'
            }`}
          >
            List
          </button>
        </div>

        {/* Space Selector Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSpaceDropdown(!showSpaceDropdown)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-[#EDE7DF] rounded-2xl shadow-xs text-xs font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer"
          >
            <span>{selectedSpace}</span>
            <ChevronDown className="w-4 h-4 text-stone-500" />
          </button>

          {showSpaceDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl bg-white shadow-xl border border-[#EDE7DF] py-1.5 text-xs text-stone-800 animate-fadeIn">
              {['Main Dining', 'Terrace', 'Bar'].map((sp) => (
                <button
                  key={sp}
                  onClick={() => {
                    setSelectedSpace(sp);
                    setShowSpaceDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 font-medium hover:bg-[#F7F3ED] transition-colors flex items-center justify-between ${
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
      </div>

      {/* Main Floor Plan View Mode */}
      {viewMode === 'floor_plan' ? (
        <div className="flex-1 px-4 py-3 flex flex-col items-center">
          {/* Architectural Luxury Floor Canvas */}
          <div className="relative w-full max-w-md aspect-[3/4.2] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#2A171F] bg-gradient-to-b from-[#1C120C] via-[#2A1B14] to-[#150D09]">
            {/* Parquet Wood Floor Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #3D2619 0, #3D2619 12px, #2B1A10 12px, #2B1A10 24px)`,
              }}
            />

            {/* Architectural Banquette & Booth Outlines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              viewBox="0 0 300 420"
              fill="none"
              stroke="#D4A359"
              strokeWidth="1.5"
            >
              {/* Top Curved Perimeter Booths */}
              <path d="M 30,30 Q 150,15 270,30" strokeDasharray="4 4" />
              {/* Left Banquette Wall */}
              <rect x="15" y="60" width="35" height="150" rx="10" stroke="#8E5D38" fill="#1C110A" />
              {/* Center Cocktails Bar Counter */}
              <path d="M 85,360 Q 150,340 215,360" stroke="#E5C378" strokeWidth="6" />
              {/* Back Office Door Indicator */}
              <line x1="285" y1="200" x2="285" y2="240" stroke="#780C1E" strokeWidth="3" />
            </svg>

            {/* Ambient Lighting Glows */}
            <div className="absolute top-8 left-8 w-24 h-24 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />
            <div className="absolute bottom-16 right-8 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            {/* Interactive Tables */}
            {tables.map((t) => {
              const colors = getStatusColor(t.status);
              const isSelected = activeTable?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTable(t)}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-10 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-md ${
                    t.shape === 'rect'
                      ? 'w-16 h-20 rounded-2xl'
                      : t.shape === 'booth'
                      ? 'w-18 h-18 rounded-3xl'
                      : 'w-14 h-14 rounded-full'
                  } ${colors.bg} ${colors.text} ${colors.border} border-2 ${
                    isSelected
                      ? 'ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.7)] scale-105'
                      : 'hover:brightness-105'
                  }`}
                >
                  <span className="font-bold text-sm leading-none font-sans">{t.number}</span>
                  <span className="text-[9px] font-semibold mt-0.5 leading-none opacity-85">
                    {t.capacityMin === t.capacityMax
                      ? t.capacityMin
                      : `${t.capacityMin}-${t.capacityMax}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend Bar */}
          <div className="w-full max-w-md mt-3.5 px-4 py-2.5 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs flex items-center justify-between text-xs font-semibold text-stone-700">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A8D5BA] border border-[#7CB894]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E28B96] border border-[#C96976]" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E9D8A6] border border-[#D4BC7B]" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] border border-[#9CA3AF]" />
              <span>Blocked</span>
            </div>
          </div>
        </div>
      ) : (
        /* List View Mode */
        <div className="px-4 py-3 space-y-2.5">
          {tables.map((t) => {
            const colors = getStatusColor(t.status);
            return (
              <div
                key={t.id}
                onClick={() => setActiveTable(t)}
                className="p-3.5 rounded-2xl bg-white border border-[#EDE7DF] shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-stone-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.text}`}
                  >
                    {t.number}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">{t.name}</h4>
                    <p className="text-xs text-stone-500">
                      Capacity: {t.capacityMin}–{t.capacityMax} guests · {t.space}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
                  >
                    {colors.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Table Drawer / Popover */}
      {activeTable && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4 max-w-md mx-auto animate-fadeIn">
          <div className="rounded-3xl bg-white p-5 shadow-2xl border border-[#EDE7DF] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    {activeTable.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      getStatusColor(activeTable.status).bg
                    } ${getStatusColor(activeTable.status).text}`}
                  >
                    {getStatusColor(activeTable.status).label}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Capacity: {activeTable.capacityMin}–{activeTable.capacityMax} guests · {activeTable.space}
                </p>
                {activeTable.currentGuestName && (
                  <p className="text-xs font-semibold text-[#780C1E] mt-1">
                    Current: {activeTable.currentGuestName}
                  </p>
                )}
              </div>

              <button
                onClick={() => setActiveTable(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Changers */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 block">
                Update Table Status
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['available', 'booked', 'occupied', 'blocked'] as TableStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(activeTable.id, st)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      activeTable.status === st
                        ? 'bg-[#780C1E] text-white shadow-sm'
                        : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#F2EDE4] border border-[#E5DFD5]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#F0EBE3]">
              <button
                onClick={() => {
                  if (onOpenNewBookingWithTable) {
                    onOpenNewBookingWithTable(activeTable.name);
                    setActiveTable(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book This Table</span>
              </button>

              <button
                onClick={() => setActiveTable(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
