import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import type { Pitch } from '../../types/models';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLAN,
} from '../../mocks/allocationMockData';
import { fetchAllocationConfig, fetchAllocationVoteData, setCapacityOverride } from '../../services/allocationApi';
import type { CapacityOverridePayload } from '../../services/allocationApi';
import { savePlan, saveFinalAssignments, fetchPlanFull } from '../../services/api';
import type { PlanRow } from '../../services/api';
import AddPitchDialog, { type AdhocPitchDraft } from './AddPitchDialog';
import { useSnackbar } from '../../hooks/useSnackbar';
import { generateDefaultPlan, autoAssignPqa1, capForPerson, hungarianMinCost } from '../../utils/allocationEngine';
import { fetchPitches } from '../../services/api';
import staticPitchesJson from '../../assets/pitches.json';
import Step1View from './Step1View';
import Step2View from './Step2View';
import Stage2ResultsView from './Stage2ResultsView';
import Stage4ResultsView from './Stage4ResultsView';

export interface TLAllocationViewHandle {
  triggerFinalize: () => Promise<void>;
  triggerRerunAlgorithm: () => void;
}

interface TLAllocationViewProps {
  activeStep: 0 | 1;
  showResults: boolean;
  onShowResultsChange: (v: boolean) => void;
  onFinalize?: () => void;
  onAllocationChange?: () => void;
  voterName: string;
  voterRole: string;
  pollingResolved?: boolean;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_STEP1_KEY = 'tl-alloc-step1-assignments';
const LS_STEP2_KEY = 'tl-alloc-step2-assignments';
const LS_UXD_KEY   = 'tl-alloc-uxd';
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

