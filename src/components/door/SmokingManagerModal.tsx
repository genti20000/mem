import React, { useState } from 'react';
import { X, Flame, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { SmokingPatron, VisitRecord, StaffUser } from '../../types';
import { clubStore } from '../../services/storage';
import { MAX_SMOKERS_OUTSIDE, validateSmokingExit } from '../../services/ruleEngine';

interface SmokingManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaff: StaffUser;
}

export const SmokingManagerModal: React.FC<SmokingManagerModalProps> = ({
  isOpen,
  onClose,
  currentStaff,
}) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const smokingPatrons = clubStore.getSmokingPatrons();
  const currentCount = smokingPatrons.length;
  const isFull = currentCount >= MAX_SMOKERS_OUTSIDE;

  // Active checked-in patrons currently inside who are not already smoking
  const activeVisits = clubStore
    .getVisits()
    .filter((v) => v.isCurrentlyInside && !v.isOutToSmoke);

  const filteredVisits = activeVisits.filter(
    (v) =>
      v.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.memberNumber && v.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMarkOutToSmoke = (visit: VisitRecord) => {
    setErrorMessage(null);
    const validation = validateSmokingExit(currentCount);
    if (!validation.allowed) {
      setErrorMessage(validation.reason || 'Smoking capacity reached.');
      return;
    }

    clubStore.markOutToSmoke({
      visitId: visit.id,
      name: `${visit.memberName} (${visit.attendeeType === 'member' ? 'Member' : 'Guest'})`,
      type: visit.attendeeType === 'proprietor_guest' ? 'proprietor_guest' : visit.attendeeType === 'member_guest' ? 'guest' : 'member',
    });

    clubStore.addAuditLog({
      actorId: currentStaff.id,
      actorName: currentStaff.name,
      actorRole: currentStaff.role,
      action: 'SMOKING_EXIT',
      targetType: 'smoking',
      targetId: visit.id,
      targetName: visit.memberName,
      newValue: `Smokers: ${currentCount + 1} / ${MAX_SMOKERS_OUTSIDE}`,
    });

    setSelectedVisitId('');
  };

  const handleMarkReturned = (patron: SmokingPatron) => {
    setErrorMessage(null);
    clubStore.markSmokingReturned(patron.id);

    clubStore.addAuditLog({
      actorId: currentStaff.id,
      actorName: currentStaff.name,
      actorRole: currentStaff.role,
      action: 'SMOKING_RETURN',
      targetType: 'smoking',
      targetId: patron.id,
      targetName: patron.name,
      newValue: `Smokers: ${currentCount - 1} / ${MAX_SMOKERS_OUTSIDE}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#120A0E] border-2 border-[#F5CE76]/45 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#8E0E24] via-[#4A0813] to-[#1E0912] border-b border-[#F5CE76]/30 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/40 border border-[#F5CE76]/50 flex items-center justify-center text-amber-300 shadow-inner">
              <Flame className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#FFE194] font-bold">
                AMICA LATE · TERRACE
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
                Frith Street Smoking Area
              </h2>
              <div className="text-xs text-stone-200 font-medium">
                Licensing Condition: Max {MAX_SMOKERS_OUTSIDE} patrons outside at any one time
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-2 rounded-xl bg-black/30 border border-[#F5CE76]/30 hover:bg-black/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#FFE194]" />
          </button>
        </div>

        {/* Live Capacity Gauge */}
        <div className="p-4 bg-[#180E14] border-b border-[#F5CE76]/25">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#FFE194] font-bold">
              Current Smokers Outside
            </span>
            <span
              className={`font-mono text-lg font-extrabold ${
                isFull ? 'text-rose-400' : currentCount >= 8 ? 'text-amber-400' : 'text-[#FFE194]'
              }`}
            >
              {currentCount} / {MAX_SMOKERS_OUTSIDE}
            </span>
          </div>

          <div className="w-full bg-[#0A0608] h-3.5 rounded-full overflow-hidden border border-[#F5CE76]/30">
            <div
              className={`h-full transition-all duration-300 ${
                isFull ? 'bg-rose-600' : currentCount >= 8 ? 'bg-amber-500' : 'bg-gradient-to-r from-[#F5CE76] to-[#FFE194]'
              }`}
              style={{ width: `${Math.min(100, (currentCount / MAX_SMOKERS_OUTSIDE) * 100)}%` }}
            />
          </div>

          {isFull && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-100 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
              <span>
                <strong>Smoking Terrace Full:</strong> Further exits are strictly blocked by system logic until someone returns.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-100 text-xs sm:text-sm font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Content Body: Split into Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F5CE76]/20 flex-1 overflow-y-auto">
          {/* Left Column: Currently Outside (One tap return) */}
          <div className="p-4 flex flex-col">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-300" />
              Currently Outside ({currentCount})
            </h3>

            {smokingPatrons.length === 0 ? (
              <div className="text-center py-10 text-xs sm:text-sm text-stone-400 border border-dashed border-[#F5CE76]/25 rounded-xl my-auto font-mono">
                No patrons currently outside.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                {smokingPatrons.map((patron) => {
                  const exitTime = new Date(patron.exitTimestamp);
                  const minutesOut = Math.floor((Date.now() - exitTime.getTime()) / 60000);
                  const isOvertime = minutesOut >= 10;

                  return (
                    <div
                      key={patron.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${
                        isOvertime
                          ? 'bg-rose-950/50 border-rose-500/80'
                          : 'bg-[#180E14] border-[#F5CE76]/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {patron.name}
                        </div>
                        <div className="text-xs font-mono text-stone-300 mt-0.5">
                          Out for {minutesOut}m {isOvertime && '(exceeds 10m guidance)'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkReturned(patron)}
                        className="px-3 py-1.5 rounded-lg bg-[#8E0E24] hover:bg-[#B51330] border border-[#F5CE76]/60 text-white text-xs font-mono font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Returned
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Send Patron Out */}
          <div className="p-4 flex flex-col">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#FFE194] mb-1">
              Send Patron Out to Smoke
            </h3>
            <p className="text-xs text-stone-300 mb-3">
              Select any currently checked-in patron to authorise a 10-minute temporary smoking exit.
            </p>

            <input
              type="text"
              placeholder="Search patron or member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isFull}
              className="w-full mb-3 px-3.5 py-2.5 bg-[#0A0608] border border-[#F5CE76]/35 rounded-xl text-sm sm:text-base text-white placeholder-stone-400 font-mono focus:outline-none focus:border-[#FFE194] disabled:opacity-50"
            />

            <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1 flex-1">
              {filteredVisits.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-stone-400 border border-dashed border-[#F5CE76]/25 rounded-xl">
                  {searchTerm ? 'No matching patrons inside.' : 'No other patrons currently inside.'}
                </div>
              ) : (
                filteredVisits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-[#180E14] hover:bg-[#251520] border border-[#F5CE76]/25 flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{v.memberName}</div>
                      <div className="text-xs text-[#FFE194] font-mono">
                        {v.memberNumber || v.attendeeType.replace('_', ' ')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkOutToSmoke(v)}
                      disabled={isFull}
                      className="px-3 py-1.5 rounded-lg bg-[#8E0E24] hover:bg-[#B51330] border border-[#F5CE76]/50 text-white text-xs font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                    >
                      <span>Exit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#0D070B] border-t border-[#F5CE76]/25 flex justify-between items-center text-xs text-stone-300">
          <span>Responsible Door Supervisor: <strong className="text-white">{currentStaff.name}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#20131A] border border-[#F5CE76]/40 text-xs sm:text-sm font-bold text-white hover:bg-[#2C1A24] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
