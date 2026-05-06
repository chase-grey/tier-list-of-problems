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
  // Stage 2 dev pool excludes both fully-unavailable people AND devs who said
  // they're only available as PQA1 reviewers (committed to another project).
  const unavailableForDevSet = new Set([
    ...(config.unavailableNames ?? []),
    ...(config.unavailableForDevNames ?? []),
  ]);
  const devNames = config.devNames.filter(d => !unavailableForDevSet.has(d));
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
      const bestA = eligibleDevs.reduce((min, d) => Math.min(min, (a.devInterest[d] ?? 2.5) as number), 2.5);
      const bestB = eligibleDevs.reduce((min, d) => Math.min(min, (b.devInterest[d] ?? 2.5) as number), 2.5);
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
        const tA = pitch.devInterest[a] ?? 2.5;
        const tB = pitch.devInterest[b] ?? 2.5;
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
    pitch && dev ? ((pitch.devInterest[dev] ?? 2.5) as number) : 2.5;
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
/**
 * Min-cost bipartite matching via the Hungarian algorithm (O(n²m)).
 * cost is an n×m matrix with n ≤ m; returns assignment[i] = column index for row i.
 */
function hungarianMinCost(cost: number[][]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0].length;
  const INF = 1e15;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0); // p[j] = 1-indexed row currently assigned to col j
  const way = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minVal = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minVal[j] -= delta;
      }
      j0 = j1!;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
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

  // Absent key = unrated (no opinion expressed) → neutral 2.5, preferred over medium interest (3).
  // Only an explicit null means "actively skipped" → 5.
  const pqa1Score = (pitch: AllocationPitch, dev: string): number => {
    if (!(dev in pitch.devInterest)) return 2.5;
    const v = pitch.devInterest[dev];
    return v === null ? 5 : (v as number);
  };

  const unlockedPitches = pitches.filter(p => !effLocked.has(p.id));

  if (unlockedPitches.length === 0) return result;

  // Expand each dev into (cap - lockedLoad) individual slots so the Hungarian
  // algorithm respects per-dev capacity without needing a separate flow layer.
  const BIG = 100; // cost sentinel for infeasible assignments
  const devSlots: string[] = [];
  devNames.forEach(d => {
    const available = Math.max(0, cap - (pqa1Load[d] ?? 0));
    for (let s = 0; s < available; s++) devSlots.push(d);
  });

  if (devSlots.length === 0) {
    unlockedPitches.forEach(p => { result[p.id] = null; });
    return result;
  }

  // Pad with dummy null-dev columns if slots are scarcer than pitches so every
  // pitch row gets exactly one column in the square (n×n) matching.
  const totalCols = Math.max(devSlots.length, unlockedPitches.length);
  const paddedSlots: (string | null)[] = [
    ...devSlots,
    ...new Array(totalCols - devSlots.length).fill(null),
  ];

  // Build cost matrix: rows = unlocked pitches, cols = dev slots (+ null padding).
  const costMatrix: number[][] = unlockedPitches.map(pitch => {
    const assignedDev = devByPitchId[pitch.id] ?? null;
    return paddedSlots.map(dev => {
      if (dev === null) return BIG;         // dummy slot → will assign null
      if (dev === assignedDev) return BIG;  // can't review own pitch
      if (lockedPersons.has(dev)) return BIG;
      return pqa1Score(pitch, dev);
    });
  });

  const assignment = hungarianMinCost(costMatrix);

  unlockedPitches.forEach((pitch, i) => {
    const colIdx = assignment[i];
    const dev = colIdx >= 0 && colIdx < devSlots.length ? devSlots[colIdx] : null;
    result[pitch.id] = costMatrix[i][colIdx] >= BIG ? null : dev;
  });

  return result;
}