  // Build interest lookup maps keyed by person name so we can sort over the full
  // names list (not just submitters). People with no submission get tier 5 (lowest),
  // making load the sole tiebreaker → equal distribution when nobody submits.
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
  // Cost = interest tier (absent=2.5, null=5, tier 1-4 = value) minus authorship
  // bonus (–1 if pitch.author === name, floored at 0). BIG = infeasible.
  const BIG = 100;
  const tlQmScore = (
    interestMap: Record<string, Phase2Interest>,
    pitch: AllocationPitch,
    name: string,
  ): number => {
    const raw = interestMap[name]?.interestByPitchId[pitch.id];
    const base = raw === undefined ? 2.5 : raw === null ? 5 : (raw as number);
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

    // Largest-remainder proportional rounding: total slots = exactly N so the
    // matrix is square and every eligible person gets at least one assignment.
    const slots: string[] = [];
    if (totalRemaining <= N) {
      eligible.forEach(n => { for (let s = 0; s < remCap(n); s++) slots.push(n); });
    } else {
      const caps = eligible.map(remCap);
      const totalCap = caps.reduce((a, b) => a + b, 0);
      const floats = caps.map(c => (c / totalCap) * N);
      const targets = floats.map(f => Math.floor(f));
      let deficit = N - targets.reduce((a, b) => a + b, 0);
      const order = eligible.map((_, i) => i)
        .sort((i, j) => (floats[j] - targets[j]) - (floats[i] - targets[i]));
      for (const idx of order) {
        if (deficit <= 0) break;
        if (targets[idx] < caps[idx]) { targets[idx]++; deficit--; }
      }
      eligible.forEach((n, i) => { for (let s = 0; s < targets[i]; s++) slots.push(n); });
    }

    const totalCols = Math.max(slots.length, N);
    const paddedSlots: (string | null)[] = [
      ...slots,
      ...new Array(totalCols - slots.length).fill(null),
    ];

    const costMatrix: number[][] = pending.map(pitch =>
      paddedSlots.map(name => name === null ? BIG : tlQmScore(interestMap, pitch, name))
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
  voteData: Record<string, { teamVotes: Record<string, 0|1|2|3|4>; tlVotes: Record<string, 0|1|2|3|4>; teamPriorityScore: number; tlPriorityScore: number }>,
): AllocationPitch[] {
  return basePitches.map(p => {
    const v = voteData[p.id];
    return {
      ...p,
      teamVotes: v?.teamVotes ?? {},
      tlVotes: v?.tlVotes ?? {},
      teamPriorityScore: v?.teamPriorityScore ?? 0,
      tlPriorityScore: v?.tlPriorityScore ?? 0,
      devInterest: v?.devInterest ?? {},
    };
  });
}

const TLAllocationView = forwardRef<TLAllocationViewHandle, TLAllocationViewProps>(function TLAllocationView({ activeStep, showResults, onShowResultsChange, onFinalize, onAllocationChange, voterName, pollingResolved = true }, ref) {
  const { showSnackbar } = useSnackbar();

  // ── Data loading ──────────────────────────────────────────────────────────
  const [pitchStatus,  setPitchStatus]  = useState<'loading'|'done'|'error'>('loading');
  const [voteStatus,   setVoteStatus]   = useState<'loading'|'done'|'error'>('loading');
  const [configStatus, setConfigStatus] = useState<'loading'|'done'|'error'>('loading');
  const [pitchError,  setPitchError]  = useState<string | undefined>();
  const [voteError,   setVoteError]   = useState<string | undefined>();
  const [configError, setConfigError] = useState<string | undefined>();
  const [loadTrigger, setLoadTrigger] = useState(0);
  const [step2Ready, setStep2Ready] = useState(false);

  const dataLoading  = !pollingResolved || [pitchStatus, voteStatus, configStatus].some(s => s === 'loading');
  const loading      = dataLoading || (activeStep === 1 && !step2Ready);
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
  const savedUXD   = useRef(lsRead<Record<string, boolean>>(LS_UXD_KEY, {}));

  const [planAssignments, setPlanAssignments] = useState<PlanAssignment[]>(
    savedStep1.current ?? MOCK_PLAN
  );
  const [phase2Interests, setPhase2Interests] = useState<Phase2Interest[]>([]);

  // Lock state per stage. A locked pitch keeps its current row across re-runs;
  // a locked person can't be assigned new work. Persisted in localStorage so
  // locks survive page reloads.
  const [step1Locks, setStep1Locks] = useState<LockSet>(() => lsRead(LS_STEP1_LOCKS_KEY, EMPTY_LOCKS));
  const [step2Locks, setStep2Locks] = useState<LockSet>(() => lsRead(LS_STEP2_LOCKS_KEY, EMPTY_LOCKS));
  useEffect(() => { lsWrite(LS_STEP1_LOCKS_KEY, step1Locks); }, [step1Locks]);
  useEffect(() => { lsWrite(LS_STEP2_LOCKS_KEY, step2Locks); }, [step2Locks]);

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

    Promise.all([pitchP, voteP, configP, planP]).then(([pitches, voteResponse, config, planFull]) => {
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
      const effectiveConfig: AllocationConfig = {
        ...(config ?? MOCK_CONFIG),
        ...(unavailableNames.length > 0 ? { unavailableNames } : {}),
        ...(unavailableForDevNames && unavailableForDevNames.length > 0 ? { unavailableForDevNames } : {}),
        ...(unavailableForPqa1Names && unavailableForPqa1Names.length > 0 ? { unavailableForPqa1Names } : {}),
        ...(capacityByName && Object.keys(capacityByName).length > 0 ? { capacityByName } : {}),
      };

      setAllocationConfig(effectiveConfig);

      // Sanitize against the freshly-fetched roster — anyone removed from
      // devNames/devTLNames/qmNames gets cleared from their assignment slot
      // rather than left as a stale dropdown value. Dev TLs are eligible to
      // be manually assigned as dev or PQA1, so devOrTLSet is the validation
      // set for those slots.
      const devSet = new Set(effectiveConfig.devNames);
      const devTLSet = new Set(effectiveConfig.devTLNames);
      const qmSet = new Set(effectiveConfig.qmNames);
      const devOrTLSet = new Set([...effectiveConfig.devNames, ...effectiveConfig.devTLNames]);

      const planEntries = Object.entries(planFull);
      const hasBackendPlan = planEntries.length > 0;

      if (hasBackendPlan) {
        // Backend PLAN sheet is the source of truth. Build planAssignments
        // (Stage 2) and step2Assignments (Stage 4) from it directly,
        // ignoring any stale localStorage state on this machine.
        const planFromBackend: PlanAssignment[] = planEntries
          .filter(([, row]) => row.status === 'selected' || row.status === 'next-up' || row.status === 'cut')
          .map(([pitchId, row]) => {
            const dev = row.assignedDev != null && devOrTLSet.has(row.assignedDev) ? row.assignedDev : null;
            const status = (row.status === 'selected' && !dev && row.assignedDev != null)
              // Original dev was on the saved row but is now off the roster — keep
              // the pitch in the plan but bump status down so the missing dev is
              // surfaced rather than silently dropped.
              ? 'next-up'
              : row.status;
            return {
              pitchId,
              status: status as PlanAssignment['status'],
              assignedDev: dev,
            };
          });
        savedStep1.current = planFromBackend;
        setPlanAssignments(planFromBackend);

        const step2FromBackend: StaffingAssignment[] = planEntries
          .filter(([, row]) => row.devTL || row.qm || row.pqa1)
          .map(([pitchId, row]) => ({
            pitchId,
            devTL: row.devTL && devTLSet.has(row.devTL) ? row.devTL : null,
            qm:    row.qm    && qmSet.has(row.qm)       ? row.qm    : null,
            pqa1:  row.pqa1  && devOrTLSet.has(row.pqa1) ? row.pqa1  : null,
          }));
        savedStep2.current = step2FromBackend;
        setStep2Assignments(step2FromBackend);
      } else {
        // No backend plan yet (first run / new cycle) — fall back to the
        // localStorage drafts so a TL's in-progress work isn't lost on
        // reload before they hit Finish.
        if (savedStep1.current) {
          const sanitized1 = savedStep1.current.map(a => {
            if (a.assignedDev != null && !devOrTLSet.has(a.assignedDev)) {
              return { ...a, assignedDev: null, status: (a.status === 'selected' ? 'next-up' : a.status) as typeof a.status };
            }
            return a;
          });
          savedStep1.current = sanitized1;
          setPlanAssignments(sanitized1);
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

      if (!hasRealVotes) {
        setUsingMockData(true);
        // Derive phase2Interests from mock pitch devInterest (same column G source)
        setPhase2Interests(derivePhase2Interests(MOCK_PITCHES, effectiveConfig));
      } else {
        const enriched = enrichPitches(pitches, voteData);
        setAllocationPitches(enriched);
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

      if (!cancelled) setStep2Ready(true);
    });

    return () => { cancelled = true; };
  }, [loadTrigger]);

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const currentAssignments = planAssignments;

  const mutateCurrentAssignments = (updater: (prev: PlanAssignment[]) => PlanAssignment[]) => {
    onAllocationChange?.();
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

  const [step2Assignments, setStep2Assignments] = useState<StaffingAssignment[]>(
    savedStep2.current ?? []
  );
  const [includeUXD, setIncludeUXD] = useState<Record<string, boolean>>(savedUXD.current);

  // Persist step1, step2, and UXD state to localStorage whenever they change.
  useEffect(() => { lsWrite(LS_STEP1_KEY, planAssignments); }, [planAssignments]);
  useEffect(() => { if (step2Assignments.length > 0) lsWrite(LS_STEP2_KEY, step2Assignments); }, [step2Assignments]);
  useEffect(() => { lsWrite(LS_UXD_KEY, includeUXD); }, [includeUXD]);
  useEffect(() => { lsWrite(LS_ADHOC_KEY, adhocPitches); }, [adhocPitches]);

  const selectedPitchesRef = useRef(selectedPitches);
  selectedPitchesRef.current = selectedPitches;

  const step2AssignmentsRef = useRef(step2Assignments);
  step2AssignmentsRef.current = step2Assignments;

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => {
    onAllocationChange?.();
    setStep2Assignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, [field]: value } : a);
      return [...prev, { pitchId, devTL: null, qm: null, [field]: value }];
    });
  };

  const handleAddAdhocPitch = (draft: AdhocPitchDraft) => {
    const id = `adhoc-${Date.now()}`;
    const { title, category, committed, team } = draft;
    const pitch: AllocationPitch = {
      id,
      title,
      category,
      continuation: false,
      committed,
      author: null,
      details: { problem: '' },
      teamVotes: {},
      tlVotes: {},
      teamPriorityScore: 0,
      tlPriorityScore: 0,
      devInterest: {},
    };
    setAdhocPitches(prev => [...prev, pitch]);
    setPlanAssignments(prev => [...prev, { pitchId: id, assignedDev: team.dev, status: 'selected' }]);
    // Always add to step2Assignments so pre-filled team data survives step2 init.
    setStep2Assignments(prev => [...prev, { pitchId: id, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 }]);
    if (committed) {
      setStep1Locks(prev => ({ ...prev, pitchIds: [...prev.pitchIds, id] }));
      setStep2Locks(prev => ({ ...prev, pitchIds: [...prev.pitchIds, id] }));
    }
  };

  const handleEditAdhocPitch = (id: string, draft: AdhocPitchDraft) => {
    onAllocationChange?.();
    const { title, category, committed, team } = draft;
    setAdhocPitches(prev => prev.map(p => p.id === id ? { ...p, title, category, committed } : p));
    setPlanAssignments(prev => prev.map(a => a.pitchId === id ? { ...a, assignedDev: team.dev } : a));
    setStep2Assignments(prev => prev.map(a => a.pitchId === id ? { ...a, devTL: team.devTL, qm: team.qm, pqa1: team.pqa1 } : a));
    // Lock state follows committed: add locks when becoming committed, remove
    // them when un-committing. Only touches the locks for this pitch.
    if (committed) {
      setStep1Locks(prev => prev.pitchIds.includes(id) ? prev : { ...prev, pitchIds: [...prev.pitchIds, id] });
      setStep2Locks(prev => prev.pitchIds.includes(id) ? prev : { ...prev, pitchIds: [...prev.pitchIds, id] });
    } else {
      setStep1Locks(prev => prev.pitchIds.includes(id) ? { ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) } : prev);
      setStep2Locks(prev => prev.pitchIds.includes(id) ? { ...prev, pitchIds: prev.pitchIds.filter(x => x !== id) } : prev);
    }
  };

