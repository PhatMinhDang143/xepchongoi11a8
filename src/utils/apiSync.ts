import { ClassroomState } from '../types';
import { ADMIN_TEACHER_PASSWORD, INITIAL_STUDENTS_LIST } from '../data/students';
import { getInitialClassroomState, saveClassroomState } from './storage';

/**
 * Check if running in a static environment (like GitHub Pages without a custom server)
 */
let isServerAvailable: boolean | null = null;

/**
 * Fetch current classroom state from server
 */
export async function fetchServerClassroomState(): Promise<ClassroomState | null> {
  if (isServerAvailable === false) return null;

  try {
    const res = await fetch('/api/classroom', { cache: 'no-cache' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      isServerAvailable = false;
      return null;
    }
    const json = await res.json();
    if (json.success && json.data) {
      isServerAvailable = true;
      return json.data as ClassroomState;
    }
  } catch {
    isServerAvailable = false;
  }
  return null;
}

/**
 * Assign student to a seat
 * Works with both Node.js server API and static GitHub Pages (localStorage fallback)
 */
export async function apiAssignStudent(
  seatId: string,
  studentId: string,
  studentPassword: string,
  currentState?: ClassroomState
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
  // If server is active, call server API
  if (isServerAvailable !== false) {
    try {
      const res = await fetch('/api/classroom/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, studentId, studentPassword }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        isServerAvailable = true;
        return {
          success: json.success,
          message: json.message || (json.success ? 'Thành công' : 'Không thể chọn ghế'),
          data: json.data,
        };
      }
    } catch {
      isServerAvailable = false;
    }
  }

  // Fallback for static hosting (GitHub Pages)
  const baseState = currentState || getInitialClassroomState();
  const student = INITIAL_STUDENTS_LIST.find((s) => s.id === studentId);
  if (!student) {
    return { success: false, message: 'Không tìm thấy học sinh.' };
  }

  const cleanPass = String(studentPassword || '').trim().replace(/\D/g, '');
  if (cleanPass !== student.password) {
    return { success: false, message: 'Mật khẩu ngày tháng sinh không chính xác.' };
  }

  const newAssignments = { ...baseState.assignments };
  // Remove from old seat
  for (const [sId, studId] of Object.entries(newAssignments)) {
    if (studId === studentId) delete newAssignments[sId];
  }
  newAssignments[seatId] = studentId;

  const updatedState: ClassroomState = {
    ...baseState,
    assignments: newAssignments,
    lastUpdated: new Date().toISOString(),
  };

  saveClassroomState(updatedState);

  return {
    success: true,
    message: `Đã xếp chỗ cho bạn ${student.name} thành công!`,
    data: updatedState,
  };
}

/**
 * Unassign student from seat
 */
export async function apiUnassignStudent(
  studentId: string,
  studentPassword: string,
  currentState?: ClassroomState
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
  if (isServerAvailable !== false) {
    try {
      const res = await fetch('/api/classroom/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, studentPassword }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        isServerAvailable = true;
        return {
          success: json.success,
          message: json.message || 'Đã hủy chỗ ngồi',
          data: json.data,
        };
      }
    } catch {
      isServerAvailable = false;
    }
  }

  // Static Fallback
  const baseState = currentState || getInitialClassroomState();
  const newAssignments = { ...baseState.assignments };
  for (const [sId, studId] of Object.entries(newAssignments)) {
    if (studId === studentId) delete newAssignments[sId];
  }

  const updatedState: ClassroomState = {
    ...baseState,
    assignments: newAssignments,
    lastUpdated: new Date().toISOString(),
  };

  saveClassroomState(updatedState);

  return {
    success: true,
    message: 'Đã hủy chỗ ngồi thành công.',
    data: updatedState,
  };
}

/**
 * Admin action via server API or local fallback
 */
export async function apiAdminAction(
  action: 'toggle_lock' | 'set_locked' | 'reset_assignments' | 'set_assignments' | 'set_perspective' | 'admin_assign',
  payload?: any,
  currentState?: ClassroomState
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
  if (isServerAvailable !== false) {
    try {
      const res = await fetch('/api/classroom/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          password: ADMIN_TEACHER_PASSWORD,
          payload,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        isServerAvailable = true;
        return {
          success: json.success,
          message: json.message || 'Thành công',
          data: json.data,
        };
      }
    } catch {
      isServerAvailable = false;
    }
  }

  // Static fallback
  const baseState = currentState || getInitialClassroomState();
  const updatedState = { ...baseState };

  if (action === 'toggle_lock') {
    updatedState.isLocked = !updatedState.isLocked;
  } else if (action === 'set_locked') {
    updatedState.isLocked = Boolean(payload?.locked);
  } else if (action === 'reset_assignments') {
    updatedState.assignments = {};
  } else if (action === 'set_assignments') {
    if (payload?.assignments) updatedState.assignments = payload.assignments;
  } else if (action === 'admin_assign') {
    const { seatId, studentId } = payload || {};
    const newAssignments = { ...updatedState.assignments };
    if (studentId) {
      for (const [sId, studId] of Object.entries(newAssignments)) {
        if (studId === studentId) delete newAssignments[sId];
      }
      if (seatId) newAssignments[seatId] = studentId;
    } else if (seatId) {
      delete newAssignments[seatId];
    }
    updatedState.assignments = newAssignments;
  }

  updatedState.lastUpdated = new Date().toISOString();
  saveClassroomState(updatedState);

  return {
    success: true,
    message: 'Đã cập nhật',
    data: updatedState,
  };
}

/**
 * Subscribe to real-time Server-Sent Events (SSE)
 */
export function subscribeToClassroomUpdates(
  onUpdate: (state: ClassroomState) => void
): () => void {
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource('/api/classroom/stream');

    eventSource.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data);
        if (state && typeof state === 'object') {
          onUpdate(state);
        }
      } catch (err) {
        console.error('Error parsing SSE event data', err);
      }
    };

    eventSource.onerror = () => {
      // If SSE fails (e.g., GitHub Pages static hosting), close immediately
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  } catch {
    // Static hosting without SSE
  }

  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
}
