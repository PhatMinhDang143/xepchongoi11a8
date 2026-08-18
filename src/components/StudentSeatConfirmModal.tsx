import React, { useState } from 'react';
import { Student, CurrentUser } from '../types';
import { 
  Armchair, 
  CheckCircle2, 
  X, 
  UserCheck, 
  AlertTriangle, 
  SunMedium, 
  DoorClosed,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface StudentSeatConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  seatId: string | null;
  currentUser: CurrentUser | null;
  students: Student[];
  assignments: Record<string, string>;
  onConfirmAssign: (seatId: string) => Promise<void>;
  onConfirmUnassign: (seatId: string) => Promise<void>;
}

export const StudentSeatConfirmModal: React.FC<StudentSeatConfirmModalProps> = ({
  isOpen,
  onClose,
  seatId,
  currentUser,
  students,
  assignments,
  onConfirmAssign,
  onConfirmUnassign,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !seatId || !currentUser || currentUser.role !== 'student' || !currentUser.student) {
    return null;
  }

  const student = currentUser.student;
  const occupiedStudentId = assignments[seatId];
  const isOccupiedByMe = occupiedStudentId === student.id;
  const isOccupiedByOther = Boolean(occupiedStudentId && !isOccupiedByMe);
  const otherStudent = isOccupiedByOther
    ? students.find((s) => s.id === occupiedStudentId)
    : null;

  // Parse seat details from seatId e.g. "r3-d1-s2"
  const match = seatId.match(/^r(\d+)-d(\d+)-s(\d+)$/);
  const rowNum = match ? parseInt(match[1], 10) : 1;
  const deskNum = match ? parseInt(match[2], 10) : 1;
  const seatPos = match ? parseInt(match[3], 10) : 1;
  const deskSideText = deskNum === 1 ? 'Dãy 1 (Bên Cửa Sổ)' : 'Dãy 2 (Bên Cửa Ra Vào)';
  const absoluteSeatNumber = (rowNum - 1) * 8 + (deskNum === 1 ? 0 : 4) + seatPos;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmAssign(seatId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmUnassign(seatId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Armchair className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-['Outfit',sans-serif]">
                Chi Tiết Chỗ Ngồi
              </h3>
              <p className="text-[11px] text-emerald-100">
                Ghế số #{absoluteSeatNumber} • Hàng {rowNum}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 text-xs">
          
          {/* Seat Position Details Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Vị trí:</span>
              <span className="font-bold text-slate-800">
                Hàng {rowNum} — Ghế số {seatPos}/4
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Khu vực:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                {deskNum === 1 ? <SunMedium className="w-3 h-3 text-amber-500" /> : <DoorClosed className="w-3 h-3 text-blue-500" />}
                {deskSideText}
              </span>
            </div>
          </div>

          {/* Student Context Card */}
          {isOccupiedByMe ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <UserCheck className="w-4 h-4" />
              </div>
              <p className="font-bold text-emerald-900 text-xs">
                Bạn ({student.name}) đang chọn vị trí này
              </p>
              <p className="text-[11px] text-emerald-700">
                Bạn có thể giữ nguyên hoặc bấm hủy để chọn ghế khác.
              </p>
            </div>
          ) : isOccupiedByOther ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="font-bold text-amber-900 text-xs">
                Chỗ này đã được chọn!
              </p>
              <p className="text-[11px] text-amber-800">
                Bạn <strong>{otherStudent?.name || 'học sinh khác'}</strong> đã đăng ký vị trí này. Vui lòng chọn một ghế còn trống.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-slate-700">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Bạn đang chọn chỗ cho:</span>
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {student.name} <span className="text-xs text-slate-500 font-normal">(STT #{student.orderNumber})</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Bấm nút xác nhận bên dưới để hệ thống ghi nhận ngay lập tức!
              </p>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
          {!isOccupiedByOther && !isOccupiedByMe && (
            <button
              id="btn-confirm-seat"
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'Đang lưu...' : 'XÁC NHẬN CHỌN CHỖ NGỒI NÀY'}</span>
            </button>
          )}

          {isOccupiedByMe && (
            <button
              type="button"
              onClick={handleUnassign}
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hủy Chọn Vị Trí Này (Chọn Ghế Khác)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl"
          >
            Đóng / Chọn Ghế Khác
          </button>
        </div>

      </div>
    </div>
  );
};
