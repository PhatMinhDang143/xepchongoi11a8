import { ClassroomState } from '../types';
import { ADMIN_TEACHER_PASSWORD } from '../data/students';

/**
 * Fetch current classroom state from server
 */
export async function fetchServerClassroomState(): Promise<ClassroomState | null> {
  try {
    const res = await fetch('/api/classroom');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as ClassroomState;
    }
  } catch (err) {
    console.warn('Could not fetch state from server, using local cache', err);
  }
  return null;
}

/**
 * Assign student to a seat via server API
 */
export async function apiAssignStudent(
  seatId: string,
  studentId: string,
  studentPassword: string
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
  try {
    const res = await fetch('/api/classroom/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, studentId, studentPassword }),
    });
    const json = await res.json();
    return {
      success: json.success,
      message: json.message || (json.success ? 'Thành công' : 'Không thể chọn ghế'),
      data: json.data,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ! Vui lòng kiểm tra mạng.',
    };
  }
}

/**
 * Unassign student from seat via server API
 */
export async function apiUnassignStudent(
  studentId: string,
  studentPassword: string
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
  try {
    const res = await fetch('/api/classroom/unassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentPassword }),
    });
    const json = await res.json();
    return {
      success: json.success,
      message: json.message || (json.success ? 'Thành công' : 'Lỗi khi hủy ghế'),
      data: json.data,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ!',
    };
  }
}

/**
 * Admin action via server API
 */
export async function apiAdminAction(
  action: 'toggle_lock' | 'set_locked' | 'reset_assignments' | 'set_assignments' | 'set_perspective' | 'admin_assign',
  payload?: any
): Promise<{ success: boolean; message: string; data?: ClassroomState }> {
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
    const json = await res.json();
    return {
      success: json.success,
      message: json.message || 'Thành công',
      data: json.data,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ!',
    };
  }
}

/**
 * Subscribe to real-time Server-Sent Events (SSE)
 */
export function subscribeToClassroomUpdates(
  onUpdate: (state: ClassroomState) => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

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
      // If SSE errors, keep fallback polling active
      if (!pollInterval) {
        pollInterval = setInterval(async () => {
          const state = await fetchServerClassroomState();
          if (state) onUpdate(state);
        }, 2500);
      }
    };
  } catch (err) {
    // Fallback to polling
    pollInterval = setInterval(async () => {
      const state = await fetchServerClassroomState();
      if (state) onUpdate(state);
    }, 2500);
  }

  // Return cleanup function
  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}
