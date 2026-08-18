import React, { useState, useMemo } from 'react';
import { Student, CurrentUser } from '../types';
import { 
  Search, 
  Users, 
  User, 
  MapPin, 
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Check
} from 'lucide-react';

interface StudentRosterProps {
  students: Student[];
  assignments: Record<string, string>;
  isLocked: boolean;
  currentUser: CurrentUser | null;
  onSelectStudentToSeat: (student: Student) => void;
  onHighlightStudent: (studentId: string | null) => void;
  onUnassignStudent: (studentId: string) => void;
  selectedStudentForPlacement?: Student | null;
  onSetSelectedStudentForPlacement: (student: Student | null) => void;
  onShowNotice?: (message: string, type?: 'info' | 'warn' | 'success') => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({
  students,
  assignments,
  isLocked,
  currentUser,
  onSelectStudentToSeat,
  onHighlightStudent,
  onUnassignStudent,
  selectedStudentForPlacement,
  onSetSelectedStudentForPlacement,
  onShowNotice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unseated' | 'seated'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const isTeacher = currentUser?.role === 'teacher';
  const myStudent = currentUser?.role === 'student' ? currentUser.student : null;

  // Inverted map: studentId -> seatId
  const studentToSeatMap = useMemo(() => {
    const map = new Map<string, string>();
    (Object.entries(assignments) as [string, string][]).forEach(([seatId, studentId]) => {
      if (studentId) {
        map.set(studentId, seatId);
      }
    });
    return map;
  }, [assignments]);

  const formatSeatLocation = (seatId: string) => {
    const match = seatId.match(/r(\d+)-d(\d+)-s(\d+)/);
    if (!match) return seatId;
    const [, row, desk, pos] = match;
    const deskName = desk === '1' ? 'Dãy 1 (Cửa sổ)' : 'Dãy 2 (Cửa vào)';
    return `Hàng ${row} • ${deskName} • Chỗ ${pos}`;
  };

  const mySeatId = myStudent ? studentToSeatMap.get(myStudent.id) : null;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const isSeated = studentToSeatMap.has(s.id);
      
      if (activeFilter === 'unseated' && isSeated) return false;
      if (activeFilter === 'seated' && !isSeated) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(query);
        const matchSTT = s.orderNumber.toString() === query || `#${s.orderNumber}` === query;
        return matchName || matchSTT;
      }
      return true;
    });
  }, [students, studentToSeatMap, activeFilter, searchTerm]);

  const unseatedCount = students.filter((s) => !studentToSeatMap.has(s.id)).length;
  const seatedCount = students.length - unseatedCount;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Current Student Highlight Card */}
      {myStudent && (
        <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs text-white shrink-0 border border-white/30">
              {myStudent.orderNumber}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-bold truncate">{myStudent.name}</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded">
                  Bạn
                </span>
              </div>
              <div className="text-[11px] text-emerald-100 font-medium truncate">
                {mySeatId ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-300" />
                    {formatSeatLocation(mySeatId)}
                  </span>
                ) : (
                  <span className="text-amber-200 font-semibold animate-pulse">
                    Chưa chọn chỗ • Hãy bấm vào 1 ghế trống trên sơ đồ
                  </span>
                )}
              </div>
            </div>
          </div>

          {mySeatId && !isLocked && (
            <button
              type="button"
              onClick={() => onUnassignStudent(myStudent.id)}
              className="px-2 py-1 text-[10px] font-bold bg-white/20 hover:bg-rose-600 hover:text-white text-white rounded-lg transition-colors shrink-0 ml-2"
            >
              Hủy chỗ
            </button>
          )}
        </div>
      )}

      {/* Main Header & Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            <Users className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 font-['Outfit',sans-serif]">
            Danh Sách 45 Học Sinh Lớp 11A8
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {seatedCount}/45 đã chọn
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded List */}
      {isExpanded && (
        <div className="p-3 border-t border-slate-200">
          {/* Search */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên bạn học hoặc STT..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg mb-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`py-1 rounded font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả (45)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unseated')}
              className={`py-1 rounded font-medium transition-all ${
                activeFilter === 'unseated'
                  ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa chọn ({unseatedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('seated')}
              className={`py-1 rounded font-medium transition-all ${
                activeFilter === 'seated'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã có chỗ ({seatedCount})
            </button>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto max-h-60 space-y-1.5 pr-1">
            {filteredStudents.map((student) => {
              const seatId = studentToSeatMap.get(student.id);
              const isSeated = Boolean(seatId);
              const isMe = myStudent?.id === student.id;

              return (
                <div
                  key={student.id}
                  onMouseEnter={() => onHighlightStudent(student.id)}
                  onMouseLeave={() => onHighlightStudent(null)}
                  className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    isMe
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                      : isSeated
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded ${
                        isMe
                          ? 'bg-emerald-600 text-white font-black'
                          : `bg-gradient-to-tr ${student.avatarColor || 'from-emerald-500 to-teal-600'} text-white`
                      } font-bold text-[10px] flex items-center justify-center shrink-0`}
                    >
                      {student.orderNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                        <span>{student.name}</span>
                        {isMe && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                            (Tôi)
                          </span>
                        )}
                      </div>
                      {isSeated && seatId && (
                        <div className="text-[9px] text-emerald-700 font-medium truncate">
                          {formatSeatLocation(seatId)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 text-[10px]">
                    {isMe ? (
                      isSeated ? (
                        !isLocked && (
                          <button
                            type="button"
                            onClick={() => onUnassignStudent(student.id)}
                            className="px-2 py-0.5 font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded"
                          >
                            Đổi chỗ
                          </button>
                        )
                      ) : (
                        <span className="px-2 py-0.5 font-bold text-emerald-700 bg-emerald-100 rounded animate-pulse">
                          Bấm ghế trên sơ đồ
                        </span>
                      )
                    ) : isTeacher ? (
                      !isSeated ? (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => onSelectStudentToSeat(student)}
                          className="px-2 py-0.5 font-bold bg-emerald-600 text-white rounded"
                        >
                          Xếp chỗ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUnassignStudent(student.id)}
                          className="px-1.5 py-0.5 font-semibold text-rose-600 hover:bg-rose-50 rounded"
                        >
                          Hủy
                        </button>
                      )
                    ) : (
                      isSeated ? (
                        <span className="text-slate-400 font-medium">Đã có chỗ</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Chưa chọn</span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
