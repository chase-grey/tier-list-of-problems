import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import type { Pitch } from '../../types/models';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLAN,
} from '../../mocks/allocationMockData';
import { fetchAllocationConfig, fetchAllocationVoteData, fetchPhase2Interests } from '../../services/allocationApi';
import { savePlan, saveFinalAssignments } from '../../services/api';
import { useSnackbar } from '../../hooks/useSnackbar';
import { generateDefaultPlan, autoAssignPqa1 } from '../../utils/allocationEngine';
import { fetchPitches } from '../../services/api';
import Step1View from './Step1View';
import Step2View from './Step2View';
import Stage2ResultsView from './Stage2ResultsView';
import Stage4ResultsView from './Stage4ResultsView';

export interface TLAllocationViewHandle {
  triggerFinalize: () => Promise<void>;
}

interface TLAllocationViewProps {
  activeStep: 0 | 1;
  onFinalize?: () => void;
  onAllocationChange?: () => void;
  voterName: string;
  voterRole: string;
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

  const devTLInterests = phase2Interests.filter(pi => pi.role === 'dev TL');
  const qmInterests = phase2Interests.filter(pi => pi.role === 'QM');

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

    // Fill unassigned devTL by interest + load
    if (!devTL) {
      const best = [...devTLInterests]
        .sort((a, b) => {
          const tA = (a.interestByPitchId[pitch.id] ?? 5) as number;
          const tB = (b.interestByPitchId[pitch.id] ?? 5) as number;
          if (tA !== tB) return tA - tB;
          return (devTLLoad[a.personName] ?? 0) - (devTLLoad[b.personName] ?? 0);
        })[0];
      if (best) {
        devTL = best.personName;
        devTLLoad[devTL] = (devTLLoad[devTL] ?? 0) + 1;
      }
    }

    // Fill unassigned QM by interest + load
    if (!qm) {
      const best = [...qmInterests]
        .sort((a, b) => {
          const tA = (a.interestByPitchId[pitch.id] ?? 5) as number;
          const tB = (b.interestByPitchId[pitch.id] ?? 5) as number;
          if (tA !== tB) return tA - tB;
          return (qmLoad[a.personName] ?? 0) - (qmLoad[b.personName] ?? 0);
        })[0];
      if (best) {
        qm = best.personName;
        qmLoad[qm] = (qmLoad[qm] ?? 0) + 1;
      }
    }

    return { pitchId: pitch.id, devTL, qm };
  });
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

const TLAllocationView = forwardRef<TLAllocationViewHandle, TLAllocationViewProps>(function TLAllocationView({ activeStep, onFinalize, onAllocationChange }, ref) {
  const { showSnackbar } = useSnackbar();

  // ── Data loading ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const [allocationPitches, setAllocationPitches] = useState<AllocationPitch[]>(MOCK_PITCHES);
  const [allocationConfig, setAllocationConfig] = useState<AllocationConfig>(MOCK_CONFIG);
  const [planAssignments, setPlanAssignments] = useState<PlanAssignment[]>(MOCK_PLAN);
  const [phase2Interests, setPhase2Interests] = useState<Phase2Interest[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [pitches, voteData, config, interests] = await Promise.all([
          fetchPitches(),
          fetchAllocationVoteData(),
          fetchAllocationConfig(),
          fetchPhase2Interests(),
        ]);

        if (cancelled) return;

        const effectiveConfig = config ?? MOCK_CONFIG;
        const enriched = enrichPitches(pitches, voteData);
        const hasRealVotes = Object.keys(voteData).length > 0;

        // Always apply the fetched config (needed for testingCaptain, tlEmails, etc.)
        setAllocationConfig(effectiveConfig);
        setPhase2Interests(interests);

        if (!hasRealVotes) {
          // No real vote data yet — fall back to mocks so the UI is still populated
          setUsingMockData(true);
        } else {
          setAllocationPitches(enriched);
          setPlanAssignments(generateDefaultPlan(enriched, effectiveConfig));
          setUsingMockData(false);
        }
      } catch {
        if (!cancelled) setUsingMockData(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

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

  const [step2Assignments, setStep2Assignments] = useState<StaffingAssignment[]>([]);

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

  // Auto-initialize step2 assignments when entering step 1, waiting for data to load first.
  useEffect(() => {
    if (activeStep !== 1 || loading || step2InitRef.current) return;
    step2InitRef.current = true;
    const base = autoAssignStep2(selectedPitchesRef.current, phase2Interests, allocationConfig);
    const pqa1Map = autoAssignPqa1(selectedPitchesRef.current, devByPitchIdRef.current, allocationConfig.devNames);
    setStep2Assignments(base.map(a => ({ ...a, pqa1: pqa1Map[a.pitchId] ?? null })));
  }, [activeStep, loading, phase2Interests, allocationConfig]);

  const handleFinalize = async () => {
    if (activeStep === 0) {
      const payload = currentAssignments.map(a => ({
        pitchId: a.pitchId,
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
    setShowResults(true);
    onFinalize?.();
  };

  useImperativeHandle(ref, () => ({ triggerFinalize: handleFinalize }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading allocation data…</Typography>
      </Box>
    );
  }

  if (showResults) {
    return activeStep === 0 ? (
      <Stage2ResultsView
        pitches={allocationPitches}
        currentAssignments={currentAssignments}
        config={allocationConfig}
        onBack={() => setShowResults(false)}
      />
    ) : (
      <Stage4ResultsView
        pitches={allocationPitches}
        currentAssignments={currentAssignments}
        step2Assignments={step2Assignments}
        config={allocationConfig}
        onBack={() => setShowResults(false)}
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
