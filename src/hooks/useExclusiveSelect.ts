import { useState, useEffect, useCallback, useRef } from 'react';

// Module-level: only one Select open at a time across the whole page.
let _currentId: string | null = null;
const _closeCallbacks = new Map<string, () => void>();

/**
 * Makes any number of MUI Select components share a single-open-at-a-time policy.
 * Pass a stable unique `id` (e.g. `${pitchId}-devTL`) and spread the returned
 * `{ open, onOpen, onClose, MenuProps }` onto the Select.
 */
export function useExclusiveSelect(id: string) {
  const [open, setOpen] = useState(false);
  // useRef so the cleanup function always sees the currently-registered handler,
  // even though the handler is assigned inside a setTimeout after the cleanup is created.
  const handlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Register / unregister this Select's close callback in the module-level map.
  useEffect(() => {
    _closeCallbacks.set(id, () => setOpen(false));
    return () => {
      _closeCallbacks.delete(id);
      if (_currentId === id) _currentId = null;
    };
  }, [id]);

  // When open, add a document mousedown listener to close on outside clicks.
  // Deferred by one tick (setTimeout 0) so the click that opened the Select
  // doesn't immediately trigger the outside-click handler.
  useEffect(() => {
    // Always remove any previously-registered handler first.
    if (handlerRef.current) {
      document.removeEventListener('mousedown', handlerRef.current);
      handlerRef.current = null;
    }

    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const handler = (e: MouseEvent) => {
        // .MuiMenu-paper is only on the Paper itself, not the full-viewport
        // modal root div that also carries .MuiMenu-root.
        if ((e.target as Element).closest('.MuiMenu-paper')) return;
        setOpen(false);
        if (_currentId === id) _currentId = null;
      };
      handlerRef.current = handler;
      document.addEventListener('mousedown', handler);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      // Timer may have already fired and registered a handler; remove it.
      if (handlerRef.current) {
        document.removeEventListener('mousedown', handlerRef.current);
        handlerRef.current = null;
      }
    };
  }, [open, id]);

  const onOpen = useCallback(() => {
    // Close whatever Select is currently open before opening this one.
    if (_currentId && _currentId !== id) {
      _closeCallbacks.get(_currentId)?.();
    }
    _currentId = id;
    setOpen(true);
  }, [id]);

  const onClose = useCallback(() => {
    if (_currentId === id) _currentId = null;
    setOpen(false);
  }, [id]);

  return {
    open,
    onOpen,
    onClose,
    // pointer-events:none on the modal root lets clicks pass through to other
    // Select triggers; pointer-events:auto on the Paper keeps it interactive.
    MenuProps: {
      hideBackdrop: true,
      sx: { pointerEvents: 'none' },
      PaperProps: { sx: { pointerEvents: 'auto' } },
    },
  };
}
