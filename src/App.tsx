import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ClassroomState, Student, CurrentUser } from './types';
import { INITIAL_STUDENTS_LIST, CLASS_INFO } from './data/students';
import { 
  getInitialClassroomState, 
  saveClassroomState, 
  generateShareUrl 
} from './utils/storage';
import { 
  fetchServerClassroomState, 
  subscribeToClassroomUpdates, 
  apiAssignStudent, 
  apiUnassignStudent, 
  apiAdminAction 
} from './utils/apiSync';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { Blackboard } from './components/Blackboard';
import { ClassroomMap } from './components/ClassroomMap';
import { StudentRoster } from './components/StudentRoster';
import { SeatSelectionModal } from './components/SeatSelectionModal';
import { ExportPrintModal } from './components/ExportPrintModal';
import { GithubSyncModal } from './components/GithubSyncModal';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Radio,
  Wifi
} from 'lucide-react';

const USER_STORAGE_KEY = 'classroom_11a8_current_user';

export default function App() {
  const [classroomState, setClassroomState] = useState<ClassroomState>(() => getInitialClassroomState());
  const [students] = useState<Student[]>(INITIAL_STUDENTS_LIST);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  
  // Current user authentication state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        return JSON.parse(savedUser) as CurrentUser;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
    return null;
  });

  // Modals state
  const [activeModalSeatId, setActiveModalSeatId] = useState<string | null>(null);
  const [targetModalStudent, setTargetModalStudent] = useState<Student | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  
  // Selected student for 1-tap placement mode (for teacher)
  const [selectedStudentForPlacement, setSelectedStudentForPlacement] = useState<Student | null>(null);

  // Highlight state
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  };

  // Real-time synchronization with server across all devices
  useEffect(() => {
    // Initial fetch from server
    fetchServerClassroomState().then((serverState) => {
      if (serverState) {
        setClassroomState(serverState);
        saveClassroomState(serverState);
      }
    });

    // Subscribe to live SSE updates
    const unsubscribe = subscribeToClassroomUpdates((liveState) => {
      setIsLiveConnected(true);
      setClassroomState(liveState);
      saveClassroomState(liveState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Save to localStorage as secondary backup
  useEffect(() => {
    saveClassroomState(classroomState);
  }, [classroomState]);

  // Handle user login
  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user', e);
    }
    
    if (user.role === 'student' && user.student) {
      showToast(`Xin chào ${user.student.name}! Bạn có thể chọn vị trí ngồi của mình.`, 'success');
    } else {
      showToast('Đã đăng nhập với quyền Giáo viên chủ nhiệm', 'success');
    }
  };

  // Handle logout / change student
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove user', e);
    }
  };

  // Trigger celebratory confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
      });
    } catch (e) {
      // Ignored if confetti fails
    }
  };

  // Assign a student to a seat
  const handleAssignStudent = useCallback(async (seatId: string, studentId: string) => {
    if (classroomState.isLocked) {
      showToast('Sơ đồ đang bị khóa chỉnh sửa bởi Giáo viên', 'warn');
      return;
    }

    // Permission validation: If student is logged in, they can ONLY assign themselves
    if (currentUser?.role === 'student') {
      const myId = currentUser.student?.id;
      if (myId && studentId !== myId) {
        showToast('Bạn chỉ có thể chọn và điều chỉnh vị trí cho chính mình!', 'warn');
        return;
      }

      const password = currentUser.student?.password || '';
      const result = await apiAssignStudent(seatId, studentId, password);
      
      if (result.success && result.data) {
        setClassroomState(result.data);
        showToast(result.message, 'success');
        triggerConfetti();
      } else {
        showToast(result.message || 'Không thể chọn chỗ ngồi này!', 'warn');
        if (result.data) {
          setClassroomState(result.data);
        }
      }
      return;
    }

    // Teacher mode:
    if (currentUser?.role === 'teacher') {
      const result = await apiAdminAction('admin_assign', { seatId, studentId });
      if (result.success && result.data) {
        setClassroomState(result.data);
        const studentName = students.find((s) => s.id === studentId)?.name || 'Học sinh';
        showToast(`Đã xếp chỗ cho ${studentName}!`, 'success');
        setSelectedStudentForPlacement(null);
      } else {
        showToast(result.message, 'warn');
      }
    }
  }, [classroomState.isLocked, currentUser, students]);

  // Drop student handler
  const handleDropStudent = useCallback((seatId: string, studentId: string) => {
    handleAssignStudent(seatId, studentId);
  }, [handleAssignStudent]);

  // Unassign seat
  const handleUnassignSeat = useCallback(async (seatId: string) => {
    if (classroomState.isLocked) return;

    const studentId = classroomState.assignments[seatId];
    if (!studentId) return;

    // Check permission
    if (currentUser?.role === 'student') {
      if (studentId !== currentUser.student?.id) {
        showToast('Bạn không thể xóa chỗ của bạn khác!', 'warn');
        return;
      }

      const password = currentUser.student?.password || '';
      const result = await apiUnassignStudent(studentId, password);
      if (result.success && result.data) {
        setClassroomState(result.data);
        showToast('Đã hủy chỗ ngồi của bạn', 'info');
      } else {
        showToast(result.message, 'warn');
      }
      return;
    }

    // Teacher mode:
    if (currentUser?.role === 'teacher') {
      const result = await apiAdminAction('admin_assign', { seatId, studentId: null });
      if (result.success && result.data) {
        setClassroomState(result.data);
        showToast('Đã làm trống ghế', 'info');
      }
    }
  }, [classroomState.assignments, classroomState.isLocked, currentUser]);

  // Unassign student by student ID
  const handleUnassignStudent = useCallback((studentId: string) => {
    if (classroomState.isLocked) return;

    // Check permission
    if (currentUser?.role === 'student' && studentId !== currentUser.student?.id) {
      showToast('Bạn chỉ có thể bỏ chọn chỗ của chính mình!', 'warn');
      return;
    }

    const seatId = Object.entries(classroomState.assignments).find(
      ([, sId]) => sId === studentId
    )?.[0];

    if (seatId) {
      handleUnassignSeat(seatId);
    }
  }, [classroomState.assignments, classroomState.isLocked, currentUser, handleUnassignSeat]);

  // Click on seat to pick
  const handleSelectSeat = (seatId: string) => {
    if (classroomState.isLocked) return;
    
    // If student is logged in, 1 tap on an empty seat immediately assigns them!
    if (currentUser?.role === 'student' && currentUser.student) {
      const occupiedBy = classroomState.assignments[seatId];
      if (!occupiedBy) {
        handleAssignStudent(seatId, currentUser.student.id);
        return;
      } else if (occupiedBy === currentUser.student.id) {
        if (window.confirm('Bạn có muốn bỏ chọn vị trí chỗ ngồi này không?')) {
          handleUnassignSeat(seatId);
        }
        return;
      } else {
        const studentName = students.find((s) => s.id === occupiedBy)?.name || 'bạn khác';
        showToast(`Ghế này đã được bạn ${studentName} chọn!`, 'warn');
        return;
      }
    }

    // Teacher mode:
    if (selectedStudentForPlacement) {
      handleAssignStudent(seatId, selectedStudentForPlacement.id);
      return;
    }

    setActiveModalSeatId(seatId);
    setTargetModalStudent(null);
    setIsSeatModalOpen(true);
  };

  // Click on student roster to assign (teacher only)
  const handleSelectStudentToSeat = (student: Student) => {
    if (classroomState.isLocked) return;
    setSelectedStudentForPlacement(student);
    showToast(`Đã chọn ${student.name}. Hãy bấm vào một ghế trống trên sơ đồ!`, 'info');
  };

  // Lock / Unlock toggle (teacher only)
  const handleToggleLock = async () => {
    if (currentUser?.role !== 'teacher') return;
    const result = await apiAdminAction('toggle_lock');
    if (result.success && result.data) {
      setClassroomState(result.data);
      showToast(
        result.data.isLocked ? 'Đã khóa sơ đồ lớp học' : 'Đã mở khóa sơ đồ để chọn chỗ',
        result.data.isLocked ? 'warn' : 'info'
      );
    }
  };

  // Reset all assignments (teacher only)
  const handleReset = async () => {
    if (currentUser?.role !== 'teacher' || classroomState.isLocked) return;
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ vị trí chỗ ngồi đã chọn không?')) {
      return;
    }

    const result = await apiAdminAction('reset_assignments');
    if (result.success && result.data) {
      setClassroomState(result.data);
      showToast('Đã xóa tất cả chỗ ngồi', 'info');
    }
  };

  // Import state from JSON
  const handleImportState = async (newState: ClassroomState) => {
    const result = await apiAdminAction('set_assignments', { assignments: newState.assignments });
    if (result.success && result.data) {
      setClassroomState(result.data);
      showToast('Đã nạp sơ đồ chỗ ngồi thành công!', 'success');
    } else {
      setClassroomState(newState);
      showToast('Đã nạp sơ đồ vào máy hiện tại', 'success');
    }
  };

  // Copy share URL
  const handleShare = () => {
    const url = generateShareUrl(classroomState);
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép link sơ đồ vào bộ nhớ đệm!', 'success');
  };

  // If no user is logged in, show initial Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        students={students}
        teacherName={classroomState.teacherName}
        className={classroomState.className}
        schoolYear={classroomState.schoolYear}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-['Be_Vietnam_Pro',sans-serif] overflow-x-hidden">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-w-[90vw] w-auto">
          <div
            className={`px-3.5 py-2 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toast.type === 'warn'
                ? 'bg-amber-900 text-amber-100 border-amber-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'warn' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        className={classroomState.className}
        teacherName={classroomState.teacherName}
        schoolYear={classroomState.schoolYear}
        students={students}
        assignments={classroomState.assignments}
        isLocked={classroomState.isLocked}
        currentUser={currentUser}
        onToggleLock={handleToggleLock}
        onOpenGithub={() => setIsGithubModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        onShare={handleShare}
        onLogout={handleLogout}
      />

      {/* Real-time Status Badge */}
      <div className="bg-emerald-50 border-b border-emerald-200/60 py-1 px-3 text-center flex items-center justify-center gap-2 text-[11px] text-emerald-800 font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Hệ thống đồng bộ trực tiếp thời gian thực (Real-time Live Sync) giữa 45 học sinh</span>
      </div>

      {/* Main Content: 100% Fit for Mobile */}
      <main className="flex-1 w-full max-w-xl mx-auto px-2 sm:px-4 py-3 space-y-3">
        
        {/* Blackboard & Teacher Desk */}
        <Blackboard
          className={classroomState.className}
          teacherName={classroomState.teacherName}
          schoolYear={classroomState.schoolYear}
        />

        {/* Classroom Desks Map (No horizontal scroll, 100% responsive, straight 4 seats per table) */}
        <ClassroomMap
          state={classroomState}
          students={students}
          currentUser={currentUser}
          onSelectSeat={handleSelectSeat}
          onUnassignSeat={handleUnassignSeat}
          onDropStudent={handleDropStudent}
          highlightedStudentId={highlightedStudentId}
          selectedStudentForPlacement={selectedStudentForPlacement}
          onShowNotice={showToast}
        />

        {/* Student Roster Drawer with Current User highlight */}
        <StudentRoster
          students={students}
          assignments={classroomState.assignments}
          isLocked={classroomState.isLocked}
          currentUser={currentUser}
          onSelectStudentToSeat={handleSelectStudentToSeat}
          onHighlightStudent={setHighlightedStudentId}
          onUnassignStudent={handleUnassignStudent}
          selectedStudentForPlacement={selectedStudentForPlacement}
          onSetSelectedStudentForPlacement={setSelectedStudentForPlacement}
          onShowNotice={showToast}
        />

      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[11px] text-slate-500 border-t border-slate-200 bg-white">
        <div>
          Sơ đồ chỗ ngồi <strong>Lớp 11A8</strong> • GVCN: <strong>{classroomState.teacherName}</strong>
        </div>
      </footer>

      {/* Modals (Teacher mode only) */}
      {currentUser?.role === 'teacher' && (
        <SeatSelectionModal
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          seatId={activeModalSeatId}
          targetModalStudent={targetModalStudent}
          students={students}
          assignments={classroomState.assignments}
          onAssign={handleAssignStudent}
          onUnassignSeat={handleUnassignSeat}
        />
      )}

      <ExportPrintModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        state={classroomState}
        students={students}
        onImportState={handleImportState}
      />

      <GithubSyncModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        state={classroomState}
        onImportState={handleImportState}
      />

    </div>
  );
}