  // Adhoc-pitch dialog state, lifted from the views so a single dialog
  // instance can be reused for both Add (editingPitchId === null) and
  // Edit (editingPitchId === '<adhoc id>').
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPitchId, setEditingPitchId] = useState<string | null>(null);
  const adhocPitchIds = useMemo(() => new Set(adhocPitches.map(p => p.id)), [adhocPitches]);

  const dialogInitial: AdhocPitchDraft | undefined = useMemo(() => {
    if (!editingPitchId) return undefined;
    const pitch = adhocPitches.find(p => p.id === editingPitchId);
    if (!pitch) return undefined;
    const plan = planAssignments.find(a => a.pitchId === editingPitchId);
    const sa = step2Assignments.find(a => a.pitchId === editingPitchId);
    return {
      title: pitch.title,
      category: pitch.category,
      committed: !!pitch.committed,
      team: {
        dev: plan?.assignedDev ?? null,
        devTL: sa?.devTL ?? null,
        qm: sa?.qm ?? null,
        pqa1: sa?.pqa1 ?? null,
      },
    };
  }, [editingPitchId, adhocPitches, planAssignments, step2Assignments]);

  const openAdhocAdd = () => { setEditingPitchId(null); setAddDialogOpen(true); };
  const openAdhocEdit = (pitchId: string) => { setEditingPitchId(pitchId); setAddDialogOpen(true); };
  const closeAdhocDialog = () => { setAddDialogOpen(false); setEditingPitchId(null); };
  const handleDialogSubmit = (draft: AdhocPitchDraft) => {
    if (editingPitchId) handleEditAdhocPitch(editingPitchId, draft);
    else handleAddAdhocPitch(draft);
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
    if (activeStep !== 1 || dataLoading || step2InitRef.current) return;
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
  }, [activeStep, dataLoading, phase2Interests, allocationConfig]);

  const handleFinalize = async () => {
    const pitchTitleById = {
      ...Object.fromEntries((staticPitchesJson as Array<{ id: string; title: string }>).map(p => [p.id, p.title])),
      ...Object.fromEntries(adhocPitches.map(p => [p.id, p.title])),
    };
    if (activeStep === 0) {
      const payload = currentAssignments.map(a => ({
        pitchId: a.pitchId,
        pitchTitle: pitchTitleById[a.pitchId] ?? '',
        status: a.status,
        assignedDev: a.assignedDev,
      }));
      try {
        await savePlan(payload, voterName);
        showSnackbar('Plan saved — dev assignments recorded in the sheet', 'success');
      } catch (err: any) {
        showSnackbar(`Failed to save plan: ${err?.message ?? 'unknown error'}`, 'error');
        throw err;
      }
    } else {
      const devByPitch = Object.fromEntries(currentAssignments.map(a => [a.pitchId, a]));
      const payload = step2Assignments.map(sa => {
        const plan = devByPitch[sa.pitchId];
        return {
          pitchId: sa.pitchId,
          pitchTitle: pitchTitleById[sa.pitchId] ?? '',
          status: plan?.status ?? 'selected',
          assignedDev: plan?.assignedDev ?? null,
          devTL: sa.devTL,
          qm: sa.qm,
          pqa1: sa.pqa1 ?? null,
        };
      });
      try {
        await saveFinalAssignments(payload, voterName);
        showSnackbar('Team assignments saved to the sheet', 'success');
      } catch (err: any) {
        showSnackbar(`Failed to save assignments: ${err?.message ?? 'unknown error'}`, 'error');
        throw err;
      }
    }
    onShowResultsChange(true);
    onFinalize?.();
  };

  const handleRerunAlgorithm = () => {
    if (activeStep === 0) {
      setPlanAssignments(generateDefaultPlan(allocationPitches, allocationConfig, {
        lockedPitchIds: new Set(step1Locks.pitchIds),
        lockedPersonNames: new Set(step1Locks.personNames),
        currentPlan: planAssignments,
      }));
      showSnackbar('Plan auto-assigned', 'info');
    } else {
      const lockedPitchSet = new Set(step2Locks.pitchIds);
      const lockedPersonSet = new Set(step2Locks.personNames);
      const base = autoAssignStep2(selectedPitches, phase2Interests, allocationConfig, {
        lockedPitchIds: lockedPitchSet,
        lockedPersonNames: lockedPersonSet,
        currentAssignments: step2Assignments,
      });
      // PQA1 pool: exclude fully unavailable + dev-only-available.
      const pqa1ExcludeSet2 = new Set([
        ...(allocationConfig.unavailableNames ?? []),
        ...(allocationConfig.unavailableForPqa1Names ?? []),
      ]);
      const availDevNames2 = allocationConfig.devNames.filter(d => !pqa1ExcludeSet2.has(d));
      const currentPqa1ByPitch = Object.fromEntries(step2Assignments.map(a => [a.pitchId, a.pqa1 ?? null]));
      const pqa1Map = autoAssignPqa1(selectedPitches, devByPitchId, availDevNames2, allocationConfig, {
        lockedPitchIds: lockedPitchSet,
        lockedPersonNames: lockedPersonSet,
        currentPqa1ByPitch,
      });
      setStep2Assignments(base.map(a => ({ ...a, pqa1: pqa1Map[a.pitchId] ?? null })));
      showSnackbar('Team assignments auto-assigned', 'info');
    }
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

  useImperativeHandle(ref, () => ({ triggerFinalize: handleFinalize, triggerRerunAlgorithm: handleRerunAlgorithm }));

  if (loading || hasLoadError) {
    const steps = [
      { label: 'Loading polling state', status: pollingResolved ? 'done' as const : 'loading' as const, error: undefined },
      { label: 'Loading pitches',       status: pitchStatus,  error: pitchError },
      { label: 'Loading vote data',     status: voteStatus,   error: voteError },
      { label: 'Loading team config',   status: configStatus, error: configError },
      ...(activeStep === 1 && !step2Ready && !dataLoading ? [{ label: 'Preparing assignments', status: 'loading' as const, error: undefined }] : []),
    ];
    const firstError = steps.find(s => s.status === 'error');
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {hasLoadError ? 'Failed to load' : 'Loading…'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 240 }}>
          {steps.map(step => (
            <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {step.status === 'done'    && <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />}
              {step.status === 'error'   && <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />}
              {step.status === 'loading' && <CircularProgress size={18} />}
              <Typography variant="body2" color={step.status === 'error' ? 'error' : step.status === 'done' ? 'text.secondary' : 'text.primary'}>
                {step.label}
              </Typography>
            </Box>
          ))}
        </Box>
        {hasLoadError && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            {firstError?.error && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, maxWidth: 360 }}>
                {firstError.error}
              </Typography>
            )}
            <Button variant="outlined" size="small" onClick={() => setLoadTrigger(n => n + 1)}>
              Retry
            </Button>
          </Box>
        )}
      </Box>
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
        includeUXD={includeUXD}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
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
            onAdhocAdd={openAdhocAdd}
            onAdhocEdit={openAdhocEdit}
            adhocPitchIds={adhocPitchIds}
          />
        ) : (
          <Step2View
            selectedPitches={selectedPitches}
            assignments={step2Assignments}
            phase2Interests={phase2Interests}
            config={allocationConfig}
            onAssign={handleStep2Assign}
            onFinalize={handleFinalize}
            devByPitchId={devByPitchId}
            devNames={allocationConfig.devNames}
            includeUXD={includeUXD}
            onToggleUXD={(pitchId) => setIncludeUXD(prev => ({ ...prev, [pitchId]: !prev[pitchId] }))}
            lockedPitchIds={step2Locks.pitchIds}
            lockedPersonNames={step2Locks.personNames}
            onTogglePitchLock={toggleStep2PitchLock}
            onTogglePersonLock={toggleStep2PersonLock}
            voterName={voterName}
            onCapacityOverride={handleCapacityOverride}
            onAdhocAdd={openAdhocAdd}
            onAdhocEdit={openAdhocEdit}
            adhocPitchIds={adhocPitchIds}
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
        onSubmit={handleDialogSubmit}
        onClose={closeAdhocDialog}
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
