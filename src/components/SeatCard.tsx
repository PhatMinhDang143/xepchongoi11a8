import React, { useState } from 'react';
import { Student, CurrentUser } from '../types';
import { UserPlus, UserCheck } from 'lucide-react';

interface SeatCardProps {
  seatId: string;
  rowNumber: number;
  tableSide?: 'left' | 'right';
  seatPositionInTable: number; // 1 to 4
  absoluteSeatNumber: number;
  assignedStudent?: Student;
  isLocked: boolean;
  currentUser: CurrentUser | null;
  onSelectSeat: (seatId: string) => void;
  onUnassignSeat: (seatId: string) => void;
  onDropStudent: (seatId: string, studentId: string) => void;
  highlightedStudentId?: string | null;
  selectedStudentForPlacement?: Student | null;
  onShowNotice?: (message: string, type?: 'info' | 'warn' | 'success') => void;
}

export const SeatCard: React.FC<SeatCardProps> = ({
  seatId,
  seatPositionInTable,
  assignedStudent,
  isLocked,
  currentUser,
  onSelectSeat,
  onUnassignSeat,
  onDropStudent,
  highlightedStudentId,
  selectedStudentForPlacement,
  onShowNotice,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const isTeacher = currentUser?.role === 'teacher';
  const myStudentId = currentUser?.role === 'student' ? currentUser.student?.id : null;
  const isMySeat = Boolean(assignedStudent && myStudentId && assignedStudent.id === myStudentId);
  const canEditThisSeat = isTeacher || isMySeat || (!assignedStudent && Boolean(myStudentId));

  const handleDragOver = (e: React.DragEvent) => {
    if (isLocked) return;
    if (!canEditThisSeat) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isLocked) return;
    e.preventDefault();
    setIsDragOver(false);
    
    const studentId = e.dataTransfer.getData('text/plain');
    if (!studentId) return;

    // Permissions check: Student can only place themselves
    if (!isTeacher && myStudentId && studentId !== myStudentId) {
      onShowNotice?.('Bạn chỉ có thể kéo thả và đổi chỗ cho chính bạn!', 'warn');
      return;
    }

    if (studentId) {
      onDropStudent(seatId, studentId);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked || !assignedStudent) return;
    // Student can only drag their own card
    if (!isTeacher && !isMySeat) {
      e.preventDefault();
      onShowNotice?.('Bạn không thể di chuyển vị trí của bạn khác!', 'warn');
      return;
    }

    e.dataTransfer.setData('text/plain', assignedStudent.id);
    e.dataTransfer.setData('sourceSeatId', seatId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    if (isLocked) {
      onShowNotice?.('Sơ đồ lớp học đang được khóa', 'warn');
      return;
    }

    // Teacher mode: Full modal
    if (isTeacher) {
      if (selectedStudentForPlacement && !assignedStudent) {
        onDropStudent(seatId, selectedStudentForPlacement.id);
      } else {
        onSelectSeat(seatId);
      }
      return;
    }

    // Student mode:
    if (myStudentId) {
      // 1. If this is an empty seat -> Place me here!
      if (!assignedStudent) {
        onDropStudent(seatId, myStudentId);
        return;
      }

      // 2. If this is my own seat -> Confirm unseat or view
      if (isMySeat) {
        if (window.confirm(`Bạn có muốn bỏ chọn vị trí này (${assignedStudent.name}) không?`)) {
          onUnassignSeat(seatId);
        }
        return;
      }

      // 3. If this seat belongs to someone else
      onShowNotice?.(`Ghế này đã có bạn ${assignedStudent.name} ngồi. Bạn chỉ có thể chọn ghế trống cho chính mình!`, 'warn');
    }
  };

  const isHighlighted = assignedStudent && highlightedStudentId === assignedStudent.id;
  const isAwaitingPlacement = Boolean(
    !assignedStudent && (
      (currentUser?.role === 'student' && myStudentId) ||
      (selectedStudentForPlacement && isTeacher)
    )
  );

  // Extract concise name on 1 line
  const getDisplayStudentName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  };

  const shortName = assignedStudent ? getDisplayStudentName(assignedStudent.name) : '';

  return (
    <div
      id={`seat-${seatId}`}
      data-seat-id={seatId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative rounded-md sm:rounded-lg transition-all duration-150 select-none flex items-center justify-center text-center px-1 py-1.5 min-h-[38px] sm:min-h-[42px] w-full border ${
        assignedStudent
          ? isMySeat
            ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-400 shadow-xs'
            : isHighlighted
            ? 'border-indigo-500 ring-2 ring-indigo-300 bg-indigo-50 shadow-sm'
            : isDragOver
            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
            : 'bg-white border-slate-300 shadow-2xs hover:border-slate-400'
          : `border-dashed ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300 animate-pulse'
                : isAwaitingPlacement
                ? 'border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100 hover:border-emerald-600'
                : 'border-slate-300 bg-slate-50/80 hover:border-emerald-400 hover:bg-emerald-50'
            }`
      } ${!isLocked ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
    >
      {assignedStudent ? (
        <div
          draggable={!isLocked && (isTeacher || isMySeat)}
          onDragStart={handleDragStart}
          className="w-full flex items-center justify-center gap-1 min-w-0"
        >
          {/* STT Badge */}
          <span
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded ${
              isMySeat
                ? 'bg-emerald-600 text-white ring-1 ring-emerald-700'
                : `bg-gradient-to-tr ${assignedStudent.avatarColor || 'from-emerald-500 to-teal-600'} text-white`
            } font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0 leading-none`}
          >
            {assignedStudent.orderNumber}
          </span>
          {/* Student Name */}
          <span className={`text-[10px] sm:text-xs font-bold truncate whitespace-nowrap tracking-tight ${
            isMySeat ? 'text-emerald-900 font-black' : 'text-slate-800'
          }`}>
            {isMySeat ? `★ ${shortName}` : shortName}
          </span>
        </div>
      ) : (
        /* Empty Seat */
        <div className={`w-full flex items-center justify-center gap-0.5 ${
          isAwaitingPlacement ? 'text-emerald-700 font-bold' : 'text-slate-400'
        }`}>
          <UserPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          <span className="text-[9px] sm:text-[10px] font-semibold truncate whitespace-nowrap">
            {isAwaitingPlacement && myStudentId ? 'Chọn chỗ này' : `Chỗ ${seatPositionInTable}`}
          </span>
        </div>
      )}
    </div>
  );
};
