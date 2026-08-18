import React from 'react';
import { Student, CurrentUser } from '../types';
import { 
  Users, 
  Share2, 
  Lock, 
  Unlock, 
  Printer, 
  RotateCcw, 
  Github, 
  LogOut,
  User,
  GraduationCap
} from 'lucide-react';

interface HeaderProps {
  className: string;
  teacherName: string;
  schoolYear: string;
  students: Student[];
  assignments: Record<string, string>;
  isLocked: boolean;
  currentUser: CurrentUser | null;
  onToggleLock: () => void;
  onOpenGithub: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  onShare: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  teacherName,
  schoolYear,
  students,
  assignments,
  isLocked,
  currentUser,
  onToggleLock,
  onOpenGithub,
  onOpenExport,
  onReset,
  onShare,
  onLogout,
}) => {
  const seatedCount = Object.keys(assignments).length;
  const totalStudents = students.length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-4xl mx-auto px-3 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          
          {/* Main Title & Class info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-['Outfit',sans-serif] truncate">
                  {className}
                </h1>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                  {seatedCount}/{totalStudents} chỗ
                </span>
              </div>
              
              {/* User login tag */}
              {currentUser?.role === 'student' && currentUser.student ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold truncate">
                  <User className="w-3 h-3 text-emerald-600" />
                  <span className="truncate">Bạn: {currentUser.student.name} (#{currentUser.student.orderNumber})</span>
                </div>
              ) : currentUser?.role === 'teacher' ? (
                <div className="flex items-center gap-1 text-[10px] text-amber-800 font-bold truncate">
                  <GraduationCap className="w-3 h-3 text-amber-600" />
                  <span className="truncate">GVCN: {teacherName}</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 truncate">
                  GVCN: <strong>{teacherName}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              id="btn-share"
              onClick={onShare}
              className="p-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs active:scale-95 transition-transform"
              title="Chia sẻ link"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
            </button>

            <button
              id="btn-export"
              onClick={onOpenExport}
              className="p-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs active:scale-95 transition-transform"
              title="In / Xuất sơ đồ"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              id="btn-github-sync"
              onClick={onOpenGithub}
              className="p-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs active:scale-95 transition-transform"
              title="GitHub"
            >
              <Github className="w-4 h-4 text-slate-800" />
            </button>

            {/* Teacher only actions */}
            {currentUser?.role === 'teacher' && (
              <>
                <button
                  id="btn-lock-toggle"
                  onClick={onToggleLock}
                  className={`p-1.5 text-xs rounded-lg border shadow-2xs active:scale-95 transition-transform ${
                    isLocked
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  title={isLocked ? 'Mở khóa sơ đồ' : 'Khóa sơ đồ'}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                <button
                  id="btn-reset"
                  onClick={onReset}
                  disabled={isLocked}
                  className="p-1.5 text-xs text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 border border-slate-200 rounded-lg shadow-2xs active:scale-95 transition-transform"
                  title="Làm mới lại sơ đồ"
                >
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                </button>
              </>
            )}

            {/* Switch user / Logout button */}
            <button
              onClick={onLogout}
              className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 rounded-lg shadow-2xs active:scale-95 transition-transform flex items-center gap-1 ml-1"
              title="Đổi học sinh khác / Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Đổi tên</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
