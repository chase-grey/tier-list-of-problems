import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Pitch, Vote, Tier, InterestLevel } from '../types/models';

interface UseKeyboardNavOptions {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  stage: 'priority' | 'interest';
  isActive: boolean;
  setTier: (id: string, tier: Tier) => void;
  clearTier: (id: string) => void;
  clearTierToTop: (id: string) => void;
  setInterest: (id: string, level: InterestLevel) => void;
  clearInterest: (id: string) => void;
  clearInterestToTop: (id: string) => void;
  sendToBottom: (id: string) => void;
  openHelp: () => void;
}

/**
 * Keyboard navigation for the voting board.
 *
 * j/k — sequential navigation through the ordered pitch list
 * Arrow Up/Down — move within the same column (tier/interest level)
 * Arrow Left/Right — move to adjacent column, same row position
 *
 * Returns focusedPitchId and setFocusedPitchId so the parent can
 * highlight the focused card and pass it down the tree.
 */
export const useKeyboardNav = ({
  pitches,
  votes,
  stage,
  isActive,
  setTier,
  clearTier,
  clearTierToTop,
  setInterest,
  clearInterest,
  clearInterestToTop,
  sendToBottom,
  openHelp,
}: UseKeyboardNavOptions): {
  focusedPitchId: string | null;
  setFocusedPitchId: (id: string | null) => void;
} => {
  const [focusedPitchId, setFocusedPitchId] = useState<string | null>(null);

  // Build an ordered list of pitches for sequential j/k navigation.
  // Priority mode: unsorted first (asc timestamp), then tier 1, 2, 3, 4 (each asc timestamp).
  // Interest mode: unranked first, then level 1, 2, 3, 4.
  const orderedList = useMemo((): Pitch[] => {
    if (stage === 'priority') {
      const groups: Pitch[][] = [[], [], [], [], []]; // [unsorted, t1, t2, t3, t4]
      for (const pitch of pitches) {
        const tier = votes[pitch.id]?.tier ?? null;
        const idx = tier === null ? 0 : (tier as number);
        groups[idx].push(pitch);
      }
      for (const g of groups) {
        g.sort((a, b) => {
          const tA = votes[a.id]?.timestamp ?? 0;
          const tB = votes[b.id]?.timestamp ?? 0;
          return tA !== tB ? tA - tB : a.id.localeCompare(b.id);
        });
      }
      return groups.flat();
    } else {
      // interest mode
      const groups: Pitch[][] = [[], [], [], [], []]; // [unranked, l1, l2, l3, l4]
      for (const pitch of pitches) {
        const level = votes[pitch.id]?.interestLevel ?? null;
        const idx = level === null ? 0 : (level as number);
        groups[idx].push(pitch);
      }
      for (const g of groups) {
        g.sort((a, b) => {
          const tA = votes[a.id]?.timestamp ?? 0;
          const tB = votes[b.id]?.timestamp ?? 0;
          return tA !== tB ? tA - tB : a.id.localeCompare(b.id);
        });
      }
      return groups.flat();
    }
  }, [pitches, votes, stage]);

  // Helper: is a pitch unranked?
  const isUnranked = useCallback(
    (id: string): boolean => {
      if (stage === 'priority') {
        return (votes[id]?.tier ?? null) === null;
      }
      return (votes[id]?.interestLevel ?? null) === null;
    },
    [votes, stage]
  );

  // Helper: find current index in ordered list
  const currentIndex = useCallback(
    (id: string | null): number => {
      if (id === null) return -1;
      return orderedList.findIndex(p => p.id === id);
    },
    [orderedList]
  );

  // Column order: null (unsorted/unranked) = 0, then levels 1–4
  const COLUMN_ORDER: (number | null)[] = [null, 1, 2, 3, 4];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isActive) return;

      // Don't fire shortcuts when focus is in an input-like element
      const target = event.target as HTMLElement;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // ── Column helpers (closures so they use fresh votes/pitches) ──────────
      const getCardColumn = (pitchId: string): number | null =>
        stage === 'priority'
          ? (votes[pitchId]?.tier ?? null)
          : (votes[pitchId]?.interestLevel ?? null);

      const getColumnPitches = (colValue: number | null): Pitch[] =>
        pitches
          .filter(p => getCardColumn(p.id) === colValue)
          .sort((a, b) => {
            const tA = votes[a.id]?.timestamp ?? 0;
            const tB = votes[b.id]?.timestamp ?? 0;
            return tA !== tB ? tA - tB : a.id.localeCompare(b.id);
          });

      const key = event.key;

      // ── Sequential navigation: j / k (linear through ordered list) ────────
      if (key === 'j') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        const idx = currentIndex(focusedPitchId);
        const next = idx === -1 ? 0 : (idx + 1) % orderedList.length;
        setFocusedPitchId(orderedList[next].id);
        return;
      }

      if (key === 'k') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        const idx = currentIndex(focusedPitchId);
        const prev = idx === -1 ? 0 : (idx - 1 + orderedList.length) % orderedList.length;
        setFocusedPitchId(orderedList[prev].id);
        return;
      }

      // ── Column navigation: Arrow keys ──────────────────────────────────────
      if (key === 'ArrowDown') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        if (!focusedPitchId) { setFocusedPitchId(orderedList[0].id); return; }
        const col = getCardColumn(focusedPitchId);
        const colPitches = getColumnPitches(col);
        const idx = colPitches.findIndex(p => p.id === focusedPitchId);
        if (idx !== -1 && idx < colPitches.length - 1) {
          setFocusedPitchId(colPitches[idx + 1].id);
        }
        return;
      }

      if (key === 'ArrowUp') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        if (!focusedPitchId) { setFocusedPitchId(orderedList[0].id); return; }
        const col = getCardColumn(focusedPitchId);
        const colPitches = getColumnPitches(col);
        const idx = colPitches.findIndex(p => p.id === focusedPitchId);
        if (idx > 0) {
          setFocusedPitchId(colPitches[idx - 1].id);
        }
        return;
      }

      if (key === 'ArrowRight') {
        event.preventDefault();
        if (!focusedPitchId) { setFocusedPitchId(orderedList[0]?.id ?? null); return; }
        const col = getCardColumn(focusedPitchId);
        const colIdx = COLUMN_ORDER.indexOf(col);
        const myPos = getColumnPitches(col).findIndex(p => p.id === focusedPitchId);
        // Scan right, skipping empty columns
        for (let i = colIdx + 1; i < COLUMN_ORDER.length; i++) {
          const nextColPitches = getColumnPitches(COLUMN_ORDER[i]);
          if (nextColPitches.length > 0) {
            setFocusedPitchId(nextColPitches[Math.min(myPos, nextColPitches.length - 1)].id);
            break;
          }
        }
        return;
      }

      if (key === 'ArrowLeft') {
        event.preventDefault();
        if (!focusedPitchId) { setFocusedPitchId(orderedList[0]?.id ?? null); return; }
        const col = getCardColumn(focusedPitchId);
        const colIdx = COLUMN_ORDER.indexOf(col);
        const myPos = getColumnPitches(col).findIndex(p => p.id === focusedPitchId);
        // Scan left, skipping empty columns
        for (let i = colIdx - 1; i >= 0; i--) {
          const prevColPitches = getColumnPitches(COLUMN_ORDER[i]);
          if (prevColPitches.length > 0) {
            setFocusedPitchId(prevColPitches[Math.min(myPos, prevColPitches.length - 1)].id);
            break;
          }
        }
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        const firstUnranked = orderedList.find(p => isUnranked(p.id));
        if (firstUnranked) setFocusedPitchId(firstUnranked.id);
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        if (!focusedPitchId) return;
        if (!isUnranked(focusedPitchId)) return; // only for unranked cards
        sendToBottom(focusedPitchId);
        // Focus the next unranked card (excluding current)
        const nextUnranked = orderedList.find(p => p.id !== focusedPitchId && isUnranked(p.id));
        setFocusedPitchId(nextUnranked?.id ?? null);
        return;
      }

      if (key === 'Enter') {
        event.preventDefault();
        if (!focusedPitchId) return;
        document.dispatchEvent(
          new CustomEvent('kbdOpenDetails', { detail: { pitchId: focusedPitchId } })
        );
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('kbdCloseDetails'));
        setFocusedPitchId(null);
        return;
      }

      if (key === '?') {
        event.preventDefault();
        openHelp();
        return;
      }

      // Ranking shortcuts 1–4 (set tier/level) and 0 (clear to top of unsorted)
      if (key === '0' || key === '1' || key === '2' || key === '3' || key === '4') {
        event.preventDefault();
        let targetId = focusedPitchId;
        if (!targetId && orderedList.length > 0) {
          targetId = orderedList[0].id;
          setFocusedPitchId(targetId);
        }
        if (!targetId) return;

        const level = parseInt(key) as 0 | 1 | 2 | 3 | 4;
        if (stage === 'priority') {
          if (level === 0) {
            clearTierToTop(targetId);
          } else {
            setTier(targetId, level as Tier);
          }
        } else {
          if (level === 0) {
            clearInterestToTop(targetId);
          } else {
            setInterest(targetId, level as InterestLevel);
          }
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isActive,
    focusedPitchId,
    orderedList,
    stage,
    votes,
    pitches,
    currentIndex,
    isUnranked,
    setTier,
    clearTier,
    clearTierToTop,
    setInterest,
    clearInterest,
    clearInterestToTop,
    sendToBottom,
    openHelp,
  ]);

  return { focusedPitchId, setFocusedPitchId };
};
