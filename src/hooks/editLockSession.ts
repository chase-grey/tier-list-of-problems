/**
 * Per-tab session id used by the edit-lock system. Stored in sessionStorage
 * so each tab gets its own independent value (sessionStorage is scoped to
 * the tab, unlike localStorage which is shared across all same-origin tabs).
 *
 * The lock backend keys on (voterName, sessionId), so two tabs from the same
 * TL no longer auto-share the lock — each tab has to take it explicitly,
 * which keeps concurrent edits in sync. Exported from this dedicated module
 * (rather than from useEditLock) so save handlers can grab the id without
 * having to thread it through the hook's return value.
 */
const SESSION_STORAGE_KEY = 'tlAllocationEditLockSessionId';

let cachedFallbackId: string | null = null;

export function getEditLockSessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (rare embedded contexts). Cache a per-load
    // random id so repeat calls in the same load are consistent.
    if (!cachedFallbackId) {
      cachedFallbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    return cachedFallbackId;
  }
}
