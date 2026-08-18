import React, { useState } from 'react';
import { Student } from '../types';
import { X, Search, Check, UserCheck, Trash2 } from 'lucide-react';

interface SeatSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  seatId: string | null;
  targetStudent: Student | null;
  students: Student[];
  assignments: Record<string, string>;
  onAssign: (seatId: string, studentId: string) => void;
  onUnassignSeat: (seatId: string) => void;
}

export const SeatSelectionModal: React.FC<SeatSelectionModalProps> = ({
  isOpen,
  onClose,
  seatId,
  targetStudent,
  students,
  assignments,
  onAssign,
  onUnassignSeat,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const formatSeatTitle = (id: string) => {
    const match = id.match(/r(\d+)-d(\d+)-s(\d+)/);
    if (!match) return id;
    const [, row, desk, pos] = match;
    const deskName = desk === '1' ? 'Dãy 1 (Cửa sổ)' : 'Dãy 2 (Cửa vào)';
    return `Hàng ${row} • ${deskName} • Vị trí ${pos}`;
  };

  const currentAssignedStudentId = seatId ? assignments[seatId] : null;
  const currentStudent = currentAssignedStudentId
    ? students.find((s) => s.id === currentAssignedStudentId)
    : null;

  const filteredStudents = students.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.orderNumber.toString() === q ||
        `#${s.orderNumber}` === q
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
              {targetStudent ? `Chọn chỗ cho ${targetStudent.name}` : 'Chọn học sinh cho ghế này'}
            </h3>
            <p className="text-xs text-emerald-700 font-medium mt-0.5">
              {seatId && formatSeatTitle(seatId)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Occupant (if any) */}
        {currentStudent && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <span className="text-amber-800 font-medium">Đang ngồi: </span>
              <strong className="text-slate-900">{currentStudent.name} (#{currentStudent.orderNumber})</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                if (seatId) onUnassignSeat(seatId);
                onClose();
              }}
              className="text-rose-700 font-bold text-xs px-2 py-1 bg-white rounded border border-rose-200 shrink-0 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Bỏ chọn
            </button>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập tên hoặc số STT học sinh..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-2 overflow-y-auto flex-1 space-y-1 divide-y divide-slate-100 max-h-[50vh]">
          {filteredStudents.map((student) => {
            const existingSeatId = Object.entries(assignments).find(
              ([, sid]) => sid === student.id
            )?.[0];
            const isCurrentlySelected = currentAssignedStudentId === student.id;

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => {
                  if (seatId) {
                    onAssign(seatId, student.id);
                    onClose();
                  }
                }}
                className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-all ${
                  isCurrentlySelected
                    ? 'bg-emerald-50 border border-emerald-300'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`w-6 h-6 rounded-md bg-gradient-to-tr ${
                      student.avatarColor || 'from-emerald-500 to-teal-600'
                    } text-white font-bold text-[10px] flex items-center justify-center shrink-0`}
                  >
                    {student.orderNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {student.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {existingSeatId ? (
                        <span className="text-amber-700 font-medium">
                          Đổi từ {formatSeatTitle(existingSeatId)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Chưa có chỗ</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isCurrentlySelected ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Đang ngồi
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 transition-colors">
                      Chọn
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
