import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireEditLock,
  fetchEditLock,
  heartbeatEditLock,
  releaseEditLock,
  type EditLockState,
  type LockStage,
} from '../services/api';

// Must match the backend's EDIT_LOCK_TTL_MS so we agree on what "stale" means.
// A lock whose lastHeartbeat is older than this is treated as up-for-grabs and
// won't block a fresh acquire on either side.
const EDIT_LOCK_TTL_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const VIEWER_POLL_INTERVAL_MS = 30 * 1000;

export type EditLockStatus =
  | 'loading' // initial fetch in flight
  | 'editor'  // caller currently holds the lock
  | 'viewer'  // someone else holds an active lock
  | 'idle'    // no holder (or holder is stale)
  | 'lost';   // caller used to hold the lock, but a force-grab took it away

export interface UseEditLock {
  status: EditLockStatus;
  lock: EditLockState;
  /** Attempt to acquire. force=true bypasses an active foreign holder (their unsaved work is lost). */
  take: (force?: boolean) => Promise<{ acquired: boolean; lock: EditLockState }>;
  /** Release if currently the holder. No-op otherwise. */
  release: () => Promise<void>;
  /** True when status is 'editor'. Convenience for callsite checks. */
  isEditor: boolean;
  /** Manually clear the 'lost' banner — e.g. after the user navigates away. */
  dismissLost: () => void;
}

function deriveStatus(lock: EditLockState, voterName: string, now: number): EditLockStatus {
  if (!lock.holder) return 'idle';
  if (lock.holder === voterName) return 'editor';
  if (now - lock.lastHeartbeat > EDIT_LOCK_TTL_MS) return 'idle';
  return 'viewer';
}

/**
 * Coordinates the per-stage single-editor lock for Stage 2 / Stage 4.
 *
 * On mount and on `stage` change: fetches the current lock state. Heartbeats
 * every minute while the caller is the editor; polls every 30s while a viewer
 * so an external acquire/release becomes visible without a page refresh. If a
 * heartbeat returns a different holder, transitions to `'lost'` and the caller
 * is expected to render a banner telling the user to refresh.
 */
export function useEditLock(stage: LockStage, voterName: string): UseEditLock {
  const [lock, setLock] = useState<EditLockState>({ holder: null, acquiredAt: 0, lastHeartbeat: 0 });
  const [status, setStatus] = useState<EditLockStatus>('loading');
  const voterNameRef = useRef(voterName);
  voterNameRef.current = voterName;

  // Initial fetch on mount + stage change. Resets back to 'loading' first so
  // a stale state from the prior stage doesn't flash.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchEditLock(stage).then(s => {
      if (cancelled) return;
      setLock(s);
      setStatus(deriveStatus(s, voterNameRef.current, Date.now()));
    }).catch(() => {
      if (cancelled) return;
      // Backend unreachable — fall back to idle so the user can at least try
      // to acquire and surface a more specific error from the acquire call.
      setStatus('idle');
    });
    return () => { cancelled = true; };
  }, [stage]);

  // Heartbeat while editor.
  useEffect(() => {
    if (status !== 'editor' || !voterName) return;
    const tick = () => {
      heartbeatEditLock(stage, voterName).then(s => {
        setLock(s);
        if (s.holder && s.holder !== voterName) {
          setStatus('lost');
        }
      }).catch(() => { /* ignore — next tick will retry */ });
    };
    const handle = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [status, stage, voterName]);

  // Poll while viewer or idle so external changes show up.
  useEffect(() => {
    if (status !== 'viewer' && status !== 'idle') return;
    const tick = () => {
      fetchEditLock(stage).then(s => {
        setLock(s);
        setStatus(prev => {
          // Don't override 'lost' if some race set it; otherwise re-derive.
          if (prev === 'lost') return prev;
          return deriveStatus(s, voterNameRef.current, Date.now());
        });
      }).catch(() => { /* ignore */ });
    };
    const handle = window.setInterval(tick, VIEWER_POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [status, stage]);

  const take = useCallback(async (force = false) => {
    const result = await acquireEditLock(stage, voterName, force);
    setLock(result.lock);
    if (result.acquired) setStatus('editor');
    return result;
  }, [stage, voterName]);

  const release = useCallback(async () => {
    await releaseEditLock(stage, voterName);
    setLock({ holder: null, acquiredAt: 0, lastHeartbeat: 0 });
    setStatus('idle');
  }, [stage, voterName]);

  const dismissLost = useCallback(() => {
    setStatus(prev => prev === 'lost' ? 'idle' : prev);
  }, []);

  return {
    status,
    lock,
    take,
    release,
    isEditor: status === 'editor',
    dismissLost,
  };
}
