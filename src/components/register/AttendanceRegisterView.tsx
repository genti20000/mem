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
      <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-cinzel text-base sm:text-lg font-bold tracking-[0.2em] text-[#780C1E]">
              AMICA SOHO
            </span>
            <span className="text-stone-300">·</span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Statutory Attendance Register
            </h1>
            {isAuthorityView && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono uppercase tracking-wider font-bold">
                Authority View
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            23 Frith Street Soho · 31-day premises licence compliance ledger under Licensing Act 2003.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Authority View Toggle */}
          <button
            onClick={() => setIsAuthorityView(!isAuthorityView)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isAuthorityView
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-700 hover:text-stone-950 border border-[#EDE7DF]'
            }`}
          >
            <Shield className="w-4 h-4 text-inherit" />
            <span>{isAuthorityView ? 'Authority View Active' : 'Authority Inspection Mode'}</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Print/PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#EDE7DF] text-stone-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Authority Notice if enabled */}
      {isAuthorityView && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <Shield className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900 text-sm">
              Westminster City Council & Police Authority Inspection Display
            </div>
            <div className="text-xs text-amber-800 mt-1 leading-relaxed font-medium">
              Displaying solely statutory door admission records: timestamps, attendee category, member identification numbers, named guests, and responsible SIA door supervisor. Private member contact notes and financial records are suppressed in accordance with GDPR and licensing inspection protocols.
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EDE7DF] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-700 font-semibold">
            <Calendar className="w-4 h-4 text-[#780C1E]" />
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs sm:text-sm font-mono text-stone-800 focus:outline-none focus:border-[#780C1E]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-700 font-semibold">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF8F5] border border-[#EDE7DF] rounded-xl text-xs sm:text-sm text-stone-800 focus:outline-none focus:border-[#780C1E]"
            >
              <option value="all">All Categories</option>
              <option value="member">Members</option>
              <option value="member_guest">Member Guests</option>
              <option value="proprietor_guest">Proprietor Guests</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-stone-500 font-semibold">
          Showing <span className="text-[#780C1E] font-bold">{filteredVisits.length}</span> records
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-2xl bg-white border border-[#EDE7DF] p-4 sm:p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#EDE7DF] text-stone-500 font-mono uppercase text-[11px] font-bold">
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">Admission Type</th>
              <th className="pb-3">Attendee Name</th>
              <th className="pb-3">Member ID</th>
              <th className="pb-3">Named Guests Accompanied</th>
              <th className="pb-3">Exit / Status</th>
              <th className="pb-3">Door Supervisor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDE7DF]">
            {filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400 font-mono text-xs">
                  No attendance records found for this date.
                </td>
              </tr>
            ) : (
              filteredVisits.map((v) => (
                <tr key={v.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3 font-mono font-bold text-stone-900 text-xs sm:text-sm">
                    {new Date(v.checkInTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        v.attendeeType === 'proprietor_guest'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : v.attendeeType === 'member_guest'
                          ? 'bg-purple-50 border-purple-200 text-purple-800'
                          : 'bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      {v.attendeeType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-stone-900 text-sm">
                    {v.memberName}
                  </td>
                  <td className="py-3 font-mono font-bold text-[#780C1E] text-xs sm:text-sm">
                    {v.memberNumber || '—'}
                  </td>
                  <td className="py-3 text-stone-600">
                    {v.guestNames && v.guestNames.length > 0 ? (
                      <div className="space-y-0.5">
                        {v.guestNames.map((g, idx) => (
                          <div key={idx} className="font-medium text-stone-800 text-xs">
                            · {g}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-400 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 font-mono font-semibold text-xs sm:text-sm">
                    {v.isCurrentlyInside ? (
                      v.isOutToSmoke ? (
                        <span className="text-amber-600 flex items-center gap-1 font-bold">
                          <Flame className="w-3.5 h-3.5 text-amber-600" /> Out to smoke
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Currently Inside</span>
                      )
                    ) : (
                      <span className="text-stone-500">
                        Out at {new Date(v.checkOutTime || '').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-stone-600 font-mono text-xs">
                    {v.responsibleStaffName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Hourly Capacity Snapshots & Audit Log */}
      <div className="rounded-2xl bg-white border border-[#EDE7DF] p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DF]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#780C1E]" />
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Statutory Hourly Occupancy Record (Max 80 Customers)
            </h2>
          </div>
          <button
            onClick={() => clubStore.recordHourlyCapacitySnapshot()}
            className="px-3.5 py-1.5 rounded-xl bg-[#780C1E] hover:bg-[#8E1026] text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            + Snapshot Now
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {hourlyCapacities.slice(0, 5).map((cap) => (
            <div
              key={cap.id}
              className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EDE7DF] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
                <span>
                  {new Date(cap.timestamp).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">Compliant</span>
              </div>

              <div className="my-2">
                <div className="font-mono text-2xl font-bold text-stone-900">
                  {cap.customerCount} <span className="text-xs text-stone-400 font-normal">/ 80</span>
                </div>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-[#780C1E]"
                    style={{ width: `${(cap.customerCount / 80) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] text-stone-500 font-mono space-y-0.5 pt-1.5 border-t border-[#EDE7DF]">
                <div>Members: {cap.membersCount} · Guests: {cap.memberGuestsCount}</div>
                <div>Proprietor: {cap.proprietorGuestsCount} · Smokers: {cap.smokersOutside}</div>
                <div>Staff: {cap.staffCount}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
