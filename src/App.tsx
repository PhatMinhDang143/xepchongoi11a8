import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ClassroomState, Student, CurrentUser } from './types';
import { INITIAL_STUDENTS_LIST } from './data/students';
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
import { 
  getGoogleSheetUrl, 
  setGoogleSheetUrl, 
  fetchFromGoogleSheet, 
  saveToGoogleSheet 
} from './utils/googleSheetSync';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { Blackboard } from './components/Blackboard';
import { ClassroomMap } from './components/ClassroomMap';
import { StudentRoster } from './components/StudentRoster';
import { SeatSelectionModal } from './components/SeatSelectionModal';
import { StudentSeatConfirmModal } from './components/StudentSeatConfirmModal';
import { ExportPrintModal } from './components/ExportPrintModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info,
  FileSpreadsheet
} from 'lucide-react';

const USER_STORAGE_KEY = 'classroom_11a8_current_user';

export default function App() {
  const [classroomState, setClassroomState] = useState<ClassroomState>(() => getInitialClassroomState());
  const [students] = useState<Student[]>(INITIAL_STUDENTS_LIST);
  const [googleSheetUrl, setGoogleSheetUrlState] = useState<string>(() => getGoogleSheetUrl());
  const [isSheetConnected, setIsSheetConnected] = useState<boolean>(Boolean(getGoogleSheetUrl()));
  
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
  const [isStudentConfirmModalOpen, setIsStudentConfirmModalOpen] = useState(false);
  const [studentConfirmSeatId, setStudentConfirmSeatId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  
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

  // Google Sheet and Server Real-time Sync Loop
  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch from Google Sheet or Server
    const initSync = async () => {
      if (googleSheetUrl) {
        const sheetState = await fetchFromGoogleSheet(googleSheetUrl);
        if (sheetState && isMounted) {
          setClassroomState((prev) => ({
            ...prev,
            ...sheetState,
            assignments: sheetState.assignments || {},
          }));
          setIsSheetConnected(true);
          return;
        }
      }

      // Fallback: Node.js server
      const serverState = await fetchServerClassroomState();
      if (serverState && isMounted) {
        setClassroomState(serverState);
      }
    };

    initSync();

    // 2. Continuous Polling from Google Sheet every 3 seconds
    const interval = setInterval(async () => {
      if (googleSheetUrl) {
        const sheetState = await fetchFromGoogleSheet(googleSheetUrl);
        if (sheetState && isMounted) {
          setClassroomState((prev) => {
            const assignmentsChanged = JSON.stringify(prev.assignments) !== JSON.stringify(sheetState.assignments);
            const lockChanged = prev.isLocked !== sheetState.isLocked;
            if (assignmentsChanged || lockChanged) {
              return {
                ...prev,
                assignments: sheetState.assignments || {},
                isLocked: sheetState.isLocked,
                lastUpdated: sheetState.lastUpdated || prev.lastUpdated,
              };
            }
            return prev;
          });
          setIsSheetConnected(true);
        }
      }
    }, 3000);

    // 3. Subscribe to Node SSE if active
    const unsubscribeSSE = subscribeToClassroomUpdates((liveState) => {
      if (isMounted) {
        setClassroomState(liveState);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribeSSE();
    };
  }, [googleSheetUrl]);

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
      showToast(`Xin chào ${user.student.name}! Bạn hãy bấm vào 1 ghế trống.`, 'success');
    } else {
      showToast('Đã đăng nhập quyền Giáo viên chủ nhiệm', 'success');
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
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // Ignored
    }
  };

  // Sync state helper to both Google Sheet and Server in background
  const broadcastSync = useCallback((newState: ClassroomState) => {
    if (googleSheetUrl) {
      saveToGoogleSheet(newState, googleSheetUrl).catch(() => {});
    }
  }, [googleSheetUrl]);

  // Assign student to seat (Optimistic 0ms Instant Update)
  const handleAssignStudent = useCallback(async (seatId: string, studentId: string) => {
    if (classroomState.isLocked) {
      showToast('Sơ đồ đang bị khóa chỉnh sửa bởi Giáo viên', 'warn');
      return;
    }

    // Student mode:
    if (currentUser?.role === 'student') {
      const myId = currentUser.student?.id;
      if (myId && studentId !== myId) {
        showToast('Bạn chỉ có thể chọn và điều chỉnh vị trí cho chính mình!', 'warn');
        return;
      }

      // 1. OPTIMISTIC 0MS INSTANT LOCAL UI UPDATE
      const newAssignments = { ...classroomState.assignments };
      for (const [sId, studId] of Object.entries(newAssignments)) {
        if (studId === studentId) delete newAssignments[sId];
      }
      newAssignments[seatId] = studentId;

      const optimisticState: ClassroomState = {
        ...classroomState,
        assignments: newAssignments,
        lastUpdated: new Date().toISOString(),
      };

      setClassroomState(optimisticState);
      saveClassroomState(optimisticState);
      triggerConfetti();
      showToast(`Đã chọn chỗ ngồi cho bạn ${currentUser.student?.name}!`, 'success');

      // 2. BACKGROUND ASYNC SYNC (Google Sheet + Server)
      broadcastSync(optimisticState);

      const password = currentUser.student?.password || '';
      apiAssignStudent(seatId, studentId, password, optimisticState).catch(() => {});
      return;
    }

    // Teacher mode:
    if (currentUser?.role === 'teacher') {
      const newAssignments = { ...classroomState.assignments };
      if (studentId) {
        for (const [sId, studId] of Object.entries(newAssignments)) {
          if (studId === studentId) delete newAssignments[sId];
        }
        newAssignments[seatId] = studentId;
      }

      const optimisticState: ClassroomState = {
        ...classroomState,
        assignments: newAssignments,
        lastUpdated: new Date().toISOString(),
      };

      setClassroomState(optimisticState);
      saveClassroomState(optimisticState);
      broadcastSync(optimisticState);

      const studentName = students.find((s) => s.id === studentId)?.name || 'Học sinh';
      showToast(`Đã xếp chỗ cho ${studentName}!`, 'success');
      setSelectedStudentForPlacement(null);

      apiAdminAction('admin_assign', { seatId, studentId }, optimisticState).catch(() => {});
    }
  }, [classroomState, currentUser, students, broadcastSync]);

  // Drop student handler
  const handleDropStudent = useCallback((seatId: string, studentId: string) => {
    handleAssignStudent(seatId, studentId);
  }, [handleAssignStudent]);

  // Unassign seat
  const handleUnassignSeat = useCallback(async (seatId: string) => {
    if (classroomState.isLocked) return;

    const studentId = classroomState.assignments[seatId];
    if (!studentId) return;

    // Student mode:
    if (currentUser?.role === 'student') {
      if (studentId !== currentUser.student?.id) {
        showToast('Bạn không thể xóa chỗ của bạn khác!', 'warn');
        return;
      }

      // Optimistic instant unassign
      const newAssignments = { ...classroomState.assignments };
      delete newAssignments[seatId];

      const optimisticState: ClassroomState = {
        ...classroomState,
        assignments: newAssignments,
        lastUpdated: new Date().toISOString(),
      };

      setClassroomState(optimisticState);
      saveClassroomState(optimisticState);
      broadcastSync(optimisticState);
      showToast('Đã hủy chỗ ngồi của bạn', 'info');

      const password = currentUser.student?.password || '';
      apiUnassignStudent(studentId, password, optimisticState).catch(() => {});
      return;
    }

    // Teacher mode:
    if (currentUser?.role === 'teacher') {
      const newAssignments = { ...classroomState.assignments };
      delete newAssignments[seatId];

      const optimisticState: ClassroomState = {
        ...classroomState,
        assignments: newAssignments,
        lastUpdated: new Date().toISOString(),
      };

      setClassroomState(optimisticState);
      saveClassroomState(optimisticState);
      broadcastSync(optimisticState);
      showToast('Đã làm trống ghế', 'info');

      apiAdminAction('admin_assign', { seatId, studentId: null }, optimisticState).catch(() => {});
    }
  }, [classroomState, currentUser, broadcastSync]);

  // Unassign student by student ID
  const handleUnassignStudent = useCallback((studentId: string) => {
    if (classroomState.isLocked) return;

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
    
    // For student: Open instant Confirmation Modal with clear seat information & big confirm button
    if (currentUser?.role === 'student' && currentUser.student) {
      setStudentConfirmSeatId(seatId);
      setIsStudentConfirmModalOpen(true);
      return;
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

  // Student confirmed seat selection from modal
  const handleStudentConfirmModalAssign = async (seatId: string) => {
    if (currentUser?.role === 'student' && currentUser.student) {
      await handleAssignStudent(seatId, currentUser.student.id);
    }
  };

  // Student confirmed unassign from modal
  const handleStudentConfirmModalUnassign = async (seatId: string) => {
    await handleUnassignSeat(seatId);
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
    const optimisticState: ClassroomState = {
      ...classroomState,
      isLocked: !classroomState.isLocked,
      lastUpdated: new Date().toISOString(),
    };
    setClassroomState(optimisticState);
    saveClassroomState(optimisticState);
    broadcastSync(optimisticState);
    showToast(
      optimisticState.isLocked ? 'Đã khóa sơ đồ lớp học' : 'Đã mở khóa sơ đồ để chọn chỗ',
      optimisticState.isLocked ? 'warn' : 'info'
    );
    apiAdminAction('toggle_lock', undefined, optimisticState).catch(() => {});
  };

  // Reset all assignments (teacher only)
  const handleReset = async () => {
    if (currentUser?.role !== 'teacher' || classroomState.isLocked) return;
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ vị trí chỗ ngồi đã chọn không?')) {
      return;
    }

    const optimisticState: ClassroomState = {
      ...classroomState,
      assignments: {},
      lastUpdated: new Date().toISOString(),
    };
    setClassroomState(optimisticState);
    saveClassroomState(optimisticState);
    broadcastSync(optimisticState);
    showToast('Đã xóa tất cả chỗ ngồi', 'info');
    apiAdminAction('reset_assignments', undefined, optimisticState).catch(() => {});
  };

  // Import state from JSON
  const handleImportState = async (newState: ClassroomState) => {
    setClassroomState(newState);
    saveClassroomState(newState);
    broadcastSync(newState);
    showToast('Đã nạp sơ đồ chỗ ngồi thành công!', 'success');
    apiAdminAction('set_assignments', { assignments: newState.assignments }, newState).catch(() => {});
  };

  // Copy share URL
  const handleShare = () => {
    let url = window.location.origin + window.location.pathname;
    if (googleSheetUrl) {
      url += `?sheet_api=${encodeURIComponent(googleSheetUrl)}`;
    }
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép link sơ đồ kèm Database Google Sheet!', 'success');
  };

  // Test Google Sheet connection
  const handleTestSheetConnection = async (url: string): Promise<boolean> => {
    const testState = await fetchFromGoogleSheet(url);
    if (testState) {
      setClassroomState((prev) => ({
        ...prev,
        ...testState,
        assignments: testState.assignments || {},
      }));
      return true;
    }
    return false;
  };

  // Save Google Sheet URL
  const handleSaveSheetUrl = (url: string) => {
    setGoogleSheetUrl(url);
    setGoogleSheetUrlState(url);
    setIsSheetConnected(Boolean(url));
    if (url) {
      showToast('Đã lưu cấu hình Google Sheet Database!', 'success');
    }
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
        hasGoogleSheetConnected={isSheetConnected}
        onToggleLock={handleToggleLock}
        onOpenGoogleSheet={() => setIsSheetModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        onShare={handleShare}
        onLogout={handleLogout}
      />

      {/* Database Connection Status Banner (Teacher mode only) */}
      {currentUser?.role === 'teacher' && (
        <div className="bg-emerald-50 border-b border-emerald-200/60 py-1 px-3 text-center flex items-center justify-center gap-2 text-[11px] text-emerald-800 font-medium">
          {isSheetConnected ? (
            <>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Đang đồng bộ trực tuyến với <strong>Google Sheet Database</strong></span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Hệ thống đồng bộ trực tiếp thời gian thực</span>
            </>
          )}
        </div>
      )}

      {/* Main Content: 100% Fit for Mobile */}
      <main className="flex-1 w-full max-w-xl mx-auto px-2 sm:px-4 py-3 space-y-3">
        
        {/* Blackboard & Teacher Desk */}
        <Blackboard
          className={classroomState.className}
          teacherName={classroomState.teacherName}
          schoolYear={classroomState.schoolYear}
        />

        {/* Classroom Desks Map */}
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

        {/* Student Roster Drawer */}
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

      {/* Student Seat Confirmation Modal (Fast, clear & 0ms delay) */}
      <StudentSeatConfirmModal
        isOpen={isStudentConfirmModalOpen}
        onClose={() => {
          setIsStudentConfirmModalOpen(false);
          setStudentConfirmSeatId(null);
        }}
        seatId={studentConfirmSeatId}
        currentUser={currentUser}
        students={students}
        assignments={classroomState.assignments}
        onConfirmAssign={handleStudentConfirmModalAssign}
        onConfirmUnassign={handleStudentConfirmModalUnassign}
      />

      {/* Teacher Modals */}
      {currentUser?.role === 'teacher' && (
        <>
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

          <ExportPrintModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            state={classroomState}
            students={students}
            onImportState={handleImportState}
          />

          <GoogleSheetModal
            isOpen={isSheetModalOpen}
            onClose={() => setIsSheetModalOpen(false)}
            currentScriptUrl={googleSheetUrl}
            onSaveScriptUrl={handleSaveSheetUrl}
            onTestConnection={handleTestSheetConnection}
          />
        </>
      )}

    </div>
  );
}
