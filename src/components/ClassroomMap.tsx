import React from 'react';
import { Student, ClassroomState, CurrentUser } from '../types';
import { SeatCard } from './SeatCard';
import { DoorClosed, SunMedium } from 'lucide-react';

interface ClassroomMapProps {
  state: ClassroomState;
  students: Student[];
  currentUser: CurrentUser | null;
  onSelectSeat: (seatId: string) => void;
  onUnassignSeat: (seatId: string) => void;
  onDropStudent: (seatId: string, studentId: string) => void;
  highlightedStudentId?: string | null;
  selectedStudentForPlacement?: Student | null;
  onShowNotice?: (message: string, type?: 'info' | 'warn' | 'success') => void;
}

export const ClassroomMap: React.FC<ClassroomMapProps> = ({
  state,
  students,
  currentUser,
  onSelectSeat,
  onUnassignSeat,
  onDropStudent,
  highlightedStudentId,
  selectedStudentForPlacement,
  onShowNotice,
}) => {
  const { layoutConfig, assignments, isLocked } = state;
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const rows = Array.from({ length: layoutConfig.rows }, (_, i) => i + 1);

  return (
    <div className="w-full bg-slate-100/90 border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-inner">
      
      {/* Visual Header */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1 pb-1.5 border-b border-slate-200/80 mb-2.5">
        <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <SunMedium className="w-3 h-3" />
          <span>Dãy 1 (Cửa sổ)</span>
        </div>

        <div className="text-[10px] text-slate-400 font-mono tracking-wider">
          LỐI ĐI
        </div>

        <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          <DoorClosed className="w-3 h-3" />
          <span>Dãy 2 (Cửa vào)</span>
        </div>
      </div>

      {/* 6 Classroom Rows (Hàng 1 -> Hàng 6) */}
      <div className="space-y-2 sm:space-y-2.5">
        {rows.map((rowNum) => {
          const baseIndex = (rowNum - 1) * 8;

          return (
            <div 
              key={`row-${rowNum}`}
              className="bg-white border border-slate-200/90 rounded-xl p-1.5 sm:p-2 shadow-2xs"
            >
              {/* Row Label */}
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider font-['Outfit',sans-serif]">
                  Hàng {rowNum}
                </span>
                <span className="text-[9px] text-slate-400">
                  Bàn 4 chỗ ngang
                </span>
              </div>

              {/* Row Grid: Left Desk (4 seats horizontal) | Aisle | Right Desk (4 seats horizontal) */}
              <div className="grid grid-cols-[1fr_6px_1fr] sm:grid-cols-[1fr_12px_1fr] gap-1 items-center">
                
                {/* Left Desk: 4 seats in 1 straight horizontal line */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-1">
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((pos) => {
                      const seatId = `r${rowNum}-d1-s${pos}`;
                      const absNumber = baseIndex + pos;
                      const studentId = assignments[seatId];
                      const student = studentId ? studentMap.get(studentId) : undefined;

                      return (
                        <SeatCard
                          key={seatId}
                          seatId={seatId}
                          rowNumber={rowNum}
                          tableSide="left"
                          seatPositionInTable={pos}
                          absoluteSeatNumber={absNumber}
                          assignedStudent={student}
                          isLocked={isLocked}
                          currentUser={currentUser}
                          onSelectSeat={onSelectSeat}
                          onUnassignSeat={onUnassignSeat}
                          onDropStudent={onDropStudent}
                          highlightedStudentId={highlightedStudentId}
                          selectedStudentForPlacement={selectedStudentForPlacement}
                          onShowNotice={onShowNotice}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Middle Aisle */}
                <div className="h-full flex items-center justify-center">
                  <div className="w-0.5 h-6 bg-slate-200 rounded-full" />
                </div>

                {/* Right Desk: 4 seats in 1 straight horizontal line */}
                <div className="bg-sky-50/60 border border-sky-200/80 rounded-lg p-1">
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((pos) => {
                      const seatId = `r${rowNum}-d2-s${pos}`;
                      const absNumber = baseIndex + 4 + pos;
                      const studentId = assignments[seatId];
                      const student = studentId ? studentMap.get(studentId) : undefined;

                      return (
                        <SeatCard
                          key={seatId}
                          seatId={seatId}
                          rowNumber={rowNum}
                          tableSide="right"
                          seatPositionInTable={pos}
                          absoluteSeatNumber={absNumber}
                          assignedStudent={student}
                          isLocked={isLocked}
                          currentUser={currentUser}
                          onSelectSeat={onSelectSeat}
                          onUnassignSeat={onUnassignSeat}
                          onDropStudent={onDropStudent}
                          highlightedStudentId={highlightedStudentId}
                          selectedStudentForPlacement={selectedStudentForPlacement}
                          onShowNotice={onShowNotice}
                        />
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
