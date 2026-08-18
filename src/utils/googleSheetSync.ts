import { ClassroomState } from '../types';

export const DEFAULT_GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbw-4uBn_qIciVfA6vJMjs67Nk39ficjW5BogJTy5CwuyRAyKUZSMpkcrCcgokg6OCJdfw/exec';
export const GOOGLE_SHEET_STORAGE_KEY = 'classroom_google_sheet_url';

/**
 * Get active Google Sheet Web App URL
 */
export function getGoogleSheetUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('sheet_api');
    if (fromUrl && fromUrl.startsWith('http')) {
      localStorage.setItem(GOOGLE_SHEET_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(GOOGLE_SHEET_STORAGE_KEY);
    if (saved && saved.startsWith('http')) {
      return saved;
    }
  } catch {}
  return DEFAULT_GOOGLE_SHEET_URL;
}

/**
 * Save Google Sheet Web App URL to localStorage
 */
export function setGoogleSheetUrl(url: string) {
  try {
    localStorage.setItem(GOOGLE_SHEET_STORAGE_KEY, url);
  } catch (err) {
    console.error('Failed to save Google Sheet URL', err);
  }
}

/**
 * Fetch classroom state from Google Sheet
 */
export async function fetchFromGoogleSheet(scriptUrl?: string): Promise<ClassroomState | null> {
  const url = scriptUrl || getGoogleSheetUrl();
  if (!url) return null;

  try {
    const endpoint = `${url}${url.includes('?') ? '&' : '?'}action=get_state&_t=${Date.now()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.data) {
      return json.data as ClassroomState;
    }
  } catch (err) {
    console.warn('Google Sheet fetch error:', err);
  }
  return null;
}

/**
 * Save classroom state to Google Sheet
 */
export async function saveToGoogleSheet(
  state: ClassroomState,
  scriptUrl?: string
): Promise<boolean> {
  const url = scriptUrl || getGoogleSheetUrl();
  if (!url) return false;

  try {
    const payload = JSON.stringify({
      isLocked: state.isLocked,
      assignments: state.assignments,
      perspective: state.perspective,
      lastUpdated: new Date().toISOString(),
    });

    // Use GET with query payload to avoid CORS preflight issues on Google Apps Script
    const endpoint = `${url}${url.includes('?') ? '&' : '?'}action=save_state&payload=${encodeURIComponent(payload)}&_t=${Date.now()}`;
    
    const res = await fetch(endpoint, {
      method: 'GET',
    });

    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('Google Sheet save warning, trying fallback POST:', err);
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          isLocked: state.isLocked,
          assignments: state.assignments,
          perspective: state.perspective,
          lastUpdated: new Date().toISOString(),
        }),
        mode: 'no-cors',
      });
      return true;
    } catch (postErr) {
      console.error('Google Sheet save failed:', postErr);
    }
  }
  return false;
}
