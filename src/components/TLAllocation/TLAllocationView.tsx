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
import { savePlan, saveFinalAssignments } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';
import { generateDefaultPlan, autoAssignPqa1, capForPerson } from '../../utils/allocationEngine';
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
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_STEP1_KEY = 'tl-alloc-step1-assignments';
const LS_STEP2_KEY = 'tl-alloc-step2-assignments';
const LS_UXD_KEY   = 'tl-alloc-uxd';
const LS_STEP1_LOCKS_KEY = 'tl-alloc-step1-locks';
const LS_STEP2_LOCKS_KEY = 'tl-alloc-step2-locks';

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
  const sorted = [...unlockedPitches].sort((a, b) => {
    if (a.continuation && !b.continuation) return -1;
    if (!a.continuation && b.continuation) return 1;
    return 0;
  });

  const newAssignments: StaffingAssignment[] = sorted.map(pitch => {
    let devTL: string | null = null;
    let qm: string | null = null;

    // Continuation: try to keep previousTL (unless locked elsewhere or at cap).
    if (
      pitch.continuation && pitch.previousTL &&
      devTLNames.includes(pitch.previousTL) &&
      !lockedPersons.has(pitch.previousTL) &&
      (devTLLoad[pitch.previousTL] ?? 0) < (devTLCapByName[pitch.previousTL] ?? 0)
    ) {
      devTL = pitch.previousTL;
      devTLLoad[devTL]++;
    }

    // Continuation: try to keep previousQM (unless locked elsewhere or at cap).
    if (
      pitch.continuation && pitch.previousQM &&
      qmNames.includes(pitch.previousQM) &&
      !lockedPersons.has(pitch.previousQM) &&
      (qmLoad[pitch.previousQM] ?? 0) < (qmCapByName[pitch.previousQM] ?? 0)
    ) {
      qm = pitch.previousQM;
      qmLoad[qm]++;
    }

    // Fill unassigned devTL: load is the primary sort, so the spread between any
    // two TLs stays within 1 across the whole quarter. Interest (Phase 2 votes)
    // and authorship break ties only when loads are equal. Skip candidates at
    // or above their per-person cap.
    if (!devTL) {
      devTL = devTLNames
        .filter(n => !lockedPersons.has(n))
        .filter(n => (devTLLoad[n] ?? 0) < (devTLCapByName[n] ?? 0))
        .sort((a, b) => {
          const loadDiff = (devTLLoad[a] ?? 0) - (devTLLoad[b] ?? 0);
          if (loadDiff !== 0) return loadDiff;
          const tA = (devTLInterestMap[a]?.interestByPitchId[pitch.id] ?? 5) as number;
          const tB = (devTLInterestMap[b]?.interestByPitchId[pitch.id] ?? 5) as number;
          if (tA !== tB) return tA - tB;
          const aAuthor = pitch.author === a ? -1 : 0;
          const bAuthor = pitch.author === b ? -1 : 0;
          return aAuthor - bAuthor;
        })[0] ?? null;
      if (devTL) devTLLoad[devTL] = (devTLLoad[devTL] ?? 0) + 1;
    }

    // Fill unassigned QM: same pattern as devTL above.
    if (!qm) {
      qm = qmNames
        .filter(n => !lockedPersons.has(n))
        .filter(n => (qmLoad[n] ?? 0) < (qmCapByName[n] ?? 0))
        .sort((a, b) => {
          const loadDiff = (qmLoad[a] ?? 0) - (qmLoad[b] ?? 0);
          if (loadDiff !== 0) return loadDiff;
          const tA = (qmInterestMap[a]?.interestByPitchId[pitch.id] ?? 5) as number;
          const tB = (qmInterestMap[b]?.interestByPitchId[pitch.id] ?? 5) as number;
          if (tA !== tB) return tA - tB;
          const aAuthor = pitch.author === a ? -1 : 0;
          const bAuthor = pitch.author === b ? -1 : 0;
          return aAuthor - bAuthor;
        })[0] ?? null;
      if (qm) qmLoad[qm] = (qmLoad[qm] ?? 0) + 1;
    }

    return { pitchId: pitch.id, devTL, qm };
  });

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

