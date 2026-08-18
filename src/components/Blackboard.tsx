import React from 'react';
import { BookOpen } from 'lucide-react';

interface BlackboardProps {
  className: string;
  teacherName: string;
  schoolYear: string;
}

export const Blackboard: React.FC<BlackboardProps> = ({
  className,
  teacherName,
  schoolYear,
}) => {
  return (
    <div className="w-full mb-3 select-none">
      {/* Chalkboard Banner */}
      <div className="rounded-xl bg-[#18392b] border-2 border-amber-950 p-2.5 sm:p-3 text-white shadow-md text-center">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-emerald-300 font-mono">BẢNG ĐEN</span>
          <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-amber-200 uppercase font-['Outfit',sans-serif]">
            {className} • NĂM HỌC {schoolYear}
          </h2>
          <span className="text-[10px] text-emerald-300 font-mono">BỤC GIẢNG</span>
        </div>
      </div>

      {/* Teacher Desk Minimal Strip */}
      <div className="flex justify-center -mt-1">
        <div className="bg-amber-100 border border-amber-300/80 rounded-lg px-3 py-1 text-[11px] font-semibold text-amber-900 shadow-2xs flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
          <span>Bàn Giáo Viên: <strong>{teacherName}</strong></span>
        </div>
      </div>
    </div>
  );
};
