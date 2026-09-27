import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { IncidentCategory, IncidentRecord, StaffUser } from '../../types';
import { clubStore } from '../../services/storage';

interface IncidentLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaff: StaffUser;
}

const INCIDENT_CATEGORIES: { id: IncidentCategory; label: string }[] = [
  { id: 'crimes_reported', label: 'Crimes Reported to Venue' },
  { id: 'ejections', label: 'Ejections of Patrons' },
  { id: 'complaints_crime_disorder', label: 'Complaints Concerning Crime/Disorder' },
  { id: 'disorder_incidents', label: 'Incidents of Disorder' },
  { id: 'drug_weapon_seizures', label: 'Drug or Offensive-Weapon Seizures' },
  { id: 'cctv_faults', label: 'CCTV Faults or Outages' },
  { id: 'scanning_equipment_faults', label: 'Searching/Scanning Equipment Faults' },
  { id: 'refusals_alcohol_sales', label: 'Refusals of Alcohol Sales' },
  { id: 'police_council_visits', label: 'Visits from Police, Council or Emergency Services' },
];

export const IncidentLoggerModal: React.FC<IncidentLoggerModalProps> = ({
  isOpen,
  onClose,
  currentStaff,
}) => {
  const [category, setCategory] = useState<IncidentCategory>('refusals_alcohol_sales');
  const [description, setDescription] = useState('');
  const [personsInvolved, setPersonsInvolved] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [cctvReference, setCctvReference] = useState('');
  const [policeIncidentNumber, setPoliceIncidentNumber] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !actionTaken.trim()) return;

    const categoryObj = INCIDENT_CATEGORIES.find((c) => c.id === category);
    const incidentNumber = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newIncident: IncidentRecord = {
      id: `inc-${Date.now()}`,
      incidentNumber,
      timestamp: new Date().toISOString(),
      category,
      categoryLabel: categoryObj?.label || category,
      description: description.trim(),
      personsInvolved: personsInvolved.trim() || undefined,
      actionTaken: actionTaken.trim(),
      staffMemberId: currentStaff.id,
      staffMemberName: currentStaff.name,
      cctvReference: cctvReference.trim() || undefined,
      policeIncidentNumber: policeIncidentNumber.trim() || undefined,
      isResolved: true,
      createdAt: new Date().toISOString(),
    };

    clubStore.addIncident(newIncident, currentStaff);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#8E0E24] via-[#581625] to-[#34050D] border-b-2 border-[#F5CE76]/35 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/50 border-2 border-[#F5CE76] flex items-center justify-center text-[#FFE194] shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-script text-xl sm:text-2xl font-bold text-[#FFE194]">Amica</span>
                <span className="font-cinzel text-xs font-bold text-[#F5CE76]">LATE</span>
                <span className="text-white/40">·</span>
                <h2 className="font-serif text-base sm:text-lg font-bold text-white">
                  Licensing Incident Register
                </h2>
              </div>
              <div className="text-xs text-stone-200 font-medium">
                Westminster Police & Licensing Inspection Compliance
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-2 rounded-xl hover:bg-black/40 border border-transparent hover:border-[#F5CE76]/30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-[#FFE194] font-bold mb-1.5">
              Incident Statutory Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory)}
              className="w-full px-3.5 py-2.5 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-[#FFE194]"
            >
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#120A0E] text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-200 font-bold mb-1.5">
              Incident Summary & Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the event, location within venue, observations..."
              className="w-full px-3.5 py-2.5 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-200 font-bold mb-1.5">
                Persons Involved (Optional)
              </label>
              <input
                type="text"
                value={personsInvolved}
                onChange={(e) => setPersonsInvolved(e.target.value)}
                placeholder="Names, descriptions, or member IDs"
                className="w-full px-3.5 py-2 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-200 font-bold mb-1.5">
                CCTV Camera Reference
              </label>
              <input
                type="text"
                value={cctvReference}
                onChange={(e) => setCctvReference(e.target.value)}
                placeholder="e.g. CAM-01-ENTRANCE-2345"
                className="w-full px-3.5 py-2 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-200 font-bold mb-1.5">
              Immediate Action Taken & Resolution *
            </label>
            <textarea
              required
              rows={2}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="e.g. Refused service, escorted to Frith St, supervisor notified, taxi hailed..."
              className="w-full px-3.5 py-2 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-mono uppercase tracking-wider text-stone-200 font-bold mb-1.5">
              CAD / Police CAD Number (If Emergency Services Attended)
            </label>
            <input
              type="text"
              value={policeIncidentNumber}
              onChange={(e) => setPoliceIncidentNumber(e.target.value)}
              placeholder="e.g. MET-CAD-5921/25SEP26"
              className="w-full px-3.5 py-2 bg-[#090507] border-2 border-[#F5CE76]/35 rounded-xl text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-[#FFE194]"
            />
          </div>

          <div className="pt-3 border-t border-[#F5CE76]/20 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs sm:text-sm text-stone-300">
            <span>Logging Officer: <strong className="text-white">{currentStaff.name} ({currentStaff.badgeNumber})</strong></span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#201018] hover:bg-[#2C1822] text-stone-200 font-bold border border-[#F5CE76]/30 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#A8102B] hover:to-[#5E0B1A] text-white border-2 border-[#F5CE76] font-bold font-serif shadow-lg cursor-pointer active:scale-95"
              >
                Commit to Incident Log
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
