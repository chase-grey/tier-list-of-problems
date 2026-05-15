import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import type { Pitch } from '../../types/models';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLAN,
} from '../../mocks/allocationMockData';
import { fetchAllocationConfig, fetchAllocationVoteData, setCapacityOverride } from '../../services/allocationApi';
import type { CapacityOverridePayload } from '../../services/allocationApi';
import { savePlan, saveFinalAssignments, fetchPlanFull, fetchAdhocPitches, saveAdhocPitch as saveAdhocPitchApi, deleteAdhocPitch as deleteAdhocPitchApi, EditLockConflictError, fetchAllocationLocks, setAllocationLocks, type LockStage } from '../../services/api';
import type { PlanRow } from '../../services/api';
import AddPitchDialog, { type AdhocPitchDraft } from './AddPitchDialog';
import { useSnackbar } from '../../hooks/useSnackbar';
import { useEditLock } from '../../hooks/useEditLock';
import { getEditLockSessionId } from '../../hooks/editLockSession';
import EditLockBanner from './EditLockBanner';
import { generateDefaultPlan, autoAssignPqa1, capForPerson, hungarianMinCost } from '../../utils/allocationEngine';
import { fetchPitches } from '../../services/api';
import staticPitchesJson from '../../assets/pitches.json';
import Step1View from './Step1View';
import Step2View from './Step2View';
import Stage2ResultsView from './Stage2ResultsView';
import Stage4ResultsView from './Stage4ResultsView';
import { LoadingScreen } from '../LoadingScreen/LoadingScreen';

/**
 * Auto-assign scope. Stage 2 has only a dev role, so the parameter is ignored
 * there. Stage 4 can re-run all roles or just one (devTL / qm / pqa1) — used by
 * the TopBar split button's dropdown.
 */
export type RerunRole = 'all' | 'dev' | 'devTL' | 'qm' | 'pqa1';

export interface TLAllocationViewHandle {
  /** Save in place — persists to backend without navigating to the summary view. */
  triggerSave: () => Promise<boolean>;
  /** Save + navigate to the Stage 2/4 summary view. No-op if the save fails. */
  triggerFinalize: () => Promise<void>;
  triggerRerunAlgorithm: (role?: RerunRole) => void;
  /** Whether every selected pitch has all team roles filled (used to gate Finish). */
  isReadyToFinish: () => boolean;
  /** True iff the caller currently holds the stage edit lock. */
  hasLock: () => boolean;
  /**
   * Attempt to acquire the edit lock. `force=true` overrides a fresh foreign
   * holder; their unsaved work is lost (the toolbar dialog disclaims this).
   */
  triggerTakeLock: (force?: boolean) => Promise<{ acquired: boolean }>;
  /** Release the edit lock if currently the holder. No-op otherwise. */
  triggerReleaseLock: () => Promise<void>;
}

export interface AllocationStatus {
  hasLock: boolean;
  canFinish: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'dirty';
  /** Full lock state machine — used by the TopBar lock control. */
  lockStatus: 'loading' | 'editor' | 'viewer' | 'idle' | 'lost';
  /** Current lock-holder's full name (null when no one holds the lock). */
  lockHolder: string | null;
  /** Lock-holder's last heartbeat timestamp (ms) — drives the "active X ago" copy. */
  lockLastHeartbeat: number;
  /** "Stage 2" or "Stage 4" — for labels in the toolbar control. */
  stageLabel: string;
}