const TLAllocationView = forwardRef<TLAllocationViewHandle, TLAllocationViewProps>(function TLAllocationView({ activeStep, showResults, onShowResultsChange, onFinalize, onAllocationChange, voterName }, ref) {
  const { showSnackbar } = useSnackbar();

  // ── Data loading ──────────────────────────────────────────────────────────
  const [pitchStatus,  setPitchStatus]  = useState<'loading'|'done'|'error'>('loading');
  const [voteStatus,   setVoteStatus]   = useState<'loading'|'done'|'error'>('loading');
  const [configStatus, setConfigStatus] = useState<'loading'|'done'|'error'>('loading');
  const [pitchError,  setPitchError]  = useState<string | undefined>();
  const [voteError,   setVoteError]   = useState<string | undefined>();
  const [configError, setConfigError] = useState<string | undefined>();
  const [loadTrigger, setLoadTrigger] = useState(0);
  const loading      = [pitchStatus, voteStatus, configStatus].some(s => s === 'loading');
  const hasLoadError = [pitchStatus, voteStatus, configStatus].some(s => s === 'error');
  const [usingMockData, setUsingMockData] = useState(false);

  const [allocationPitches, setAllocationPitches] = useState<AllocationPitch[]>(MOCK_PITCHES);
  const [allocationConfig, setAllocationConfig] = useState<AllocationConfig>(MOCK_CONFIG);

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

    Promise.all([pitchP, voteP, configP]).then(([pitches, voteResponse, config]) => {
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

      // Sanitize saved localStorage assignments against the freshly-fetched config.
      // If a person was removed from the roster, clear their assignment rather than
      // leaving a stale name in a dropdown.
      const devSet = new Set(effectiveConfig.devNames);
      const devTLSet = new Set(effectiveConfig.devTLNames);
      const qmSet = new Set(effectiveConfig.qmNames);

      if (savedStep1.current) {
        const sanitized1 = savedStep1.current.map(a => {
          if (a.assignedDev != null && !devSet.has(a.assignedDev)) {
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
          pqa1:  a.pqa1  != null && !devSet.has(a.pqa1)    ? null : a.pqa1,
        }));
        savedStep2.current = sanitized2;
        setStep2Assignments(sanitized2);
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
        // Restore saved state, or start blank (all next-up, no dev assigned).
        // Auto-assign is only triggered explicitly via the "Auto-assign" button.
        if (!savedStep1.current) {
          setPlanAssignments(enriched.map(p => ({ pitchId: p.id, assignedDev: null, status: 'next-up' as const })));
        }
        setUsingMockData(false);
      }
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
  const selectedPitchIds = useMemo(
    () => new Set(currentAssignments.filter(a => a.status === 'selected').map(a => a.pitchId)),
    [currentAssignments]
  );
  const selectedPitches = useMemo(
    () => allocationPitches.filter(p => selectedPitchIds.has(p.id)),
    [allocationPitches, selectedPitchIds]
  );

  const [step2Assignments, setStep2Assignments] = useState<StaffingAssignment[]>(
    savedStep2.current ?? []
  );
  const [includeUXD, setIncludeUXD] = useState<Record<string, boolean>>(savedUXD.current);

  // Persist step1, step2, and UXD state to localStorage whenever they change.
  useEffect(() => { lsWrite(LS_STEP1_KEY, planAssignments); }, [planAssignments]);
  useEffect(() => { if (step2Assignments.length > 0) lsWrite(LS_STEP2_KEY, step2Assignments); }, [step2Assignments]);
  useEffect(() => { lsWrite(LS_UXD_KEY, includeUXD); }, [includeUXD]);

  const selectedPitchesRef = useRef(selectedPitches);
  selectedPitchesRef.current = selectedPitches;

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm' | 'pqa1', value: string | null) => {
    onAllocationChange?.();
    setStep2Assignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, [field]: value } : a);
      return [...prev, { pitchId, devTL: null, qm: null, [field]: value }];
    });
  };

  const devByPitchId = useMemo<Record<string, string | null>>(
    () => Object.fromEntries(currentAssignments.map(a => [a.pitchId, a.assignedDev])),
    [currentAssignments]
  );

  const devByPitchIdRef = useRef(devByPitchId);
  devByPitchIdRef.current = devByPitchId;
  const step2InitRef = useRef(false);

  // Initialize step2 assignments when entering step 2 for the first time.
  // Starts blank — auto-assign is triggered explicitly via the "Auto-assign" button.
  useEffect(() => {
    if (activeStep !== 1 || loading || step2InitRef.current) return;
    step2InitRef.current = true;
    if (savedStep2.current) return; // Already restored from localStorage via useState init
    setStep2Assignments(selectedPitchesRef.current.map(p => ({ pitchId: p.id, devTL: null, qm: null, pqa1: null })));
  }, [activeStep, loading, phase2Interests, allocationConfig]);

  const handleFinalize = async () => {
    const pitchTitleById = Object.fromEntries(
      (staticPitchesJson as Array<{ id: string; title: string }>).map(p => [p.id, p.title])
    );
    if (activeStep === 0) {
      const payload = currentAssignments.map(a => ({
        pitchId: a.pitchId,
        pitchTitle: pitchTitleById[a.pitchId] ?? '',
        status: a.status,
        assignedDev: a.assignedDev,
      }));
      try {
        await savePlan(payload);
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
        await saveFinalAssignments(payload);
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
      { label: 'Loading pitches',    status: pitchStatus,  error: pitchError },
      { label: 'Loading vote data',  status: voteStatus,   error: voteError },
      { label: 'Loading team config', status: configStatus, error: configError },
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
        pitches={allocationPitches}
        currentAssignments={currentAssignments}
        config={allocationConfig}
      />
    ) : (
      <Stage4ResultsView
        pitches={allocationPitches}
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
            pitches={allocationPitches}
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
          />
        )}
      </Box>

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
