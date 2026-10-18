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
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.2em] text-[#780C1E]">
              AMICA SOHO
            </span>
            <span className="text-stone-300">·</span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Statutory Incident Register
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono uppercase tracking-wider font-bold">
              s.141 Log
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            23 Frith Street Soho · Mandatory statutory log of crimes, ejections, disorder, and refusals.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Record New Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE7DF] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search incidents by keyword, number, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#780C1E] w-full sm:w-72"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs sm:text-sm text-stone-800 font-medium focus:outline-none focus:border-[#780C1E]"
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

        <div className="text-xs font-mono text-stone-500 font-semibold">
          Total Recorded: <strong className="text-stone-900">{filteredIncidents.length}</strong>
        </div>
      </div>

      {/* Incidents Cards / Rows */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12 text-sm text-stone-400 rounded-2xl bg-white border border-dashed border-[#EDE7DF] font-medium">
            No matching incidents recorded in the statutory log.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-2xl bg-white border border-[#EDE7DF] transition-colors shadow-xs hover:border-stone-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EDE7DF]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#780C1E]">
                    {inc.incidentNumber}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 font-semibold">
                    {inc.categoryLabel}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-500 font-mono font-medium">
                  <span>
                    {new Date(inc.timestamp).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="py-3 text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                {inc.description}
              </div>

              {/* Action Taken & Metadata */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] space-y-1.5 text-xs sm:text-sm">
                <div>
                  <strong className="text-stone-700 font-mono text-xs uppercase font-bold">
                    Action Taken:
                  </strong>{' '}
                  <span className="text-stone-800 font-medium">{inc.actionTaken}</span>
                </div>

                {inc.personsInvolved && (
                  <div>
                    <strong className="text-stone-500 font-mono text-xs uppercase font-bold">
                      Persons Involved:
                    </strong>{' '}
                    <span className="text-stone-700">{inc.personsInvolved}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-stone-500 font-mono font-medium">
                  {inc.cctvReference && (
                    <span className="flex items-center gap-1 text-[#780C1E] font-bold">
                      <Camera className="w-3.5 h-3.5 text-[#780C1E]" /> CCTV Ref: {inc.cctvReference}
                    </span>
                  )}

                  {inc.policeIncidentNumber && (
                    <span className="text-amber-800 font-bold">
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
