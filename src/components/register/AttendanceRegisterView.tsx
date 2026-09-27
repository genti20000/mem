import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Shield,
  Eye,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { VisitRecord, CapacitySnapshot } from '../../types';
import { clubStore } from '../../services/storage';

export const AttendanceRegisterView: React.FC = () => {
  const [isAuthorityView, setIsAuthorityView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const visits = clubStore.getVisits();
  const hourlyCapacities = clubStore.getHourlyCapacities();
  const stats = clubStore.getCapacityStats();

  const filteredVisits = visits.filter((v) => {
    const matchesDate = !selectedDate || v.date === selectedDate;
    const matchesCategory =
      categoryFilter === 'all' || v.attendeeType === categoryFilter;
    return matchesDate && matchesCategory;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Date',
      'Category',
      'Attendee Name',
      'Member Number',
      'Named Guests',
      'Check-In Time',
      'Check-Out Time',
      'Currently Inside',
      'Responsible Staff',
    ];

    const rows = filteredVisits.map((v) => [
      v.id,
      v.date,
      v.attendeeType,
      `"${v.memberName.replace(/"/g, '""')}"`,
      v.memberNumber || 'N/A',
      `"${(v.guestNames || []).join('; ')}"`,
      v.checkInTime,
      v.checkOutTime || 'Active Inside',
      v.isCurrentlyInside ? 'YES' : 'NO',
      `"${v.responsibleStaffName}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `AMICA_LATE_ATTENDANCE_${selectedDate || 'ALL'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Inspection Authority View
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner & Authority Mode Toggle */}
      <div className="rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/35 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-script text-2xl sm:text-3xl font-bold text-[#FFE194]">
              Amica
            </span>
            <span className="font-cinzel text-xs sm:text-sm font-extrabold tracking-[2px] text-[#F5CE76]">
              LATE
            </span>
            <span className="text-xs text-[#F5CE76]/40 hidden sm:inline">·</span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Statutory Attendance Register
            </h1>
            {isAuthorityView && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/30 text-amber-200 border border-amber-500 text-xs font-mono uppercase tracking-wider font-bold">
                Authority View
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-200 mt-1 font-medium">
            Sub: <span className="text-[#FFE194] font-bold">Jonny&apos;s Late Show</span> · 23 Frith Street Soho · 31-day premises licence compliance ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Authority View Toggle */}
          <button
            onClick={() => setIsAuthorityView(!isAuthorityView)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
              isAuthorityView
                ? 'bg-amber-400 text-black border-2 border-amber-300'
                : 'bg-[#1E1117] text-[#FFE194] hover:text-white border border-[#F5CE76]/40'
            }`}
          >
            <Shield className="w-4 h-4 text-inherit" />
            <span>{isAuthorityView ? 'Authority View (Active)' : 'Authority Inspection View'}</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white text-xs font-mono font-bold transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Print/PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E1117] hover:bg-[#2A1822] border border-[#F5CE76]/40 text-stone-100 text-xs font-mono font-bold transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Authority Notice if enabled */}
      {isAuthorityView && (
        <div className="p-4 rounded-xl bg-[#23150D] border-2 border-amber-500 text-amber-100 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
          <Shield className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300 text-sm">
              Westminster City Council & Police Authority Inspection Display
            </div>
            <div className="text-xs text-amber-200 mt-1 leading-relaxed font-medium">
              Displaying solely statutory door admission records: timestamps, attendee category, member identification numbers, named guests, and responsible SIA door supervisor. Private member contact notes and financial records are suppressed in accordance with GDPR and licensing inspection protocols.
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#120A0E] border border-[#F5CE76]/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-200 font-bold">
            <Calendar className="w-4 h-4 text-[#F5CE76]" />
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-[#FFE194]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-200 font-bold">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0A0608] border border-[#F5CE76]/40 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-[#FFE194]"
            >
              <option value="all">All Categories</option>
              <option value="member">Members</option>
              <option value="member_guest">Member Guests</option>
              <option value="proprietor_guest">Proprietor Guests</option>
            </select>
          </div>
        </div>

        <div className="text-xs sm:text-sm font-mono text-stone-200 font-bold">
          Showing <span className="text-[#FFE194]">{filteredVisits.length}</span> records
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-2xl bg-[#120A0E] border border-[#F5CE76]/30 p-4 sm:p-5 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#F5CE76]/25 text-[#FFE194] font-mono uppercase text-xs font-bold">
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">Admission Type</th>
              <th className="pb-3">Attendee Name</th>
              <th className="pb-3">Member ID</th>
              <th className="pb-3">Named Guests Accompanied</th>
              <th className="pb-3">Exit / Status</th>
              <th className="pb-3">Door Supervisor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5CE76]/15">
            {filteredVisits.map((v) => (
              <tr key={v.id} className="hover:bg-[#1E1117] transition-colors">
                <td className="py-3 font-mono font-bold text-white text-xs sm:text-sm">
                  {new Date(v.checkInTime).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg border ${
                      v.attendeeType === 'proprietor_guest'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                        : v.attendeeType === 'member_guest'
                        ? 'bg-[#3A1428] border-pink-500/50 text-pink-300'
                        : 'bg-[#2A0F17] border-[#F5CE76]/60 text-[#FFE194]'
                    }`}
                  >
                    {v.attendeeType.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 font-bold text-white text-sm">
                  {v.memberName}
                </td>
                <td className="py-3 font-mono font-bold text-[#FFE194] text-xs sm:text-sm">
                  {v.memberNumber || '—'}
                </td>
                <td className="py-3 text-stone-200">
                  {v.guestNames && v.guestNames.length > 0 ? (
                    <div className="space-y-0.5">
                      {v.guestNames.map((g, idx) => (
                        <div key={idx} className="font-semibold text-white text-xs">
                          · {g}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-400 font-mono">—</span>
                  )}
                </td>
                <td className="py-3 font-mono font-bold text-xs sm:text-sm">
                  {v.isCurrentlyInside ? (
                    v.isOutToSmoke ? (
                      <span className="text-amber-300 flex items-center gap-1 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-400" /> Out to smoke
                      </span>
                    ) : (
                      <span className="text-emerald-300">Currently Inside</span>
                    )
                  ) : (
                    <span className="text-stone-300">
                      Out at {new Date(v.checkOutTime || '').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </td>
                <td className="py-3 text-stone-200 font-mono text-xs">
                  {v.responsibleStaffName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hourly Capacity Snapshots & Audit Log */}
      <div className="rounded-2xl bg-[#120A0E] border border-[#F5CE76]/30 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5CE76]/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F5CE76]" />
            <h2 className="font-serif text-lg font-bold text-white">
              Statutory Hourly Occupancy Record (Max 80 Customers)
            </h2>
          </div>
          <button
            onClick={() => clubStore.recordHourlyCapacitySnapshot()}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8E0E24] to-[#4A0813] hover:from-[#B51330] hover:to-[#680A18] border border-[#F5CE76] text-white text-xs font-mono font-bold cursor-pointer"
          >
            + Snapshot Now
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {hourlyCapacities.slice(0, 5).map((cap) => (
            <div
              key={cap.id}
              className="p-3.5 rounded-xl bg-[#0E0C0E] border border-[#2B0A13] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                <span>
                  {new Date(cap.timestamp).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-[10px] text-emerald-400">Compliant</span>
              </div>

              <div className="my-2">
                <div className="font-mono text-2xl font-bold text-[#E5C378]">
                  {cap.customerCount} <span className="text-xs text-stone-500">/ 80</span>
                </div>
                <div className="w-full bg-[#1C1417] h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-[#C6A052]"
                    style={{ width: `${(cap.customerCount / 80) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] text-stone-400 font-mono space-y-0.5 pt-1 border-t border-[#1C0E14]">
                <div>Members: {cap.membersCount} · Guests: {cap.memberGuestsCount}</div>
                <div>Proprietor: {cap.proprietorGuestsCount} · Smokers: {cap.smokersOutside}</div>
                <div>Staff (excluded): {cap.staffCount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
