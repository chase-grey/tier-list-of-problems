import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Pitch, Vote, Tier, InterestLevel } from '../types/models';

interface UseKeyboardNavOptions {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  stage: 'priority' | 'interest';
  isActive: boolean;
  setTier: (id: string, tier: Tier) => void;
  clearTier: (id: string) => void;
  setInterest: (id: string, level: InterestLevel) => void;
  clearInterest: (id: string) => void;
  sendToBottom: (id: string) => void;
  openHelp: () => void;
}

/**
 * Keyboard navigation for the voting board.
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
  setInterest,
  clearInterest,
  sendToBottom,
  openHelp,
}: UseKeyboardNavOptions): {
  focusedPitchId: string | null;
  setFocusedPitchId: (id: string | null) => void;
} => {
  const [focusedPitchId, setFocusedPitchId] = useState<string | null>(null);

  // Build an ordered list of pitches for navigation.
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

      const key = event.key;

      // Navigation keys
      if (key === 'j' || key === 'ArrowDown') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        const idx = currentIndex(focusedPitchId);
        const next = idx === -1 ? 0 : (idx + 1) % orderedList.length;
        setFocusedPitchId(orderedList[next].id);
        return;
      }

      if (key === 'k' || key === 'ArrowUp') {
        event.preventDefault();
        if (orderedList.length === 0) return;
        const idx = currentIndex(focusedPitchId);
        const prev = idx === -1 ? 0 : (idx - 1 + orderedList.length) % orderedList.length;
        setFocusedPitchId(orderedList[prev].id);
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

      // Ranking shortcuts 0–4
      if (key === '0' || key === '1' || key === '2' || key === '3' || key === '4') {
        event.preventDefault();
        // If no card is focused, default to first card
        let targetId = focusedPitchId;
        if (!targetId && orderedList.length > 0) {
          targetId = orderedList[0].id;
          setFocusedPitchId(targetId);
        }
        if (!targetId) return;

        const level = parseInt(key) as 0 | 1 | 2 | 3 | 4;
        if (stage === 'priority') {
          if (level === 0) {
            clearTier(targetId);
          } else {
            setTier(targetId, level as Tier);
          }
        } else {
          if (level === 0) {
            clearInterest(targetId);
          } else {
            setInterest(targetId, level as InterestLevel);
          }
        }
        // Keep focus on the same card (do not auto-advance)
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
    currentIndex,
    isUnranked,
    setTier,
    clearTier,
    setInterest,
    clearInterest,
    sendToBottom,
    openHelp,
  ]);

  return { focusedPitchId, setFocusedPitchId };
};
