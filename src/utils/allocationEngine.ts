/**
 * Plan generation algorithm for TL allocation.
 * Pure function — takes pitches and config, returns a default plan.
 * Used by both the real TLAllocationView (with live data) and allocationMockData.ts.
 */
import type {
  AllocationPitch,
  AllocationConfig,
  PersonCapacity,
  PlanAssignment,
} from '../types/allocationTypes';

/** Higher score = higher priority. Lower vote tier (1=best) maps to higher score. */
function pitchPriorityScore(pitch: AllocationPitch): number {
  const teamScore = (5 - pitch.teamPriorityScore) / 4;
  const tlScore = (5 - pitch.tlPriorityScore) / 4;
  return 0.50 * teamScore + 0.50 * tlScore;
}

/**
 * Translate a capacity tier into a numeric cap relative to a baseline.
 * Used by all three allocation algorithms (Stage 1 dev, PQA1, Stage 2 TL/QM)
 * to honor per-person `AllocationConfig.capacityByName` entries.
 */
export function capForPerson(
  baseline: number,
  capacity: PersonCapacity | undefined,
  field: 'devCapacity' | 'pqa1Capacity' | 'capacity',
): number {
  const tier = capacity?.[field];
  switch (tier) {
    case 'above-avg': return baseline + 1;
    case 'fewer':     return Math.max(0, baseline - 1);
    case 'none':      return 0;
    case 'avg':
    case undefined:
    default:          return baseline;
  }
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

  // Baseline of 2 projects per dev, shifted per-person via capacityByName.
  // Total slots = sum of per-dev caps (people with 'none' contribute 0).
  const DEV_BASELINE = 2;
  const devCapByName: Record<string, number> = {};
  devNames.forEach(d => {
    devCapByName[d] = capForPerson(DEV_BASELINE, config.capacityByName?.[d], 'devCapacity');
  });
  const totalSlots = devNames.reduce((s, d) => s + devCapByName[d], 0);
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

  // Dev TLs aren't in the regular dev pool — by default they don't take dev
  // work. Exception: if a TL was the previousDev on a continuation, we keep
  // them on it. They're pre-assigned outside Hungarian (one slot per TL,
  // never used for non-continuation pitches).
  const fullyUnavailableSet = new Set(config.unavailableNames ?? []);
  const tlContinuationCandidates = new Set(
    config.devTLNames.filter(n => !fullyUnavailableSet.has(n) && !lockedPersons.has(n)),
  );
  const isTLContinuation = (p: AllocationPitch): boolean =>
    !!(p.continuation && p.previousDev && tlContinuationCandidates.has(p.previousDev));

  const tlContinuationPitches = selected.filter(isTLContinuation);
  const remainingForHungarian = selected.filter(p => !isTLContinuation(p));

  // Continuations prefer their previousDev; open pitches compete freely.
  const continuations = remainingForHungarian.filter(p => p.continuation && p.previousDev && devNames.includes(p.previousDev!));
  const openPitches   = remainingForHungarian.filter(p => !(p.continuation && p.previousDev && devNames.includes(p.previousDev!)));
  const allSelected   = [...continuations, ...openPitches];

  const newAssignments: PlanAssignment[] = [];

  // Pre-assign TL-continuation pitches outside the Hungarian matching so the
  // TL never gets pulled onto unrelated pitches just to fill a slot.
  tlContinuationPitches.forEach(p => {
    newAssignments.push({ pitchId: p.id, assignedDev: p.previousDev!, status: 'selected' });
  });

  // Expand each dev into (per-person cap - lockedDevCount) slots for Hungarian capacity encoding.
  const devSlots: string[] = [];
  devNames.forEach(d => {
    const available = Math.max(0, devCapByName[d] - (lockedDevCount[d] ?? 0));
    for (let s = 0; s < available; s++) devSlots.push(d);
  });

  if (devSlots.length === 0 || allSelected.length === 0) {
    allSelected.forEach(p => newAssignments.push({ pitchId: p.id, assignedDev: null, status: 'selected' }));
  } else {
    const BIG = 100;
    const totalCols = Math.max(devSlots.length, allSelected.length);
    const paddedSlots: (string | null)[] = [
      ...devSlots,
      ...new Array(totalCols - devSlots.length).fill(null),
    ];

    const interestScore = (pitch: AllocationPitch, dev: string): number =>
      (pitch.devInterest[dev] ?? 2.5) as number;

    const costMatrix: number[][] = allSelected.map(pitch =>
      paddedSlots.map(dev => {
        if (dev === null) return BIG;
        if (lockedPersons.has(dev)) return BIG;
        // Continuations: strongly prefer previousDev unless they expressed low (tier 4) interest.
        if (pitch.continuation && pitch.previousDev === dev && interestScore(pitch, dev) !== 4) return 0;
        return interestScore(pitch, dev);
      }),
    );

    const assignment = hungarianMinCost(costMatrix);

    allSelected.forEach((pitch, i) => {
      const colIdx = assignment[i];
      const dev = colIdx >= 0 && colIdx < devSlots.length ? devSlots[colIdx] : null;
      newAssignments.push({
        pitchId: pitch.id,
        assignedDev: costMatrix[i][colIdx] >= BIG ? null : dev,
        status: 'selected',
      });
    });
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
  config: AllocationConfig,
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

  // Dev TLs aren't in the regular PQA1 pool — by default they don't review.
  // Exception: if a TL was the previousPQA1 on a continuation, keep them on
  // it. Pre-assigned outside Hungarian so they don't absorb other reviews.
  const fullyUnavailableSet = new Set(config.unavailableNames ?? []);
  const tlPqa1Candidates = new Set(
    config.devTLNames.filter(n => !fullyUnavailableSet.has(n) && !lockedPersons.has(n)),
  );
  const tlContinuationPqa1: string[] = [];
  pitches.forEach(p => {
    if (effLocked.has(p.id)) return;
    if (!p.continuation || !p.previousPQA1) return;
    if (!tlPqa1Candidates.has(p.previousPQA1)) return;
    // Don't assign TL as PQA1 of a pitch they're also the dev for.
    if ((devByPitchId[p.id] ?? null) === p.previousPQA1) return;
    result[p.id] = p.previousPQA1;
    tlContinuationPqa1.push(p.id);
  });

  // Baseline = fair share of total. Per-person caps shift this baseline via
  // capacityByName. 'none' (cap=0) excludes the dev from candidacy entirely.
  const baselineCap = devNames.length > 0 ? Math.ceil(pitches.length / devNames.length) : 0;
  const capByName: Record<string, number> = {};
  devNames.forEach(d => {
    capByName[d] = capForPerson(baselineCap, config.capacityByName?.[d], 'pqa1Capacity');
  });

  // Absent key = unrated (no opinion expressed) → neutral 2.5, preferred over medium interest (3).
  // Only an explicit null means "actively skipped" → 5.
  const pqa1Score = (pitch: AllocationPitch, dev: string): number => {
    if (!(dev in pitch.devInterest)) return 2.5;
    const v = pitch.devInterest[dev];
    return v === null ? 5 : (v as number);
  };

  const tlPreassignedSet = new Set(tlContinuationPqa1);
  const unlockedPitches = pitches.filter(p => !effLocked.has(p.id) && !tlPreassignedSet.has(p.id));

  if (unlockedPitches.length === 0) return result;

  // Expand each dev into (per-person cap - lockedLoad) individual slots so the
  // Hungarian algorithm respects per-dev capacity without needing a separate flow layer.
  const BIG = 100; // cost sentinel for infeasible assignments
  const devSlots: string[] = [];
  devNames.forEach(d => {
    const available = Math.max(0, capByName[d] - (pqa1Load[d] ?? 0));
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
