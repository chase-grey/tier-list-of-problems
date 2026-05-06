/**
 * Plan generation algorithm for TL allocation.
 * Pure function — takes pitches and config, returns a default plan.
 * Used by both the real TLAllocationView (with live data) and allocationMockData.ts.
 */
import type {
  AllocationPitch,
  AllocationConfig,
  PlanAssignment,
} from '../types/allocationTypes';

/** Higher score = higher priority. Lower vote tier (1=best) maps to higher score. */
function pitchPriorityScore(pitch: AllocationPitch): number {
  const teamScore = (5 - pitch.teamPriorityScore) / 4;
  const tlScore = (5 - pitch.tlPriorityScore) / 4;
  return 0.50 * teamScore + 0.50 * tlScore;
}

/**
 * Generate a single default allocation plan from real pitches + config.
 * Uses balanced team/TL priority weighting (50/50).
 * TLs can adjust the resulting plan manually in Stage 1.
 *
 * Locks: a re-run preserves rows the user has explicitly locked. A locked
 * pitch keeps its current status + dev. A locked person doesn't receive any
 * new pitches, AND their currently-assigned pitches are treated as locked too
 * (so re-running won't shuffle them off).
 */
export function generateDefaultPlan(
  pitches: AllocationPitch[],
  config: AllocationConfig,
  options: {
    lockedPitchIds?: ReadonlySet<string>;
    lockedPersonNames?: ReadonlySet<string>;
    currentPlan?: PlanAssignment[];
  } = {},
): PlanAssignment[] {
  const lockedPitchIds = options.lockedPitchIds ?? new Set<string>();
  const lockedPersons = options.lockedPersonNames ?? new Set<string>();
  const currentPlan = options.currentPlan ?? [];
  const currentByPitch = new Map(currentPlan.map(a => [a.pitchId, a]));

  // Person-locks freeze any pitch the locked person currently has, so re-running
  // can't remove their work either. Combined with skipping them as a candidate,
  // this gives "their plan won't change" semantics.
  const effLocked = new Set(lockedPitchIds);
  currentPlan.forEach(a => {
    if (a.assignedDev && lockedPersons.has(a.assignedDev)) effLocked.add(a.pitchId);
  });

  const { bandwidth, nextUpCount } = config;
  const unavailableSet = new Set(config.unavailableNames ?? []);
  const devNames = config.devNames.filter(d => !unavailableSet.has(d));
  const categories = Object.keys(bandwidth);
  const pitchById = new Map(pitches.map(p => [p.id, p]));

  // Pre-count locked rows so the unlocked algorithm can deduct from totals.
  const lockedSelectedByCategory: Record<string, number> = {};
  const lockedDevCount: Record<string, number> = {};
  let lockedNextUpCount = 0;
  effLocked.forEach(id => {
    const a = currentByPitch.get(id);
    const p = pitchById.get(id);
    if (!a || !p) return;
    if (a.status === 'selected') {
      lockedSelectedByCategory[p.category] = (lockedSelectedByCategory[p.category] ?? 0) + 1;
    } else if (a.status === 'next-up') {
      lockedNextUpCount++;
    }
    if (a.assignedDev) {
      lockedDevCount[a.assignedDev] = (lockedDevCount[a.assignedDev] ?? 0) + 1;
    }
  });

  // 2 projects per dev
  const totalSlots = devNames.length * 2;
  const totalPct = categories.reduce((s, c) => s + bandwidth[c], 0);
  const rawSlots = categories.map(c => ({ cat: c, slots: (bandwidth[c] / totalPct) * totalSlots }));

  // Floor each, distribute remaining slots to highest fractional remainders
  const slotMap: Record<string, number> = {};
  rawSlots.forEach(({ cat, slots }) => { slotMap[cat] = Math.floor(slots); });
  let remaining = totalSlots - Object.values(slotMap).reduce((a, b) => a + b, 0);
  rawSlots
    .map(({ cat, slots }) => ({ cat, frac: slots - Math.floor(slots) }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remaining)
    .forEach(({ cat }) => { slotMap[cat]++; });

  // Locked-selected pitches consume their category's bandwidth before the
  // algorithm picks anything new.
  Object.keys(slotMap).forEach(cat => {
    slotMap[cat] = Math.max(0, slotMap[cat] - (lockedSelectedByCategory[cat] ?? 0));
  });

  // Select top unlocked pitches per category by priority score
  const selected: AllocationPitch[] = [];
  categories.forEach(cat => {
    const catPitches = pitches
      .filter(p => p.category === cat && !effLocked.has(p.id))
      .sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));
    const slots = Math.min(slotMap[cat] ?? 0, catPitches.length);
    selected.push(...catPitches.slice(0, slots));
  });

  // Assign devs: continuation projects lock to their previousDev first (unless at cap
  // or explicitly low interest), then fill the rest greedily by interest + workload.
  const devCount: Record<string, number> = {};
  devNames.forEach(d => { devCount[d] = lockedDevCount[d] ?? 0; });
  const MAX_PER_DEV = 2;

  // Process continuations first so previousDev slots are reserved before open pitches compete.
  const continuations = selected.filter(p => p.continuation && p.previousDev && devNames.includes(p.previousDev!));
  const openPitches   = selected.filter(p => !(p.continuation && p.previousDev && devNames.includes(p.previousDev!)));

  const sortByPriority = (arr: AllocationPitch[]) =>
    [...arr].sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));

  // Sort open pitches by best interest any *eligible* (non-locked) dev has.
  const sortByInterestThenPriority = (arr: AllocationPitch[]) => {
    const eligibleDevs = devNames.filter(d => !lockedPersons.has(d));
    return [...arr].sort((a, b) => {
      const bestA = eligibleDevs.reduce((min, d) => Math.min(min, (a.devInterest[d] ?? 5) as number), 5);
      const bestB = eligibleDevs.reduce((min, d) => Math.min(min, (b.devInterest[d] ?? 5) as number), 5);
      if (bestA !== bestB) return bestA - bestB;
      return pitchPriorityScore(b) - pitchPriorityScore(a);
    });
  };

  const assignDev = (pitch: AllocationPitch): string | null => {
    // For continuations: lock to previousDev unless at cap, locked person, or low interest (tier 4)
    if (pitch.continuation && pitch.previousDev && devNames.includes(pitch.previousDev)) {
      const prev = pitch.previousDev;
      const interest = pitch.devInterest[prev] ?? null;
      const lowInterest = interest === 4;
      if (!lowInterest && !lockedPersons.has(prev) && devCount[prev] < MAX_PER_DEV) {
        devCount[prev]++;
        return prev;
      }
    }
    // Open assignment: best interest tier, then pitch author, then fewest assignments
    const best = devNames
      .filter(d => !lockedPersons.has(d) && devCount[d] < MAX_PER_DEV)
      .sort((a, b) => {
        const tA = pitch.devInterest[a] ?? 5;
        const tB = pitch.devInterest[b] ?? 5;
        if (tA !== tB) return (tA as number) - (tB as number);
        const aAuthor = pitch.author === a ? -1 : 0;
        const bAuthor = pitch.author === b ? -1 : 0;
        if (aAuthor !== bAuthor) return aAuthor - bAuthor;
        return devCount[a] - devCount[b];
      })[0] ?? null;
    if (best) devCount[best]++;
    return best;
  };

  const newAssignments: PlanAssignment[] = [
    ...sortByPriority(continuations),
    ...sortByInterestThenPriority(openPitches),
  ].map(pitch => ({ pitchId: pitch.id, assignedDev: assignDev(pitch), status: 'selected' as const }));

  // Pairwise-swap improvement on unlocked rows: greedy can leave the last dev
  // with a tier-4 pitch even though a swap would lower the total interest-tier
  // sum. Iterate until no swap strictly improves the sum. Continuations locked
  // to their previousDev (non-tier-4) and locked persons are kept put.
  const tierOf = (pitch: AllocationPitch | undefined, dev: string | null): number =>
    pitch && dev ? ((pitch.devInterest[dev] ?? 5) as number) : 5;
  const isContinuationLock = (a: PlanAssignment): boolean => {
    if (a.status !== 'selected' || !a.assignedDev) return false;
    const p = pitchById.get(a.pitchId);
    if (!p || !p.continuation || !p.previousDev) return false;
    return p.previousDev === a.assignedDev && tierOf(p, a.assignedDev) !== 4;
  };

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < newAssignments.length; i++) {
      const a = newAssignments[i];
      if (a.status !== 'selected' || !a.assignedDev) continue;
      if (isContinuationLock(a)) continue;
      if (lockedPersons.has(a.assignedDev)) continue;
      for (let j = i + 1; j < newAssignments.length; j++) {
        const b = newAssignments[j];
        if (b.status !== 'selected' || !b.assignedDev) continue;
        if (a.assignedDev === b.assignedDev) continue;
        if (isContinuationLock(b)) continue;
        if (lockedPersons.has(b.assignedDev)) continue;
        const pi = pitchById.get(a.pitchId);
        const pj = pitchById.get(b.pitchId);
        const curr = tierOf(pi, a.assignedDev) + tierOf(pj, b.assignedDev);
        const swap = tierOf(pi, b.assignedDev) + tierOf(pj, a.assignedDev);
        if (swap < curr) {
          const tmp = a.assignedDev;
          a.assignedDev = b.assignedDev;
          b.assignedDev = tmp;
          improved = true;
        }
      }
    }
  }

  // Combine: locked rows preserve their status+dev, then new selected rows.
  const result: PlanAssignment[] = [];
  effLocked.forEach(id => {
    const a = currentByPitch.get(id);
    if (a) result.push({ ...a });
  });
  result.push(...newAssignments);

  // Next-up + cut: from pitches not locked and not in `selected`.
  const inResult = new Set(result.map(r => r.pitchId));
  const remainingPitches = pitches
    .filter(p => !inResult.has(p.id))
    .sort((a, b) => pitchPriorityScore(b) - pitchPriorityScore(a));

  const allowedNextUp = Math.max(0, nextUpCount - lockedNextUpCount);

  remainingPitches.slice(0, allowedNextUp).forEach(p =>
    result.push({ pitchId: p.id, assignedDev: null, status: 'next-up' }),
  );
  remainingPitches.slice(allowedNextUp).forEach(p =>
    result.push({ pitchId: p.id, assignedDev: null, status: 'cut' }),
  );

  return result;
}

