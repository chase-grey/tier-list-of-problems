import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import type { Pitch } from '../../types/models';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLAN,
} from '../../mocks/allocationMockData';
import { fetchAllocationConfig, fetchAllocationVoteData } from '../../services/allocationApi';
import { savePlan, saveFinalAssignments } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';
import { generateDefaultPlan, autoAssignPqa1 } from '../../utils/allocationEngine';
import { fetchPitches } from '../../services/api';
import staticPitchesJson from '../../assets/pitches.json';
import Step1View from './Step1View';
import Step2View from './Step2View';
import Stage2ResultsView from './Stage2ResultsView';
import Stage4ResultsView from './Stage4ResultsView';

export interface TLAllocationViewHandle {
  triggerFinalize: () => Promise<void>;
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
): StaffingAssignment[] {
  // Sort: continuations first
  const sorted = [...pitches].sort((a, b) => {
    if (a.continuation && !b.continuation) return -1;
    if (!a.continuation && b.continuation) return 1;
    return 0;
  });

  const devTLLoad: Record<string, number> = {};
  const qmLoad: Record<string, number> = {};
  config.devTLNames.forEach(n => { devTLLoad[n] = 0; });
  config.qmNames.forEach(n => { qmLoad[n] = 0; });

  // Build interest lookup maps keyed by person name so we can sort over the full
  // names list (not just submitters). People with no submission get tier 5 (lowest),
  // making load the sole tiebreaker → equal distribution when nobody submits.
  const devTLInterestMap: Record<string, Phase2Interest> = {};
  const qmInterestMap: Record<string, Phase2Interest> = {};
  phase2Interests.forEach(pi => {
    if (pi.role === 'dev TL') devTLInterestMap[pi.personName] = pi;
    else if (pi.role === 'QM') qmInterestMap[pi.personName] = pi;
  });

  return sorted.map(pitch => {
    let devTL: string | null = null;
    let qm: string | null = null;

    // Continuation: try to keep previousTL
    if (pitch.continuation && pitch.previousTL && config.devTLNames.includes(pitch.previousTL)) {
      devTL = pitch.previousTL;
      devTLLoad[devTL]++;
    }

    // Continuation: try to keep previousQM
    if (pitch.continuation && pitch.previousQM && config.qmNames.includes(pitch.previousQM)) {
      qm = pitch.previousQM;
      qmLoad[qm]++;
    }

    // Fill unassigned devTL: sort full devTL list by interest then load.
    // Defaults to tier 5 for non-submitters so load drives equal distribution.
    if (!devTL) {
      devTL = [...config.devTLNames].sort((a, b) => {
        const tA = (devTLInterestMap[a]?.interestByPitchId[pitch.id] ?? 5) as number;
        const tB = (devTLInterestMap[b]?.interestByPitchId[pitch.id] ?? 5) as number;
        if (tA !== tB) return tA - tB;
        return (devTLLoad[a] ?? 0) - (devTLLoad[b] ?? 0);
      })[0] ?? null;
      if (devTL) devTLLoad[devTL] = (devTLLoad[devTL] ?? 0) + 1;
    }

    // Fill unassigned QM: same pattern as devTL above.
    if (!qm) {
      qm = [...config.qmNames].sort((a, b) => {
        const tA = (qmInterestMap[a]?.interestByPitchId[pitch.id] ?? 5) as number;
        const tB = (qmInterestMap[b]?.interestByPitchId[pitch.id] ?? 5) as number;
        if (tA !== tB) return tA - tB;
        return (qmLoad[a] ?? 0) - (qmLoad[b] ?? 0);
      })[0] ?? null;
      if (qm) qmLoad[qm] = (qmLoad[qm] ?? 0) + 1;
    }

    return { pitchId: pitch.id, devTL, qm };
  });
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

const TLAllocationView = forwardRef<TLAllocationViewHandle, TLAllocationViewProps>(function TLAllocationView({ activeStep, showResults, onShowResultsChange, onFinalize, onAllocationChange }, ref) {
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
      .catch(e => { if (!cancelled) { setVoteStatus('error'); setVoteError(e?.message ?? 'Failed to load vote data'); } return {} as Awaited<ReturnType<typeof fetchAllocationVoteData>>; });

    const configP = fetchAllocationConfig()
      .then(v => { if (!cancelled) setConfigStatus('done'); return v; })
      .catch(e => { if (!cancelled) { setConfigStatus('error'); setConfigError(e?.message ?? 'Failed to load config'); } return null; });

    Promise.all([pitchP, voteP, configP]).then(([pitches, voteData, config]) => {
      if (cancelled) return;

      const effectiveConfig = config ?? MOCK_CONFIG;
      const hasRealVotes = Object.keys(voteData).length > 0;

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
        // Only auto-generate the plan if the user has no saved state — otherwise
        // preserve their work so a page refresh doesn't wipe mid-session changes.
        if (!savedStep1.current) {
          setPlanAssignments(generateDefaultPlan(enriched, effectiveConfig));
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
          dev === null && a.status === 'selected' ? 'next-up' :
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

  // Auto-initialize step2 assignments when entering step 2, waiting for data to load first.
  // Skip auto-assignment if the user has saved step2 state from a previous session.
  useEffect(() => {
    if (activeStep !== 1 || loading || step2InitRef.current) return;
    step2InitRef.current = true;
    if (savedStep2.current) return; // Already restored from localStorage via useState init
    const base = autoAssignStep2(selectedPitchesRef.current, phase2Interests, allocationConfig);
    const pqa1Map = autoAssignPqa1(selectedPitchesRef.current, devByPitchIdRef.current, allocationConfig.devNames);
    setStep2Assignments(base.map(a => ({ ...a, pqa1: pqa1Map[a.pitchId] ?? null })));
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

  useImperativeHandle(ref, () => ({ triggerFinalize: handleFinalize }));

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
