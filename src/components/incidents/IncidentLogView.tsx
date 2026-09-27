import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  Camera,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { IncidentCategory, IncidentRecord, StaffUser } from '../../types';
import { clubStore } from '../../services/storage';
import { IncidentLoggerModal } from '../door/IncidentLoggerModal';

interface IncidentLogViewProps {
  currentStaff: StaffUser;
}

export const IncidentLogView: React.FC<IncidentLogViewProps> = ({ currentStaff }) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>(clubStore.getIncidents());
  const [showLogModal, setShowLogModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesCategory = selectedCategory === 'all' || inc.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inc.incidentNumber.toLowerCase().includes(q) ||
      inc.categoryLabel.toLowerCase().includes(q) ||
      inc.description.toLowerCase().includes(q) ||
      inc.actionTaken.toLowerCase().includes(q) ||
      (inc.personsInvolved && inc.personsInvolved.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/35 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-script text-2xl sm:text-3xl font-bold text-[#FFE194]">
              Amica
            </span>
            <span className="font-cinzel text-xs sm:text-sm font-extrabold tracking-[2px] text-[#F5CE76]">
              LATE
            </span>
            <span className="text-xs text-[#F5CE76]/40 hidden sm:inline">·</span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Statutory Incident Register
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#8E0E24] border border-[#F5CE76]/50 text-white text-xs font-mono uppercase tracking-wider font-bold">
              s.141 & Safety Log
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-200 mt-1 font-medium">
            Sub: <span className="text-[#FFE194] font-bold">Jonny&apos;s Late Show</span> · 23 Frith Street Soho · Mandatory statutory log of crimes, ejections, disorder, and refusals.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#A8102B] hover:to-[#5E0B1A] border-2 border-[#F5CE76] text-white text-xs sm:text-sm font-mono font-bold shadow-xl transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-[#FFE194]" />
          <span>Record New Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#120A0E] border-2 border-[#F5CE76]/25 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[#F5CE76] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search incidents by keyword, number, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#0A0608] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194] w-full sm:w-72"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#0A0608] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#FFE194]"
          >
            <option value="all">All Statutory Categories</option>
            <option value="refusals_alcohol_sales">Refusals of Alcohol Sales</option>
            <option value="police_council_visits">Police & Council Visits</option>
            <option value="ejections">Ejections</option>
            <option value="disorder_incidents">Disorder Incidents</option>
            <option value="drug_weapon_seizures">Drug & Weapon Seizures</option>
            <option value="cctv_faults">CCTV Faults</option>
          </select>
        </div>

        <div className="text-xs sm:text-sm font-mono text-[#FFE194] font-bold">
          Total Recorded: <strong className="text-white">{filteredIncidents.length}</strong>
        </div>
      </div>

      {/* Incidents Cards / Rows */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12 text-sm text-stone-300 rounded-2xl bg-[#120A0E] border-2 border-dashed border-[#F5CE76]/30 font-medium">
            No matching incidents recorded in the statutory log.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#120A0E] hover:bg-[#190D14] border-2 border-[#F5CE76]/30 transition-colors shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F5CE76]/20">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#FFE194]">
                    {inc.incidentNumber}
                  </span>
                  <span className="text-[#F5CE76]/50">·</span>
                  <span className="text-xs font-mono uppercase tracking-wider text-rose-200 bg-[#581625] px-2.5 py-0.5 rounded-lg border border-rose-400 font-bold">
                    {inc.categoryLabel}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs sm:text-sm text-stone-200 font-mono font-medium">
                  <span>
                    {new Date(inc.timestamp).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="text-emerald-300 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resolved
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="py-3 text-xs sm:text-sm text-stone-100 leading-relaxed font-medium">
                {inc.description}
              </div>

              {/* Action Taken & Metadata */}
              <div className="p-3.5 rounded-xl bg-[#090507] border-2 border-[#F5CE76]/20 space-y-1.5 text-xs sm:text-sm">
                <div>
                  <strong className="text-[#FFE194] font-mono text-xs uppercase font-bold">
                    Action Taken:
                  </strong>{' '}
                  <span className="text-stone-100 font-medium">{inc.actionTaken}</span>
                </div>

                {inc.personsInvolved && (
                  <div>
                    <strong className="text-stone-300 font-mono text-xs uppercase font-bold">
                      Persons Involved:
                    </strong>{' '}
                    <span className="text-stone-200">{inc.personsInvolved}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-stone-300 font-mono font-medium">
                  {inc.cctvReference && (
                    <span className="flex items-center gap-1 text-[#FFE194] font-bold">
                      <Camera className="w-4 h-4 text-[#F5CE76]" /> CCTV Ref: {inc.cctvReference}
                    </span>
                  )}

                  {inc.policeIncidentNumber && (
                    <span className="text-amber-300 font-bold">
                      CAD/Police Ref: {inc.policeIncidentNumber}
                    </span>
                  )}

                  <span className="ml-auto text-stone-400">
                    Logged by {inc.staffMemberName}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <IncidentLoggerModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setIncidents(clubStore.getIncidents());
        }}
        currentStaff={currentStaff}
      />
    </div>
  );
};