/**
 * Auto-assign a PQA1 reviewer for each pitch using round-1 developer interest.
 * The assigned dev is excluded from candidacy. Ties broken by current PQA1 load.
 * Higher-priority pitches (lower teamPriorityScore) are assigned first.
 * Returns pitchId → reviewer name (or null if no candidates remain).
 *
 * Locks: locked pitches keep their existing PQA1 reviewer. Locked persons
 * aren't given new reviewer assignments, and their existing assignments are
 * preserved (their pitches are treated as locked).
 */
export function autoAssignPqa1(
  pitches: AllocationPitch[],
  devByPitchId: Record<string, string | null>,
  devNames: string[],
  options: {
    lockedPitchIds?: ReadonlySet<string>;
    lockedPersonNames?: ReadonlySet<string>;
    currentPqa1ByPitch?: Record<string, string | null>;
  } = {},
): Record<string, string | null> {
  const lockedPitchIds = options.lockedPitchIds ?? new Set<string>();
  const lockedPersons = options.lockedPersonNames ?? new Set<string>();
  const currentPqa1 = options.currentPqa1ByPitch ?? {};

  // Person-locks freeze any pitch where they're currently the PQA1 reviewer.
  const effLocked = new Set(lockedPitchIds);
  Object.entries(currentPqa1).forEach(([pid, reviewer]) => {
    if (reviewer && lockedPersons.has(reviewer)) effLocked.add(pid);
  });

  const result: Record<string, string | null> = {};
  const pqa1Load: Record<string, number> = {};
  devNames.forEach(d => { pqa1Load[d] = 0; });

  // Pre-fill locked pitches with their current reviewer; count their load.
  effLocked.forEach(id => {
    const reviewer = currentPqa1[id] ?? null;
    result[id] = reviewer;
    if (reviewer && reviewer in pqa1Load) pqa1Load[reviewer]++;
  });

  // Hard cap so no dev gets more than their fair share regardless of interest advantage.
  const cap = devNames.length > 0 ? Math.ceil(pitches.length / devNames.length) : 0;

  // Sort unlocked pitches by best available interest for any eligible (non-locked) dev.
  const unlockedPitches = pitches.filter(p => !effLocked.has(p.id));
  const sorted = [...unlockedPitches].sort((a, b) => {
    const exA = devByPitchId[a.id] ?? null;
    const exB = devByPitchId[b.id] ?? null;
    const bestA = devNames
      .filter(d => d !== exA && !lockedPersons.has(d))
      .reduce((min, d) => Math.min(min, (a.devInterest[d] ?? 3) as number), Infinity);
    const bestB = devNames
      .filter(d => d !== exB && !lockedPersons.has(d))
      .reduce((min, d) => Math.min(min, (b.devInterest[d] ?? 3) as number), Infinity);
    if (bestA !== bestB) return bestA - bestB;
    return a.teamPriorityScore - b.teamPriorityScore;
  });

  for (const pitch of sorted) {
    const assignedDev = devByPitchId[pitch.id] ?? null;
    const candidate =
      devNames
        .filter(d => d !== assignedDev && !lockedPersons.has(d) && pqa1Load[d] < cap)
        .sort((a, b) => {
          const tA = (pitch.devInterest[a] ?? 3) as number;
          const tB = (pitch.devInterest[b] ?? 3) as number;
          if (tA !== tB) return tA - tB;
          const aAuthor = pitch.author === a ? -1 : 0;
          const bAuthor = pitch.author === b ? -1 : 0;
          if (aAuthor !== bAuthor) return aAuthor - bAuthor;
          return pqa1Load[a] - pqa1Load[b];
        })[0] ?? null;

    result[pitch.id] = candidate;
    if (candidate) pqa1Load[candidate]++;
  }

  return result;
}
