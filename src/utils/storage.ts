import { ClassroomState, DeskLayoutConfig } from '../types';
import { CLASS_INFO, DEFAULT_LAYOUT_CONFIG } from '../data/students';

const STORAGE_KEY = 'classroom_11a8_seating_chart_v1';

export function getInitialClassroomState(): ClassroomState {
  // Check URL hash first for shared seating data
  if (typeof window !== 'undefined' && window.location.hash) {
    try {
      const hashData = window.location.hash.substring(1);
      if (hashData.startsWith('data=')) {
        const decoded = decodeURIComponent(atob(hashData.replace('data=', '')));
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.assignments) {
          return {
            ...parsed,
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn('Could not parse shared URL hash data', e);
    }
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.warn('Could not load from localStorage', e);
    }
  }

  // Default empty chart
  return {
    className: CLASS_INFO.className,
    teacherName: CLASS_INFO.teacherName,
    schoolYear: CLASS_INFO.schoolYear,
    layoutConfig: DEFAULT_LAYOUT_CONFIG,
    perspective: 'from-students', // Standard view facing blackboard
    isLocked: false,
    assignments: {},
    lastUpdated: new Date().toISOString(),
  };
}

export function saveClassroomState(state: ClassroomState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save classroom state', e);
  }
}

export function generateShareUrl(state: ClassroomState): string {
  if (typeof window === 'undefined') return '';
  try {
    const jsonStr = JSON.stringify(state);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `data=${encoded}`;
    return url.toString();
  } catch (e) {
    console.error('Failed to generate share URL', e);
    return window.location.href;
  }
}

export function exportStateToJson(state: ClassroomState): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(state, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `So-Do-Cho-Ngoi-Lop-11A8-${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