interface TLAllocationViewProps {
  activeStep: 0 | 1;
  showResults: boolean;
  onShowResultsChange: (v: boolean) => void;
  onFinalize?: () => void;
  onAllocationChange?: () => void;
  /**
   * Pushed up to App.tsx whenever the lock state or readiness changes, so the
   * TopBar Save/Finish buttons can react without polling the ref handle.
   */
  onStatusChange?: (status: AllocationStatus) => void;
  voterName: string;
  voterRole: string;
  pollingResolved?: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_STEP1_KEY = 'tl-alloc-step1-assignments';
const LS_STEP2_KEY = 'tl-alloc-step2-assignments';
const LS_STEP1_LOCKS_KEY = 'tl-alloc-step1-locks';
const LS_STEP2_LOCKS_KEY = 'tl-alloc-step2-locks';
const LS_ADHOC_KEY = 'tl-alloc-adhoc-pitches';

interface LockSet { pitchIds: string[]; personNames: string[]; }
const EMPTY_LOCKS: LockSet = { pitchIds: [], personNames: [] };

function lsRead<T>(key: string, fallback: T): T {
  try {
    const s = window.localStorage.getItem(key);
    return s != null ? (JSON.parse(s) as T) : fallback;
  } catch { return fallback; }
}

function lsWrite(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Auto-assign algorithm for Step 2 ────────────────────────────────────────

function autoAssignStep2(
  pitches: AllocationPitch[],
  phase2Interests: Phase2Interest[],
  config: AllocationConfig,
  options: {
    lockedPitchIds?: ReadonlySet<string>;
    lockedPersonNames?: ReadonlySet<string>;
    currentAssignments?: StaffingAssignment[];
  } = {},
): StaffingAssignment[] {
  const lockedPitchIds = options.lockedPitchIds ?? new Set<string>();
  const lockedPersons = options.lockedPersonNames ?? new Set<string>();
  const currentAssignments = options.currentAssignments ?? [];
  const currentByPitch = new Map(currentAssignments.map(a => [a.pitchId, a]));

  // Person-locks freeze any pitch where they currently hold either role, so
  // re-running can't rotate them off.
  const effLocked = new Set(lockedPitchIds);
  currentAssignments.forEach(a => {
    if ((a.devTL && lockedPersons.has(a.devTL)) || (a.qm && lockedPersons.has(a.qm))) {
      effLocked.add(a.pitchId);
    }
  });

  const unavailableSet = new Set(config.unavailableNames ?? []);
  const devTLNames = config.devTLNames.filter(n => !unavailableSet.has(n));
  const qmNames = config.qmNames.filter(n => !unavailableSet.has(n));

  // Per-person caps: baseline = fair share of total pitches, shifted by
  // capacityByName tier ('above-avg' = +1, 'fewer' = -1, 'none' = 0).
  const tlBaseline = devTLNames.length > 0 ? Math.ceil(pitches.length / devTLNames.length) : 0;
  const qmBaseline = qmNames.length > 0 ? Math.ceil(pitches.length / qmNames.length) : 0;
  const devTLCapByName: Record<string, number> = {};
  const qmCapByName: Record<string, number> = {};
  devTLNames.forEach(n => {
    devTLCapByName[n] = capForPerson(tlBaseline, config.capacityByName?.[n], 'capacity');
  });
  qmNames.forEach(n => {
    qmCapByName[n] = capForPerson(qmBaseline, config.capacityByName?.[n], 'capacity');
  });

  const devTLLoad: Record<string, number> = {};
  const qmLoad: Record<string, number> = {};
  devTLNames.forEach(n => { devTLLoad[n] = 0; });
  qmNames.forEach(n => { qmLoad[n] = 0; });

  // Pre-count locked rows so unlocked candidates compete against the right
  // baseline load.
  effLocked.forEach(id => {
    const a = currentByPitch.get(id);
    if (!a) return;
    if (a.devTL && a.devTL in devTLLoad) devTLLoad[a.devTL]++;
    if (a.qm && a.qm in qmLoad) qmLoad[a.qm]++;
  });

  // Build interest lookup maps keyed by person name for O(1) lookup in the
  // cost matrix. Missing entries (no submission) score 6 in tlQmScore, which
  // is worse than any explicit tier so interest data always wins.
  const devTLInterestMap: Record<string, Phase2Interest> = {};
  const qmInterestMap: Record<string, Phase2Interest> = {};
  phase2Interests.forEach(pi => {
    if (pi.role === 'dev TL') devTLInterestMap[pi.personName] = pi;
    else if (pi.role === 'QM') qmInterestMap[pi.personName] = pi;
  });

  // Continuations first; locked pitches deferred to the merge step.
  const unlockedPitches = pitches.filter(p => !effLocked.has(p.id));

  // Result maps: filled by continuation pre-assignment, then Hungarian.
  const devTLByPitch = new Map<string, string | null>();
  const qmByPitch = new Map<string, string | null>();

  // Phase 1: Continuation pre-assignment. Willing people (tier 1/2 or no data)
  // always keep their continuation regardless of cap, so they take priority before
  // the open pitches enter the global matching.
  unlockedPitches.filter(p => p.continuation).forEach(pitch => {
    if (pitch.previousTL && devTLNames.includes(pitch.previousTL) && !lockedPersons.has(pitch.previousTL)) {
      const tlInterest = devTLInterestMap[pitch.previousTL]?.interestByPitchId[pitch.id];
      const tlWilling = tlInterest === undefined || tlInterest === 1 || tlInterest === 2;
      if (tlWilling || (devTLLoad[pitch.previousTL] ?? 0) < (devTLCapByName[pitch.previousTL] ?? 0)) {
        devTLByPitch.set(pitch.id, pitch.previousTL);
        devTLLoad[pitch.previousTL]++;
      }
    }
    if (pitch.previousQM && qmNames.includes(pitch.previousQM) && !lockedPersons.has(pitch.previousQM)) {
      const qmInterest = qmInterestMap[pitch.previousQM]?.interestByPitchId[pitch.id];
      const qmWilling = qmInterest === undefined || qmInterest === 1 || qmInterest === 2;
      if (qmWilling || (qmLoad[pitch.previousQM] ?? 0) < (qmCapByName[pitch.previousQM] ?? 0)) {
        qmByPitch.set(pitch.id, pitch.previousQM);
        qmLoad[pitch.previousQM]++;
      }
    }
  });

  // Phase 2: Hungarian globally-optimal assignment for pitches without a role.
  // Cost = interest tier minus authorship bonus, matching PQA1 scoring:
  // tiers 1–4 direct; absent (no submission) = 6; null (skipped) = 50.
  // Authorship bonus: –1 if pitch.author === name, floored at 0. BIG = infeasible.
  const BIG = 100;
  const tlQmScore = (
    interestMap: Record<string, Phase2Interest>,
    pitch: AllocationPitch,
    name: string,
  ): number => {
    const raw = interestMap[name]?.interestByPitchId[pitch.id];
    const base = raw === undefined ? 6 : raw === null ? 50 : (raw as number);
    return Math.max(0, base - (pitch.author === name ? 1 : 0));
  };

  const assignHungarian = (
    pending: AllocationPitch[],
    pool: string[],
    load: Record<string, number>,
    capByName: Record<string, number>,
    interestMap: Record<string, Phase2Interest>,
    resultMap: Map<string, string | null>,
  ) => {
    if (pending.length === 0) return;
    const N = pending.length;
    const eligible = pool.filter(n => !lockedPersons.has(n) && (capByName[n] ?? 0) - (load[n] ?? 0) > 0);
    const remCap = (n: string) => Math.max(0, (capByName[n] ?? 0) - (load[n] ?? 0));
    const totalRemaining = eligible.reduce((s, n) => s + remCap(n), 0);

    if (totalRemaining === 0) {
      pending.forEach(p => resultMap.set(p.id, null));
      return;
    }

    // Penalty per additional slot within the same person: 5.5 * s.
    // The worst first-slot cost is absent (6); the best second-slot cost is
    // tier-1 + 5.5 = 6.5. Since 6.5 > 6, every first slot beats every second
    // slot — strict "fill all first slots before any second" — with interest
    // quality breaking ties within each round.
    const slots: string[] = [];
    const penalties: number[] = [];
    eligible.forEach(n => {
      for (let s = 0; s < remCap(n); s++) {
        slots.push(n);
        penalties.push(s * 5.5);
      }
    });

    const totalCols = Math.max(slots.length, N);
    const paddedSlots: (string | null)[] = [
      ...slots,
      ...new Array(totalCols - slots.length).fill(null),
    ];

    const costMatrix: number[][] = pending.map(pitch =>
      paddedSlots.map((name, j) => name === null ? BIG : tlQmScore(interestMap, pitch, name) + penalties[j])
    );

    const assignment = hungarianMinCost(costMatrix);
    pending.forEach((pitch, i) => {
      const colIdx = assignment[i];
      const name = colIdx >= 0 && colIdx < slots.length ? slots[colIdx] : null;
      const assigned = costMatrix[i][colIdx] >= BIG ? null : name;
      resultMap.set(pitch.id, assigned);
      if (assigned) load[assigned] = (load[assigned] ?? 0) + 1;
    });
  };

  // TL: all pitches not already covered by a willing continuation
  assignHungarian(
    unlockedPitches.filter(p => !devTLByPitch.has(p.id)),
    devTLNames, devTLLoad, devTLCapByName, devTLInterestMap, devTLByPitch,
  );

  // QM: same, independent of TL results
  assignHungarian(
    unlockedPitches.filter(p => !qmByPitch.has(p.id)),
    qmNames, qmLoad, qmCapByName, qmInterestMap, qmByPitch,
  );

  const newAssignments: StaffingAssignment[] = unlockedPitches.map(pitch => ({
    pitchId: pitch.id,
    devTL: devTLByPitch.get(pitch.id) ?? null,
    qm: qmByPitch.get(pitch.id) ?? null,
  }));

  // Combine: locked rows preserve their TL/QM (and pqa1, if set), then new rows.
  const result: StaffingAssignment[] = [];
  effLocked.forEach(id => {
    const a = currentByPitch.get(id);
    if (a) result.push({ ...a });
  });
  result.push(...newAssignments);

  return result;
}

// ─── Derive Phase2Interest[] from pitch devInterest ──────────────────────────
// Interest is stored in column G of the VOTES tab and returned as devInterest
// per pitch by getAllocationData(). No separate Phase 2 fetch is needed.

function derivePhase2Interests(pitches: AllocationPitch[], config: AllocationConfig): Phase2Interest[] {
  const buildEntry = (name: string, role: 'dev TL' | 'QM'): Phase2Interest => {
    const interestByPitchId: Record<string, 1 | 2 | 3 | 4 | null> = {};
    pitches.forEach(p => {
      if (name in p.devInterest) {
        interestByPitchId[p.id] = p.devInterest[name] as 1 | 2 | 3 | 4 | null;
      }
    });
    return { personName: name, role, interestByPitchId };
  };
  return [
    ...config.devTLNames.map(n => buildEntry(n, 'dev TL')),
    ...config.qmNames.map(n => buildEntry(n, 'QM')),
  ];
}

// ─── Merge real pitches + vote data into AllocationPitch[] ───────────────────

function enrichPitches(
  basePitches: Pitch[],
  voteData: Record<string, { teamVotes: Record<string, 0|1|2|3|4>; tlVotes: Record<string, 0|1|2|3|4>; teamPriorityScore: number; tlPriorityScore: number; devInterest?: Record<string, number | null> }>,
): AllocationPitch[] {
  return basePitches.map(p => {
    const v = voteData[p.id];
    return {
      ...p,
      teamVotes: v?.teamVotes ?? {},
      tlVotes: v?.tlVotes ?? {},
      teamPriorityScore: v?.teamPriorityScore ?? 0,
      tlPriorityScore: v?.tlPriorityScore ?? 0,
      devInterest: (v?.devInterest ?? {}) as AllocationPitch['devInterest'],
    };
  });
}

const TLAllocationView = forwardRef<TLAllocationViewHandle, TLAllocationViewProps>(function TLAllocationView({ activeStep, showResults, onShowResultsChange, onFinalize, onAllocationChange, onStatusChange, voterName, pollingResolved = true }, ref) {
  const { showSnackbar } = useSnackbar();

  // Save state for the TopBar Save button. Mutations flip to 'dirty';
  // handleSaveWithStatus drives 'saving' → 'saved' → 'idle' (timed). Defined
  // early so the mutation helpers below can flip it without forward refs.
  const [saveStatus, setSaveStatus] = useState<AllocationStatus['saveStatus']>('idle');
  const markDirty = () => {
    onAllocationChange?.();
    setSaveStatus(prev => prev === 'saving' ? prev : 'dirty');
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const [pitchStatus,  setPitchStatus]  = useState<'loading'|'done'|'error'>('loading');
  const [voteStatus,   setVoteStatus]   = useState<'loading'|'done'|'error'>('loading');
  const [configStatus, setConfigStatus] = useState<'loading'|'done'|'error'>('loading');
  const [pitchError,  setPitchError]  = useState<string | undefined>();
  const [voteError,   setVoteError]   = useState<string | undefined>();
  const [configError, setConfigError] = useState<string | undefined>();
  const [loadTrigger, setLoadTrigger] = useState(0);
  const [step2DataLoaded, setStep2DataLoaded] = useState(false);
  const [step2Ready,      setStep2Ready]      = useState(false);

  const dataLoading = !pollingResolved || [pitchStatus, voteStatus, configStatus].some(s => s === 'loading');
  // For Stage 4: keep the loading screen up until Promise.all has finished writing
  // backend data into state (step2DataLoaded) AND the init effect has run (step2Ready).
  // This prevents a flash caused by the individual fetch .then() handlers finishing
  // before Promise.all fires and updates step2Assignments.
  const loading = dataLoading || (activeStep === 1 && (!step2DataLoaded || !step2Ready));
  const hasLoadError = [pitchStatus, voteStatus, configStatus].some(s => s === 'error');
  const [usingMockData, setUsingMockData] = useState(false);

  const [allocationPitches, setAllocationPitches] = useState<AllocationPitch[]>(MOCK_PITCHES);
  const [allocationConfig, setAllocationConfig] = useState<AllocationConfig>(MOCK_CONFIG);
  const [adhocPitches, setAdhocPitches] = useState<AllocationPitch[]>(
    () => lsRead<AllocationPitch[]>(LS_ADHOC_KEY, [])
  );
  const allPitches = useMemo(
    () => [...allocationPitches, ...adhocPitches],
    [allocationPitches, adhocPitches],
  );

  // Read saved state from localStorage on mount (null = no saved state yet)
  const savedStep1 = useRef(lsRead<PlanAssignment[] | null>(LS_STEP1_KEY, null));
  const savedStep2 = useRef(lsRead<StaffingAssignment[] | null>(LS_STEP2_KEY, null));

  const [planAssignments, setPlanAssignments] = useState<PlanAssignment[]>(
    savedStep1.current ?? MOCK_PLAN
  );
  const [phase2Interests, setPhase2Interests] = useState<Phase2Interest[]>([]);

  // Lock state per stage. A locked pitch keeps its current row across re-runs;
  // a locked person can't be assigned new work. Persisted to the backend so
  // every TL sees the same locks; localStorage caches the last-known value
  // so the initial render isn't blank while the fetch is in flight.
  const [step1Locks, setStep1Locks] = useState<LockSet>(() => lsRead(LS_STEP1_LOCKS_KEY, EMPTY_LOCKS));
  const [step2Locks, setStep2Locks] = useState<LockSet>(() => lsRead(LS_STEP2_LOCKS_KEY, EMPTY_LOCKS));
  useEffect(() => { lsWrite(LS_STEP1_LOCKS_KEY, step1Locks); }, [step1Locks]);
  useEffect(() => { lsWrite(LS_STEP2_LOCKS_KEY, step2Locks); }, [step2Locks]);

  // Initial fetch: pull authoritative lock state from the backend and
  // overwrite local. `locksLoadedRef` gates the push effects below so we
  // don't echo the fetched values back to the backend on first paint.
  const locksLoadedRef = useRef(false);
  const skipNextLockPushRef = useRef({ step1: false, step2: false });
  useEffect(() => {
    let cancelled = false;
    fetchAllocationLocks().then(remote => {
      if (cancelled) return;
      if (remote) {
        // Backend is the source of truth — overwrite local with remote.
        // `skipNextLockPushRef` blocks the push effect from echoing the
        // fetched values straight back to the server.
        skipNextLockPushRef.current = { step1: true, step2: true };
        setStep1Locks(remote['2']);
        setStep2Locks(remote['4']);
      }
      // remote === null → backend route not deployed / unreachable. Keep
      // whatever LS gave us as the seed; subsequent toggles still try to
      // push (the failed POST gets swallowed silently) so once the backend
      // is redeployed the locks sync up on the next change.
      locksLoadedRef.current = true;
    }).catch(() => {
      locksLoadedRef.current = true;
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced push of step1 / step2 locks to the backend. Backend rejects
  // non-holders with edit-lock-conflict — we swallow that, since viewers
  // shouldn't be persisting locks anyway. The fetched-state echo is skipped
  // via skipNextLockPushRef.
  useEffect(() => {
    if (!locksLoadedRef.current) return;
    if (skipNextLockPushRef.current.step1) {
      skipNextLockPushRef.current.step1 = false;
      return;
    }
    if (!voterName) return;
    const handle = window.setTimeout(() => {
      setAllocationLocks('2', step1Locks, voterName, getEditLockSessionId()).catch(err => {
        if (!(err instanceof EditLockConflictError)) {
          console.warn('Failed to persist Stage 2 locks:', err);
        }
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [step1Locks, voterName]);
  useEffect(() => {
    if (!locksLoadedRef.current) return;
    if (skipNextLockPushRef.current.step2) {
      skipNextLockPushRef.current.step2 = false;
      return;
    }
    if (!voterName) return;
    const handle = window.setTimeout(() => {
      setAllocationLocks('4', step2Locks, voterName, getEditLockSessionId()).catch(err => {
        if (!(err instanceof EditLockConflictError)) {
          console.warn('Failed to persist Stage 4 locks:', err);
        }
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [step2Locks, voterName]);

  const toggleInArray = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const toggleStep1PitchLock = (pitchId: string) =>
    setStep1Locks(prev => ({ ...prev, pitchIds: toggleInArray(prev.pitchIds, pitchId) }));
  const toggleStep1PersonLock = (name: string) =>
    setStep1Locks(prev => ({ ...prev, personNames: toggleInArray(prev.personNames, name) }));
  const toggleStep2PitchLock = (pitchId: string) =>
    setStep2Locks(prev => ({ ...prev, pitchIds: toggleInArray(prev.pitchIds, pitchId) }));
  const toggleStep2PersonLock = (name: string) =>
    setStep2Locks(prev => ({ ...prev, personNames: toggleInArray(prev.personNames, name) }));

  useEffect(() => {
    let cancelled = false;

    setStep2DataLoaded(false);
    setStep2Ready(false);
    step2InitRef.current = false;
    setPitchStatus('loading'); setPitchError(undefined);
    setVoteStatus('loading');  setVoteError(undefined);
    setConfigStatus('loading'); setConfigError(undefined);

    const pitchP = fetchPitches()
      .then(v => { if (!cancelled) setPitchStatus('done'); return v; })
      .catch((e): Pitch[] => { if (!cancelled) { setPitchStatus('error'); setPitchError(e?.message ?? 'Failed to load pitches'); } return []; });

    const voteP = fetchAllocationVoteData()
      .then(v => { if (!cancelled) setVoteStatus('done'); return v; })
      .catch(e => { if (!cancelled) { setVoteStatus('error'); setVoteError(e?.message ?? 'Failed to load vote data'); } return { pitchData: {}, unavailableNames: [] } as Awaited<ReturnType<typeof fetchAllocationVoteData>>; });

    const configP = fetchAllocationConfig()
      .then(v => { if (!cancelled) setConfigStatus('done'); return v; })
      .catch(e => { if (!cancelled) { setConfigStatus('error'); setConfigError(e?.message ?? 'Failed to load config'); } return null; });

    // Source of truth for plan + team assignments is the PLAN sheet on the
    // backend, not per-machine localStorage — TLs collaborate, machines
    // diverge, and Stage 4 must reflect what was actually saved at finish.
    const planP = fetchPlanFull()
      .catch(() => ({} as Record<string, PlanRow>));

    // Adhoc pitches live on the backend so a TL adding one can be seen by
    // every other TL on next refresh. Best-effort — falls back to whatever
    // is in localStorage when the fetch fails.
    const adhocP = fetchAdhocPitches().catch(() => [] as Pitch[]);

    Promise.all([pitchP, voteP, configP, planP, adhocP]).then(([pitches, voteResponse, config, planFull, backendAdhoc]) => {
      if (cancelled) return;

      const { pitchData: voteData, unavailableNames, unavailableForDevNames, unavailableForPqa1Names, capacityByName } = voteResponse;
      const hasRealVotes = Object.keys(voteData).length > 0;

      // Merge unavailability lists from vote data into config (vote data is the
      // authoritative source — derived from what voters actually submitted).
      //   unavailableNames        — fully unavailable (excluded from every pool).
      //   unavailableForDevNames  — only available as PQA1 (excluded from dev pool).
      //   unavailableForPqa1Names — only available as dev  (excluded from PQA1 pool).
      //   capacityByName          — per-person capacity tier + comment (voter
      //                             answer overlaid with TL override) — drives
      //                             algorithm caps and Stage 2/4 sidebar badges.
      // Vote data is authoritative for unavailability — always overwrite, even
      // when empty. The old conditional preserved stale `unavailableNames`
      // baked into the Script Property `allocation_config`, which caused
      // people to appear in two lists at once (e.g. dev='none', pqa1='avg'
      // reclassified into unavailableForDevNames while still pinned in the
      // property's unavailableNames). For the optional `*ForDev/*ForPqa1`
      // lists, only overwrite when the response defines them (older backends
      // that omit those fields → keep whatever the config provided).
      const effectiveConfig: AllocationConfig = {
        ...(config ?? MOCK_CONFIG),
        unavailableNames,
        ...(unavailableForDevNames !== undefined ? { unavailableForDevNames } : {}),
        ...(unavailableForPqa1Names !== undefined ? { unavailableForPqa1Names } : {}),
        ...(capacityByName && Object.keys(capacityByName).length > 0 ? { capacityByName } : {}),
      };

      setAllocationConfig(effectiveConfig);

      // Sanitize against the freshly-fetched roster — anyone removed from
      // devNames/devTLNames/qmNames gets cleared from their assignment slot
      // rather than left as a stale dropdown value. Dev TLs are eligible to
      // be manually assigned as dev or PQA1, so devOrTLSet is the validation
      // set for those slots.
      const devTLSet = new Set(effectiveConfig.devTLNames);
      const qmSet = new Set(effectiveConfig.qmNames);
      const devOrTLSet = new Set([...effectiveConfig.devNames, ...effectiveConfig.devTLNames]);
      // Dev slots accept anyone on the team — a TL may legitimately assign a
      // Dev TL or QM as the lead dev on a non-standard project, and adhoc
      // pitches have always allowed this via AddPitchDialog. The strict
      // dev+TL-only validation that used to apply to non-adhoc pitches
      // silently nulled QM-as-dev assignments on reload, so we accept any
      // team-roster name for both kinds of pitch.
      const anyRoleSet = new Set([
        ...effectiveConfig.devNames,
        ...effectiveConfig.devTLNames,
        ...effectiveConfig.qmNames,
      ]);
      const validDevSetFor = (_id: string) => anyRoleSet;

      const planEntries = Object.entries(planFull);
      const hasBackendPlan = planEntries.length > 0;

      // Compute enriched pitches up front so the backend-load branch can use
      // them to fill in defaults for pitches missing from the PLAN sheet. The
      // hasRealVotes branch below will reuse this same array via state.
      const enrichedAll: AllocationPitch[] = hasRealVotes ? enrichPitches(pitches, voteData) : [];
      // Committed pitches are pre-allocated for next quarter, so they're
      // always 'selected' regardless of whatever the PLAN sheet / default
      // plan tries to assign. Includes both backend committed pitches and
      // locally-added committed adhocs.
      const committedPitchIds = new Set<string>([
        ...pitches.filter(p => p.committed).map(p => p.id),
        ...adhocPitches.filter(p => p.committed).map(p => p.id),
        ...backendAdhoc.filter(p => p.committed).map(p => p.id),
      ]);
      // Default plan grouping (selected/next-up/cut) from priority + bandwidth.
      // Used to backfill rows missing from the backend plan so every pitch is
      // visible in *some* sub-section in Stage 2, not silently dropped.
      const defaultsForMissing = (existingIds: ReadonlySet<string>): PlanAssignment[] => {
        if (enrichedAll.length === 0) return [];
        return generateDefaultPlan(enrichedAll, effectiveConfig)
          .filter(d => !existingIds.has(d.pitchId))
          .map(d => ({
            ...d,
            assignedDev: null,
            status: committedPitchIds.has(d.pitchId) ? 'selected' : d.status,
          }));
      };

      if (hasBackendPlan) {
        // Backend PLAN sheet is the source of truth for backend pitches.
        // Adhoc (locally-added) pitches don't exist in the backend, so their
        // planAssignment + step2Assignment entries from localStorage need to
        // be preserved — otherwise editing an adhoc project's dev assignment
        // appears to vanish on next reload.
        const adhocIdSet = new Set(adhocPitches.map(p => p.id));
        const localAdhocPlan = (savedStep1.current ?? []).filter(a => adhocIdSet.has(a.pitchId));
        const localAdhocStep2 = (savedStep2.current ?? []).filter(a => adhocIdSet.has(a.pitchId));

        const planFromBackend: PlanAssignment[] = planEntries
          .filter(([, row]) => row.status === 'selected' || row.status === 'next-up' || row.status === 'cut')
          .map(([pitchId, row]) => {
            const dev = row.assignedDev != null && validDevSetFor(pitchId).has(row.assignedDev) ? row.assignedDev : null;
            const rawStatus = (row.status === 'selected' && !dev && row.assignedDev != null)
              // Original dev was on the saved row but is now off the roster — keep
              // the pitch in the plan but bump status down so the missing dev is
              // surfaced rather than silently dropped.
              ? 'next-up'
              : row.status;
            // Committed pitches are always Planned by definition — never let
            // a stale or demoted PLAN row drop them out of the planned set.
            const status = committedPitchIds.has(pitchId) ? 'selected' : rawStatus;
            return {
              pitchId,
              status: status as PlanAssignment['status'],
              assignedDev: dev,
              stretch: row.stretch === true,
              categoryOverride: row.categoryOverride ? String(row.categoryOverride) : undefined,
            };
          });
        const planBackendIds = new Set(planFromBackend.map(p => p.pitchId));
        const mergedBackendPlan = [
          ...planFromBackend,
          ...localAdhocPlan.filter(a => !planBackendIds.has(a.pitchId)),
        ];
        // Fill in defaults for pitches the backend PLAN sheet doesn't have a
        // row for (e.g. a prior partial save dropped non-selected rows). Keeps
        // every pitch visible in some Stage 2 sub-section.
        const mergedPlanIds = new Set(mergedBackendPlan.map(p => p.pitchId));
        const mergedPlan = [...mergedBackendPlan, ...defaultsForMissing(mergedPlanIds)];
        savedStep1.current = mergedPlan;
        setPlanAssignments(mergedPlan);

        const step2FromBackend: StaffingAssignment[] = planEntries
          .filter(([, row]) => row.devTL || row.qm || row.pqa1)
          .map(([pitchId, row]) => ({
            pitchId,
            devTL: row.devTL && devTLSet.has(row.devTL) ? row.devTL : null,
            qm:    row.qm    && qmSet.has(row.qm)       ? row.qm    : null,
            pqa1:  row.pqa1  && devOrTLSet.has(row.pqa1) ? row.pqa1  : null,
          }));
        const step2BackendIds = new Set(step2FromBackend.map(s => s.pitchId));
        const mergedStep2 = [
          ...step2FromBackend,
          ...localAdhocStep2.filter(a => !step2BackendIds.has(a.pitchId)),
        ];
        savedStep2.current = mergedStep2;
        setStep2Assignments(mergedStep2);
      } else {
        // No backend plan yet (first run / new cycle) — fall back to the
        // localStorage drafts so a TL's in-progress work isn't lost on
        // reload before they hit Finish.
        if (savedStep1.current) {
          const sanitized1 = savedStep1.current.map(a => {
            if (a.assignedDev != null && !validDevSetFor(a.pitchId).has(a.assignedDev)) {
              return { ...a, assignedDev: null, status: (a.status === 'selected' ? 'next-up' : a.status) as typeof a.status };
            }
            return a;
          });
          const sanitizedIds = new Set(sanitized1.map(a => a.pitchId));
          const filled = [...sanitized1, ...defaultsForMissing(sanitizedIds)];
          savedStep1.current = filled;
          setPlanAssignments(filled);
        }

        if (savedStep2.current) {
          const sanitized2 = savedStep2.current.map(a => ({
            ...a,
            devTL: a.devTL != null && !devTLSet.has(a.devTL) ? null : a.devTL,
            qm:    a.qm    != null && !qmSet.has(a.qm)       ? null : a.qm,
            pqa1:  a.pqa1  != null && !devOrTLSet.has(a.pqa1) ? null : a.pqa1,
          }));
          savedStep2.current = sanitized2;
          setStep2Assignments(sanitized2);
        }
      }

      // Merge backend adhoc pitches into local state. Backend wins for shared
      // ids (it's the cross-machine source of truth); local-only entries are
      // preserved so a save still in flight doesn't get clobbered.
      if (backendAdhoc.length > 0) {
        const toAllocationPitch = (p: Pitch): AllocationPitch => ({
          ...p,
          continuation: false,
          author: null,
          teamVotes: {},
          tlVotes: {},
          teamPriorityScore: 0,
          tlPriorityScore: 0,
          devInterest: {},
        });
        const backendIds = new Set(backendAdhoc.map(p => p.id));
        setAdhocPitches(prev => [
          ...backendAdhoc.map(toAllocationPitch),
          ...prev.filter(p => !backendIds.has(p.id)),
        ]);
      }

      if (!hasRealVotes) {
        setUsingMockData(true);
        // Derive phase2Interests from mock pitch devInterest (same column G source)
        setPhase2Interests(derivePhase2Interests(MOCK_PITCHES, effectiveConfig));
      } else {
        const enriched = enrichPitches(pitches, voteData);
        // Apply TL category overrides from the PLAN sheet so a pitch a TL
        // remapped in Stage 4 lands in the new category on reload. Overrides
        // only exist for non-adhoc pitches (adhocs persist category on the
        // PITCHES sheet directly), and an empty/missing override falls back
        // to the source category.
        const categoryOverrideById: Record<string, string> = {};
        planEntries.forEach(([id, row]) => {
          if (row.categoryOverride) categoryOverrideById[id] = String(row.categoryOverride);
        });
        const enrichedWithOverrides = enriched.map(p =>
          categoryOverrideById[p.id] ? { ...p, category: categoryOverrideById[p.id] } : p
        );
        setAllocationPitches(enrichedWithOverrides);
        // Derive phase2Interests from vote data — interest is column G in the VOTES tab,
        // returned as devInterest per pitch by getAllocationData().
        setPhase2Interests(derivePhase2Interests(enriched, effectiveConfig));
        // Restore saved state, or derive default status grouping from priority/bandwidth.
        // Continuation projects with a willing (interest 1–2) available previousDev
        // are pre-filled and locked; all other dev assignments start blank.
        if (!savedStep1.current) {
          const defaultPlan = generateDefaultPlan(enriched, effectiveConfig);
          const pitchMap = new Map(enriched.map(p => [p.id, p]));
          const unavailableDevs = new Set([
            ...(effectiveConfig.unavailableNames ?? []),
            ...(effectiveConfig.unavailableForDevNames ?? []),
          ]);
          const fullyUnavail = new Set(effectiveConfig.unavailableNames ?? []);
          const availableDevs = new Set(effectiveConfig.devNames.filter(d => !unavailableDevs.has(d)));
          // Dev TLs aren't in the regular dev pool, but a TL who was the
          // previousDev on a continuation should still be pre-filled + locked
          // (matches allocationEngine's TL-continuation handling).
          const availableDevTLsForDev = new Set(effectiveConfig.devTLNames.filter(n => !fullyUnavail.has(n)));
          const continuationLocks: string[] = [];
          const initialPlan = defaultPlan.map(a => {
            if (a.status === 'selected') {
              const pitch = pitchMap.get(a.pitchId);
              if (pitch?.continuation && pitch.previousDev) {
                const prev = pitch.previousDev;
                const isAvailable = availableDevs.has(prev) || availableDevTLsForDev.has(prev);
                if (isAvailable) {
                  // Regular devs need willing interest (1 or 2) to auto-fill;
                  // a TL on their own continuation is auto-filled regardless,
                  // since they don't typically submit Stage 1 interest data.
                  const interest = pitch.devInterest[prev];
                  const willing = availableDevTLsForDev.has(prev)
                    ? interest !== 4 // skip if they actively flagged tier 4
                    : (interest === 1 || interest === 2);
                  if (willing) {
                    continuationLocks.push(a.pitchId);
                    return { ...a, assignedDev: prev };
                  }
                }
              }
            }
            return { ...a, assignedDev: null };
          });
          setPlanAssignments(initialPlan);
          if (continuationLocks.length > 0) {
            setStep1Locks(prev => ({
              ...prev,
              pitchIds: [...new Set([...prev.pitchIds, ...continuationLocks])],
            }));
          }
        }
        setUsingMockData(false);
      }

      if (!cancelled) setStep2DataLoaded(true);
    });

    return () => { cancelled = true; };
  }, [loadTrigger]);

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const currentAssignments = planAssignments;

  const mutateCurrentAssignments = (updater: (prev: PlanAssignment[]) => PlanAssignment[]) => {
    markDirty();
    setPlanAssignments(prev => updater(prev));
  };

  const handleDevChange = (pitchId: string, dev: string | null) => {
    mutateCurrentAssignments(prev =>
      prev.map(a => {
        if (a.pitchId !== pitchId) return a;
        const newStatus: AssignmentStatus =
          dev !== null && (a.status === 'next-up' || a.status === 'cut') ? 'selected' :
          a.status;
        return { ...a, assignedDev: dev, status: newStatus };
      })
    );
  };

  const handleStatusChange = (pitchId: string, newStatus: AssignmentStatus) => {
    mutateCurrentAssignments(prev =>
      prev.map(a => {
        if (a.pitchId !== pitchId) return a;
        const assignedDev = newStatus === 'selected' ? a.assignedDev : null;
        return { ...a, status: newStatus, assignedDev };
      })
    );
  };

  // ── Step 2 state ──────────────────────────────────────────────────────────
  // Pitches that need a team in Stage 4 (Step 2) are the union of:
  //   1. Pitches planned in Stage 2 (status='selected'). The dev may or may
  //      not be assigned yet — what matters is that the TL has decided this
  //      pitch is happening next quarter; the team-matching step is exactly
  //      where the missing dev (if any) gets filled in.
  //   2. Committed projects (pitch.committed). Pre-allocated work needs a
  //      team regardless of voting / Stage 2 status.
  //   3. Manually added (adhoc) projects. The TL chose to add them, so they
  //      always need staffing — even if no dev was specified at add time.
  const selectedPitchIds = useMemo(() => {
    const ids = new Set<string>();
    adhocPitches.forEach(p => ids.add(p.id));
    allPitches.forEach(p => { if (p.committed) ids.add(p.id); });
    for (const a of currentAssignments) {
      if (a.status === 'selected') ids.add(a.pitchId);
    }
    return ids;
  }, [currentAssignments, adhocPitches, allPitches]);
  const selectedPitches = useMemo(
    () => allPitches.filter(p => selectedPitchIds.has(p.id)),
    [allPitches, selectedPitchIds]
  );

  // Up Next pitches are shown in Stage 4 as a secondary section under each
  // category so a TL can promote one mid-staffing if a planned project falls
  // through. Excludes anything already in selectedPitchIds (committed/adhoc
  // pitches with status='next-up' shouldn't show up twice).
  const nextUpPitches = useMemo(() => {
    const nextUpIds = new Set(
      currentAssignments.filter(a => a.status === 'next-up' && !selectedPitchIds.has(a.pitchId)).map(a => a.pitchId)
    );
    return allPitches.filter(p => nextUpIds.has(p.id));
  }, [currentAssignments, allPitches, selectedPitchIds]);

  // Not Now (cut) pitches surface in Stage 4 as a default-collapsed sub-section
  // under each category so the TL can review what was deprioritized without
  // having to flip back to Stage 2. Excluded from selectedPitchIds for the
  // same reason as nextUpPitches.
  const cutPitches = useMemo(() => {
    const cutIds = new Set(
      currentAssignments.filter(a => a.status === 'cut' && !selectedPitchIds.has(a.pitchId)).map(a => a.pitchId)
    );
    return allPitches.filter(p => cutIds.has(p.id));
  }, [currentAssignments, allPitches, selectedPitchIds]);

  const [step2Assignments, setStep2Assignments] = useState<StaffingAssignment[]>(
    savedStep2.current ?? []
  );

  // Persist step1 / step2 state to localStorage whenever they change.
  useEffect(() => { lsWrite(LS_STEP1_KEY, planAssignments); }, [planAssignments]);
  useEffect(() => { if (step2Assignments.length > 0) lsWrite(LS_STEP2_KEY, step2Assignments); }, [step2Assignments]);
  useEffect(() => { lsWrite(LS_ADHOC_KEY, adhocPitches); }, [adhocPitches]);

  const selectedPitchesRef = useRef(selectedPitches);
  selectedPitchesRef.current = selectedPitches;

  const step2AssignmentsRef = useRef(step2Assignments);
  step2AssignmentsRef.current = step2Assignments;

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => {
    markDirty();
    setStep2Assignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, [field]: value } : a);
      return [...prev, { pitchId, devTL: null, qm: null, [field]: value }];
    });
  };

  // Stage 4's dev column writes back to Stage 2's plan since that's where
  // the per-pitch dev assignment lives. Mirrors Step1View's onDevChange path
  // but exposed to Step2View so TLs can edit the dev without flipping stages.
  const handleStep2DevAssign = (pitchId: string, value: string | null) => {
    markDirty();
    setPlanAssignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, assignedDev: value } : a);
      return [...prev, { pitchId, assignedDev: value, status: 'selected' }];
    });
  };

  const handleAddAdhocPitch = (draft: AdhocPitchDraft) => {
    const id = `adhoc-${Date.now()}`;
    const { title, category, committed, team, status, stretch, prjId } = draft;
    const trimmedPrjId = prjId.trim();
    const pitch: AllocationPitch = {
      id,
      title,
      category,
      continuation: false,
      committed,
      adhoc: true,
      // Only set prjId when the user actually entered one — leaving it
      // undefined is cleaner than persisting '' for downstream filters.
      ...(trimmedPrjId ? { prjId: trimmedPrjId } : {}),
      author: null,
      details: { problem: '' },
      teamVotes: {},
      tlVotes: {},
      teamPriorityScore: 0,
      tlPriorityScore: 0,
      devInterest: {},
    };
    setAdhocPitches(prev => [...prev, pitch]);
    setPlanAssignments(prev => [...prev, { pitchId: id, assignedDev: team.dev, status, stretch }]);
    // Always add to step2Assignments so pre-filled team data survives step2 init.
    setStep2Assignments(prev => [...prev, { pitchId: id, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 }]);
    if (committed) {
      setStep1Locks(prev => ({ ...prev, pitchIds: [...prev.pitchIds, id] }));
      setStep2Locks(prev => ({ ...prev, pitchIds: [...prev.pitchIds, id] }));
    }
    // Persist to backend so other TLs see this on next refresh. Local state +
    // localStorage cache stay authoritative on failure — the user keeps their
    // work, and the next save attempt (e.g. an edit) will re-upsert.
    saveAdhocPitchApi(pitch).catch((err: any) => {
      showSnackbar(`Project added locally — failed to save to sheet: ${err?.message ?? 'unknown error'}`, 'warning');
    });
  };

  const handleEditAdhocPitch = (id: string, draft: AdhocPitchDraft) => {
    markDirty();
    const { title, category, committed, team, status, stretch, prjId } = draft;
    const trimmedPrjId = prjId.trim();
    setAdhocPitches(prev => prev.map(p => p.id === id ? {
      ...p,
      title,
      category,
      committed,
      prjId: trimmedPrjId || undefined,
    } : p));
    // Upsert plan + step2 entries — if a prior reload wiped the local row
    // (e.g. backend plan overwrote it before we started preserving adhoc
    // entries), append a fresh entry rather than silently dropping the edit.
    setPlanAssignments(prev => {
      const idx = prev.findIndex(a => a.pitchId === id);
      if (idx === -1) return [...prev, { pitchId: id, assignedDev: team.dev, status, stretch }];
      return prev.map(a => a.pitchId === id ? { ...a, assignedDev: team.dev, status, stretch } : a);
    });
    setStep2Assignments(prev => {
      const idx = prev.findIndex(a => a.pitchId === id);
      if (idx === -1) return [...prev, { pitchId: id, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 }];
      return prev.map(a => a.pitchId === id ? { ...a, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 } : a);
    });
    // Lock state follows committed: add locks when becoming committed, remove
    // them when un-committing. Only touches the locks for this pitch.
    if (committed) {
      setStep1Locks(prev => prev.pitchIds.includes(id) ? prev : { ...prev, pitchIds: [...prev.pitchIds, id] });
      setStep2Locks(prev => prev.pitchIds.includes(id) ? prev : { ...prev, pitchIds: [...prev.pitchIds, id] });
    } else {
      setStep1Locks(prev => prev.pitchIds.includes(id) ? { ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) } : prev);
      setStep2Locks(prev => prev.pitchIds.includes(id) ? { ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) } : prev);
    }
    // Persist edit to backend (upsert).
    saveAdhocPitchApi({
      id,
      title,
      category,
      committed,
      adhoc: true,
      ...(trimmedPrjId ? { prjId: trimmedPrjId } : {}),
      details: { problem: '' },
    }).catch((err: any) => {
      showSnackbar(`Edit saved locally — failed to save to sheet: ${err?.message ?? 'unknown error'}`, 'warning');
    });
  };

  // Edit a voting-imported (non-adhoc) project. Title/category/committed are
  // read-only in the dialog for these, so only status + team round-trip back
  // here. Status updates planAssignments (and clears assignedDev on next-up /
  // cut, matching handleStatusChange's behavior); team updates step2.
  const handleEditNonAdhocPitch = (id: string, draft: AdhocPitchDraft) => {
    markDirty();
    const { team, status, stretch, category } = draft;
    // If the TL picked a different category, mutate the local pitch in
    // allocationPitches so all downstream views (Stage 2/4 lists + sidebar)
    // immediately render in the new category. The override flag below
    // captures the same value for persistence; loaders apply it on reload.
    setAllocationPitches(prev => prev.map(p => p.id === id ? { ...p, category } : p));
    setPlanAssignments(prev => {
      const idx = prev.findIndex(a => a.pitchId === id);
      const nextDev = status === 'selected' ? team.dev : null;
      // Only persist the category override when it actually differs from the
      // source pitch's category — empty means "fall back to source", which is
      // the right behavior for the common case where the TL didn't remap.
      const sourcePitch = allocationPitches.find(p => p.id === id);
      const categoryOverride = sourcePitch && sourcePitch.category !== category ? category : '';
      if (idx === -1) return [...prev, { pitchId: id, assignedDev: nextDev, status, stretch, categoryOverride }];
      return prev.map(a => a.pitchId === id ? { ...a, assignedDev: nextDev, status, stretch, categoryOverride } : a);
    });
    setStep2Assignments(prev => {
      const idx = prev.findIndex(a => a.pitchId === id);
      if (idx === -1) return [...prev, { pitchId: id, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 }];
      return prev.map(a => a.pitchId === id ? { ...a, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 } : a);
    });
  };

  // Hard-delete an adhoc pitch: drop it from local state (adhocPitches +
  // plan + step2 + both lock lists) and remove the backend PITCHES row.
  // Voting-imported pitches don't get this — the parent doesn't pass
  // onDelete for them, so the button never renders.
  const handleDeleteAdhocPitch = (id: string) => {
    markDirty();
    setAdhocPitches(prev => prev.filter(p => p.id !== id));
    setPlanAssignments(prev => prev.filter(a => a.pitchId !== id));
    setStep2Assignments(prev => prev.filter(a => a.pitchId !== id));
    setStep1Locks(prev => ({ ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) }));
    setStep2Locks(prev => ({ ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) }));
    deleteAdhocPitchApi(id).catch((err: any) => {
      showSnackbar(`Deleted locally — failed to remove from sheet: ${err?.message ?? 'unknown error'}`, 'warning');
    });
  };

  // Project edit dialog state, lifted from the views so a single dialog
  // instance can be reused for both Add (editingPitchId === null) and
  // Edit (editingPitchId === '<pitch id>' — adhoc or voting-imported).
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
  const adhocPitchIds = useMemo(() => new Set(adhocPitches.map(p => p.id)), [adhocPitches]);

  const dialogInitial: AdhocPitchDraft | undefined = useMemo(() => {
    if (!editingPitchId) return undefined;
    const pitch = allPitches.find(p => p.id === editingPitchId);
    if (!pitch) return undefined;
    const plan = planAssignments.find(a => a.pitchId === editingPitchId);
    const sa = step2Assignments.find(a => a.pitchId === editingPitchId);
    return {
      title: pitch.title,
      category: pitch.category,
      committed: !!pitch.committed,
      status: plan?.status ?? 'selected',
      stretch: !!plan?.stretch,
      prjId: pitch.prjId ?? '',
      team: {
        dev: plan?.assignedDev ?? null,
        devTL: sa?.devTL ?? null,
        qm: sa?.qm ?? null,
        pqa1: sa?.pqa1 ?? null,
      },
    };
  }, [editingPitchId, allPitches, planAssignments, step2Assignments]);

  const stretchPitchIds = useMemo(
    () => new Set(currentAssignments.filter(a => a.stretch).map(a => a.pitchId)),
    [currentAssignments],
  );

  const editingIsAdhoc = editingPitchId != null && adhocPitchIds.has(editingPitchId);
  const openAdhocAdd = () => { setEditingPitchId(null); setAddDialogOpen(true); };
  const openProjectEdit = (pitchId: string) => { setEditingPitchId(pitchId); setAddDialogOpen(true); };
  const closeAdhocDialog = () => { setAddDialogOpen(false); setEditingPitchId(null); };
  const handleDialogSubmit = (draft: AdhocPitchDraft) => {
    if (!editingPitchId) { handleAddAdhocPitch(draft); return; }
    if (editingIsAdhoc) handleEditAdhocPitch(editingPitchId, draft);
    else handleEditNonAdhocPitch(editingPitchId, draft);
  };

  const devByPitchId = useMemo<Record<string, string | null>>(
    () => Object.fromEntries(currentAssignments.map(a => [a.pitchId, a.assignedDev])),
    [currentAssignments]
  );

  const devByPitchIdRef = useRef(devByPitchId);
  devByPitchIdRef.current = devByPitchId;
  const step2InitRef = useRef(false);

  // Initialize step2 assignments when entering step 2 for the first time.
  // Continuation projects whose previousTL and previousQM are willing (phase2
  // interest absent/1/2) and available are pre-filled; lock the pitch when both
  // roles are covered. All other TL/QM/PQA1 slots start blank.
  useEffect(() => {
    if (activeStep !== 1 || !step2DataLoaded || step2InitRef.current) return;
    step2InitRef.current = true;
    // An empty array means no team assignments exist yet — don't treat it as "has saved data".
    if (savedStep2.current !== null && savedStep2.current.length > 0) {
      setStep2Ready(true);
      return;
    }

    const unavailableSet = new Set(allocationConfig.unavailableNames ?? []);
    const devTLSet = new Set(allocationConfig.devTLNames.filter(n => !unavailableSet.has(n)));
    const qmSet = new Set(allocationConfig.qmNames.filter(n => !unavailableSet.has(n)));
    const pqa1UnavailableSet = new Set([
      ...(allocationConfig.unavailableNames ?? []),
      ...(allocationConfig.unavailableForPqa1Names ?? []),
    ]);
    const pqa1Set = new Set(allocationConfig.devNames.filter(n => !pqa1UnavailableSet.has(n)));

    // Returns true if this person is willing to work on this pitch.
    // Absent = no data → willing. Null = actively skipped → not willing.
    const isWilling = (personName: string, pitchId: string): boolean => {
      const entry = phase2Interests.find(e => e.personName === personName);
      if (!entry) return true; // no interest votes submitted → treat as willing
      const level = entry.interestByPitchId[pitchId];
      return level === undefined || level === 1 || level === 2;
    };

    // Pitches already in step2Assignments (e.g. adhoc adds from step 1) keep their
    // pre-filled team data — only initialize pitches that don't have an entry yet.
    const existingIds = new Set(step2AssignmentsRef.current.map(a => a.pitchId));
    const continuationLocks: string[] = [];
    const toInit = selectedPitchesRef.current
      .filter(p => !existingIds.has(p.id))
      .map(p => {
        if (p.continuation) {
          const devTL = p.previousTL   && devTLSet.has(p.previousTL)   && isWilling(p.previousTL,   p.id) ? p.previousTL   : null;
          const qm   = p.previousQM   && qmSet.has(p.previousQM)      && isWilling(p.previousQM,   p.id) ? p.previousQM   : null;
          const pqa1 = p.previousPQA1 && pqa1Set.has(p.previousPQA1)  && isWilling(p.previousPQA1, p.id) ? p.previousPQA1 : null;
          if (devTL && qm && pqa1) continuationLocks.push(p.id);
          return { pitchId: p.id, devTL, qm, pqa1 };
        }
        return { pitchId: p.id, devTL: null, qm: null, pqa1: null };
      });

    setStep2Assignments(prev => [...prev, ...toInit]);
    if (continuationLocks.length > 0) {
      setStep2Locks(prev => ({
        ...prev,
        pitchIds: [...new Set([...prev.pitchIds, ...continuationLocks])],
      }));
    }
    setStep2Ready(true);
  }, [activeStep, step2DataLoaded, phase2Interests, allocationConfig]);

  /**
   * Save current state to the backend without navigating to the summary view.
   * Returns true if the save succeeded. Catches EditLockConflictError with a
   * snackbar pointing at the current holder, and returns false so the caller
   * (e.g. Finish handler) can short-circuit instead of forging ahead to the
   * results view.
   */
  const handleSavePlan = async (): Promise<boolean> => {
    const pitchTitleById = {
      ...Object.fromEntries((staticPitchesJson as Array<{ id: string; title: string }>).map(p => [p.id, p.title])),
      ...Object.fromEntries(adhocPitches.map(p => [p.id, p.title])),
    };
    // Adhoc pitches carry an optional tracker project ID. Static pitches don't
    // have one, so they fall through to ''. Included in every save payload so
    // the PLAN sheet's prjId column gets populated for adhoc rows.
    const pitchPrjIdById = Object.fromEntries(adhocPitches.map(p => [p.id, p.prjId ?? '']));
    try {
      if (activeStep === 0) {
        const payload = currentAssignments.map(a => ({
          pitchId: a.pitchId,
          pitchTitle: pitchTitleById[a.pitchId] ?? '',
          status: a.status,
          assignedDev: a.assignedDev,
          prjId: pitchPrjIdById[a.pitchId] ?? '',
          stretch: !!a.stretch,
          categoryOverride: a.categoryOverride ?? '',
        }));
        await savePlan(payload, voterName, getEditLockSessionId());
        showSnackbar('Plan saved — dev assignments recorded in the sheet', 'success');
      } else {
        // Iterate planAssignments rather than step2Assignments so status
        // changes on Stage 4 (e.g. demoting a planned pitch to Up Next)
        // always land in the payload — even for pitches that have no team
        // assignments yet. step2Assignments excludes those (the load filter
        // drops backend rows with empty TL/QM/PQA1), which used to make
        // partial saves silently ignore the status change.
        const step2ByPitch = Object.fromEntries(step2Assignments.map(a => [a.pitchId, a]));
        const payload = currentAssignments.map(plan => {
          const sa = step2ByPitch[plan.pitchId];
          return {
            pitchId: plan.pitchId,
            pitchTitle: pitchTitleById[plan.pitchId] ?? '',
            status: plan.status,
            assignedDev: plan.assignedDev,
            devTL: sa?.devTL ?? null,
            qm: sa?.qm ?? null,
            pqa1: sa?.pqa1 ?? null,
            prjId: pitchPrjIdById[plan.pitchId] ?? '',
            stretch: !!plan.stretch,
            categoryOverride: plan.categoryOverride ?? '',
          };
        });
        await saveFinalAssignments(payload, voterName, getEditLockSessionId());
        showSnackbar('Team assignments saved to the sheet', 'success');
      }
      return true;
    } catch (err: any) {
      if (err instanceof EditLockConflictError) {
        const holder = err.lock?.holder ?? 'someone else';
        showSnackbar(`Can't save — ${holder} holds the ${stageLabel} edit lock. Take the lock first or coordinate.`, 'error');
        return false;
      }
      showSnackbar(`Failed to save: ${err?.message ?? 'unknown error'}`, 'error');
      throw err;
    }
  };

  /** Save + transition to summary view. Bails out if the save failed. */
  const handleFinalize = async () => {
    const saved = await handleSavePlan();
    if (!saved) return;
    // Successful Finish — release the lock so the next TL can pick up
    // without having to force-take. Best-effort; failure is non-fatal.
    editLock.release().catch(() => { /* ignore */ });
    onShowResultsChange(true);
    onFinalize?.();
  };

  const handleRerunAlgorithm = (role: RerunRole = 'all') => {
    if (activeStep === 0) {
      // Stage 2 has only the dev role — role param is ignored.
      setPlanAssignments(generateDefaultPlan(allocationPitches, allocationConfig, {
        lockedPitchIds: new Set(step1Locks.pitchIds),
        lockedPersonNames: new Set(step1Locks.personNames),
        currentPlan: planAssignments,
      }));
      showSnackbar('Plan auto-assigned', 'info');
      return;
    }

    // Stage 4: per-role scope. autoAssignStep2 produces both devTL + qm; we
    // call it only when at least one of those is being re-run, then merge so
    // the other role keeps its existing value. PQA1 has its own pass. Dev is
    // the Stage 2 algorithm — re-running it from Stage 4 updates the per-pitch
    // dev assignment that drives Stage 4's read of devByPitchId.
    const lockedPitchSet = new Set(step2Locks.pitchIds);
    const lockedPersonSet = new Set(step2Locks.personNames);
    const runDev = role === 'all' || role === 'dev';
    const runDevTL = role === 'all' || role === 'devTL';
    const runQm = role === 'all' || role === 'qm';
    const runPqa1 = role === 'all' || role === 'pqa1';

    if (runDev) {
      setPlanAssignments(generateDefaultPlan(allocationPitches, allocationConfig, {
        lockedPitchIds: lockedPitchSet,
        lockedPersonNames: lockedPersonSet,
        currentPlan: planAssignments,
      }));
    }

    const base = (runDevTL || runQm)
      ? autoAssignStep2(selectedPitches, phase2Interests, allocationConfig, {
          lockedPitchIds: lockedPitchSet,
          lockedPersonNames: lockedPersonSet,
          currentAssignments: step2Assignments,
        })
      : step2Assignments;

    // PQA1 pool: exclude fully unavailable + dev-only-available.
    const pqa1ExcludeSet2 = new Set([
      ...(allocationConfig.unavailableNames ?? []),
      ...(allocationConfig.unavailableForPqa1Names ?? []),
    ]);
    const availDevNames2 = allocationConfig.devNames.filter(d => !pqa1ExcludeSet2.has(d));
    const currentPqa1ByPitch = Object.fromEntries(step2Assignments.map(a => [a.pitchId, a.pqa1 ?? null]));
    const pqa1Map = runPqa1
      ? autoAssignPqa1(selectedPitches, devByPitchId, availDevNames2, allocationConfig, {
          lockedPitchIds: lockedPitchSet,
          lockedPersonNames: lockedPersonSet,
          currentPqa1ByPitch,
        })
      : currentPqa1ByPitch;

    if (runDevTL || runQm || runPqa1) {
      const existingByPitch = new Map(step2Assignments.map(a => [a.pitchId, a]));
      setStep2Assignments(base.map(a => {
        const existing = existingByPitch.get(a.pitchId);
        return {
          pitchId: a.pitchId,
          devTL: runDevTL ? a.devTL : (existing?.devTL ?? a.devTL),
          qm: runQm ? a.qm : (existing?.qm ?? a.qm),
          pqa1: pqa1Map[a.pitchId] ?? null,
        };
      }));
    }

    const label = role === 'all' ? 'Team assignments'
      : role === 'dev' ? 'Devs'
      : role === 'devTL' ? 'Dev TLs'
      : role === 'qm' ? 'QMs'
      : 'PQA1s';
    showSnackbar(`${label} auto-assigned`, 'info');
  };

  // Persist a TL capacity override and reflect it locally so the sidebar
  // updates instantly. We also rebuild the unavailable* lists to match the new
  // tiers ('none' = excluded from that pool) — best-effort recompute, the next
  // backend fetch will overwrite this with the authoritative merged view.
  const handleCapacityOverride = async (payload: CapacityOverridePayload) => {
    try {
      await setCapacityOverride(payload);
    } catch (err: any) {
      showSnackbar(`Failed to save capacity: ${err?.message ?? 'unknown error'}`, 'error');
      throw err;
    }

    setAllocationConfig(prev => {
      const prevCap = prev.capacityByName ?? {};
      const merged = {
        ...prevCap,
        [payload.name]: {
          ...(prevCap[payload.name] ?? {}),
          ...(payload.devCapacity !== undefined ? { devCapacity: payload.devCapacity } : {}),
          ...(payload.pqa1Capacity !== undefined ? { pqa1Capacity: payload.pqa1Capacity } : {}),
          ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
          comment: payload.comment ?? '',
          source: 'tl-override' as const,
        },
      };

      // Recompute unavailability lists from the merged capacity map. Anyone
      // with `'none'` in a tier joins the corresponding excluded pool.
      const isDevName = (n: string) => prev.devNames.includes(n);
      const fullyUnavail = new Set<string>();
      const devOnly = new Set<string>();   // available as PQA1 only
      const pqa1Only = new Set<string>();  // available for dev only
      Object.entries(merged).forEach(([n, c]) => {
        if (isDevName(n)) {
          const dev = c.devCapacity ?? 'avg';
          const pqa1 = c.pqa1Capacity ?? 'avg';
          if (dev === 'none' && pqa1 === 'none') fullyUnavail.add(n);
          else if (dev === 'none') devOnly.add(n);
          else if (pqa1 === 'none') pqa1Only.add(n);
        } else if (c.capacity === 'none') {
          fullyUnavail.add(n);
        }
      });

      const dedupe = (arr: string[] = []) => Array.from(new Set(arr));
      return {
        ...prev,
        capacityByName: merged,
        unavailableNames: dedupe([...(prev.unavailableNames ?? []).filter(n => !merged[n]), ...fullyUnavail]),
        unavailableForDevNames: dedupe([...(prev.unavailableForDevNames ?? []).filter(n => !merged[n]), ...devOnly]),
        unavailableForPqa1Names: dedupe([...(prev.unavailableForPqa1Names ?? []).filter(n => !merged[n]), ...pqa1Only]),
      };
    });

    showSnackbar(`Capacity updated for ${payload.name}`, 'success');
  };

  // Per-stage single-editor lock. Stage 2 (dev assignment) and Stage 4 (team
  // staffing) each have an independent lock so Lauren and someone else can
  // work on them in parallel. Heartbeat + force-take semantics live in the
  // hook; the banner renders state.
  const lockStage: LockStage = activeStep === 0 ? '2' : '4';
  const stageLabel = activeStep === 0 ? 'Stage 2' : 'Stage 4';
  const editLock = useEditLock(lockStage, voterName);
  // View-only when we're not the editor. We still mount the underlying
  // editing UI but disable interaction via CSS — keeping the layout intact
  // so what the editor changes is visible as they save.
  // Read-only unless the caller actively holds the lock. 'idle' (nobody
  // holds it) doesn't grant edits anymore — the TL has to click Take lock
  // first so saves are properly attributed and concurrent edits don't sneak
  // through without acquiring the explicit single-editor lock.
  const isViewOnly = editLock.status !== 'editor';

  // Stage 4 finish gate: every selected pitch needs dev TL + QM + PQA1
  // resolved — either a named person OR an explicit "None" choice. (Empty /
  // null means "still undecided" and blocks Finish.) Stage 2 has no
  // all-fields-filled requirement — devs can stay unassigned until the next
  // round; Finish on Stage 2 just records the plan as-is.
  const isReadyToFinish = (): boolean => {
    if (activeStep === 0) return true;
    if (selectedPitches.length === 0) return false;
    const byPitch = new Map(step2Assignments.map(a => [a.pitchId, a]));
    const filled = (v: string | null | undefined) => v != null && v !== '';
    return selectedPitches.every(p => {
      const sa = byPitch.get(p.id);
      return !!(sa && filled(sa.devTL) && filled(sa.qm) && filled(sa.pqa1));
    });
  };

  // Push status up to App.tsx on every change so TopBar can render the
  // Save/Finish/Take-lock controls. The watched values are:
  //   editLock.status / holder / lastHeartbeat — drive the toolbar lock control
  //   selectedPitches + step2Assignments → canFinish (all team roles filled)
  //   saveStatus (declared near the top so mutation handlers can flip 'dirty')
  const hasLock = editLock.status === 'editor';
  const canFinish = isReadyToFinish();
  useEffect(() => {
    onStatusChange?.({
      hasLock,
      canFinish,
      saveStatus,
      lockStatus: editLock.status,
      lockHolder: editLock.lock.holder,
      lockLastHeartbeat: editLock.lock.lastHeartbeat,
      stageLabel,
    });
    // Intentionally don't depend on onStatusChange itself — parents pass a
    // fresh function each render and we'd loop. The values above are the
    // only meaningful triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLock, canFinish, saveStatus, editLock.status, editLock.lock.holder, editLock.lock.lastHeartbeat, stageLabel]);

  // Save handler that integrates saveStatus tracking — declared as a const
  // here so the imperative handle can expose it and TopBar can call it
  // through the ref. handleSavePlan is the core save (no status mgmt).
  const handleSaveWithStatus = async (): Promise<boolean> => {
    setSaveStatus('saving');
    const ok = await handleSavePlan();
    setSaveStatus(ok ? 'saved' : 'dirty');
    return ok;
  };

  // Trigger 'saved' → 'idle' fade.
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const handle = window.setTimeout(() => setSaveStatus('idle'), 2500);
    return () => window.clearTimeout(handle);
  }, [saveStatus]);

  useImperativeHandle(ref, () => ({
    triggerSave: handleSaveWithStatus,
    triggerFinalize: handleFinalize,
    triggerRerunAlgorithm: handleRerunAlgorithm,
    isReadyToFinish,
    hasLock: () => editLock.status === 'editor',
    triggerTakeLock: async (force?: boolean) => {
      const result = await editLock.take(force ?? false);
      return { acquired: result.acquired };
    },
    triggerReleaseLock: async () => {
      await editLock.release();
    },
  }));

  if (loading || hasLoadError) {
    const steps = [
      { label: 'Loading polling state', status: pollingResolved ? 'done' as const : 'loading' as const, error: undefined },
      { label: 'Loading pitches',       status: pitchStatus,  error: pitchError },
      { label: 'Loading vote data',     status: voteStatus,   error: voteError },
      { label: 'Loading team config',   status: configStatus, error: configError },
      ...(activeStep === 1 && step2DataLoaded && !step2Ready ? [{ label: 'Preparing assignments', status: 'loading' as const, error: undefined }] : []),
    ];
    return (
      <LoadingScreen
        embedded
        steps={steps}
        onRetry={hasLoadError ? () => setLoadTrigger(n => n + 1) : undefined}
      />
    );
  }

  if (showResults) {
    return activeStep === 0 ? (
      <Stage2ResultsView
        pitches={allPitches}
        currentAssignments={currentAssignments}
        config={allocationConfig}
      />
    ) : (
      <Stage4ResultsView
        pitches={allPitches}
        currentAssignments={currentAssignments}
        step2Assignments={step2Assignments}
        config={allocationConfig}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <EditLockBanner
        status={editLock.status}
        lock={editLock.lock}
        onRefresh={() => window.location.reload()}
      />
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          // View-only mode: keep scroll, collapse toggles, info popovers, and
          // the sidebar resize handle usable so the TL can read the current
          // plan; only the change-making controls (dropdowns, chips, drag,
          // checkboxes) are blocked. Visual opacity/grayscale hints at the
          // disabled state. The earlier blanket pointer-events:none also
          // killed scrolling, which made view-only unusable for verification.
          ...(isViewOnly && {
            opacity: 0.65,
            filter: 'grayscale(0.25)',
            '& .MuiSelect-select, & .MuiInputBase-input, & .MuiCheckbox-root, & .MuiChip-clickable, & [draggable="true"]': {
              pointerEvents: 'none',
              cursor: 'not-allowed',
            },
          }),
        }}
        aria-disabled={isViewOnly}
      >
        {activeStep === 0 ? (
          <Step1View
            pitches={allPitches}
            currentAssignments={currentAssignments}
            config={allocationConfig}
            onDevChange={handleDevChange}
            onStatusChange={handleStatusChange}
            lockedPitchIds={step1Locks.pitchIds}
            lockedPersonNames={step1Locks.personNames}
            onTogglePitchLock={toggleStep1PitchLock}
            onTogglePersonLock={toggleStep1PersonLock}
            voterName={voterName}
            onCapacityOverride={handleCapacityOverride}
            onAdhocAdd={isViewOnly ? undefined : openAdhocAdd}
            onAdhocEdit={isViewOnly ? undefined : openProjectEdit}
            adhocPitchIds={adhocPitchIds}
          />
        ) : (
          <Step2View
            selectedPitches={selectedPitches}
            nextUpPitches={nextUpPitches}
            cutPitches={cutPitches}
            assignments={step2Assignments}
            phase2Interests={phase2Interests}
            config={allocationConfig}
            onAssign={handleStep2Assign}
            onDevAssign={handleStep2DevAssign}
            onStatusChange={handleStatusChange}
            onFinalize={handleFinalize}
            devByPitchId={devByPitchId}
            devNames={allocationConfig.devNames}
            lockedPitchIds={step2Locks.pitchIds}
            lockedPersonNames={step2Locks.personNames}
            onTogglePitchLock={toggleStep2PitchLock}
            onTogglePersonLock={toggleStep2PersonLock}
            voterName={voterName}
            onCapacityOverride={handleCapacityOverride}
            onAdhocAdd={isViewOnly ? undefined : openAdhocAdd}
            onAdhocEdit={isViewOnly ? undefined : openProjectEdit}
            adhocPitchIds={adhocPitchIds}
            stretchPitchIds={stretchPitchIds}
          />
        )}
      </Box>

      <AddPitchDialog
        open={addDialogOpen}
        categories={Object.keys(allocationConfig.bandwidth)}
        devNames={allocationConfig.devNames}
        devTLNames={allocationConfig.devTLNames}
        qmNames={allocationConfig.qmNames}
        initial={dialogInitial}
        lockBasicFields={editingPitchId != null && !editingIsAdhoc}
        onSubmit={handleDialogSubmit}
        onClose={closeAdhocDialog}
        // Only adhoc pitches get a real delete — voting-imported rows would
        // lose their vote history. For those, status='cut' is the right tool.
        onDelete={editingPitchId != null && editingIsAdhoc
          ? () => { const id = editingPitchId; closeAdhocDialog(); handleDeleteAdhocPitch(id); }
          : undefined}
      />

      {usingMockData && (
        <Box sx={{ px: 2, py: 0.5, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <Typography variant="caption">
            Showing mock data — real vote data not available yet
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default TLAllocationView;
