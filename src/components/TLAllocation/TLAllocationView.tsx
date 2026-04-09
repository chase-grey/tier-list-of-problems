import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Snackbar, Alert, CircularProgress, Typography } from '@mui/material';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment, AllocationPlan } from '../../types/allocationTypes';
import type { Pitch } from '../../types/models';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLANS, MOCK_PHASE2_INTERESTS,
} from '../../mocks/allocationMockData';
import { fetchAllocationConfig, fetchAllocationVoteData, sendKickoffEmail, createEmcRecords } from '../../services/allocationApi';
import type { EmcAssignment } from '../../services/allocationApi';
import { generatePlans } from '../../utils/allocationEngine';
import { fetchPitches } from '../../services/api';
import Step1View from './Step1View';
import Step2View from './Step2View';
import Phase2InterestForm from './Phase2InterestForm';

interface TLAllocationViewProps {
  activeStep: 0 | 1;
  onFinalize?: () => void;
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
  voteData: Record<string, { teamVotes: Record<string, 1|2|3|4>; tlVotes: Record<string, 1|2|3|4>; teamPriorityScore: number; tlPriorityScore: number }>,
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

export default function TLAllocationView({ activeStep, onFinalize, voterName, voterRole }: TLAllocationViewProps) {
  // ── Data loading ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const [allocationPitches, setAllocationPitches] = useState<AllocationPitch[]>(MOCK_PITCHES);
  const [allocationConfig, setAllocationConfig] = useState<AllocationConfig>(MOCK_CONFIG);
  const [allocationPlans, setAllocationPlans] = useState<AllocationPlan[]>(MOCK_PLANS);
  // Phase 2 interests: always fall back to mocks until a real submission workflow exists
  const phase2Interests: Phase2Interest[] = MOCK_PHASE2_INTERESTS;

  // Phase 2 gate: track whether the interest form has been submitted
  const [phase2Submitted, setPhase2Submitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [pitches, voteData, config] = await Promise.all([
          fetchPitches(),
          fetchAllocationVoteData(),
          fetchAllocationConfig(),
        ]);

        if (cancelled) return;

        const effectiveConfig = config ?? MOCK_CONFIG;
        const enriched = enrichPitches(pitches, voteData);
        const hasRealVotes = Object.keys(voteData).length > 0;

        if (!hasRealVotes) {
          // No real vote data yet — fall back to mocks so the UI is still populated
          setUsingMockData(true);
        } else {
          setAllocationPitches(enriched);
          setAllocationConfig(effectiveConfig);
          setAllocationPlans(generatePlans(enriched, effectiveConfig));
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
  const [activePlanId, setActivePlanId] = useState<'A' | 'B' | 'C'>('C');
  const [planOverrides, setPlanOverrides] = useState<Record<'A' | 'B' | 'C', PlanAssignment[] | null>>({
    A: null, B: null, C: null,
  });

  // Reset overrides when plans change (e.g., real data loaded after mount)
  const prevPlansRef = useRef(allocationPlans);
  useEffect(() => {
    if (prevPlansRef.current !== allocationPlans) {
      setPlanOverrides({ A: null, B: null, C: null });
      prevPlansRef.current = allocationPlans;
    }
  }, [allocationPlans]);

  const currentAssignments = useMemo<PlanAssignment[]>(() => {
    if (planOverrides[activePlanId]) return planOverrides[activePlanId]!;
    return allocationPlans.find(p => p.id === activePlanId)?.assignments ?? [];
  }, [activePlanId, planOverrides, allocationPlans]);

  const mutateCurrentAssignments = (updater: (prev: PlanAssignment[]) => PlanAssignment[]) => {
    setPlanOverrides(prev => ({
      ...prev,
      [activePlanId]: updater(
        prev[activePlanId] ?? allocationPlans.find(p => p.id === activePlanId)?.assignments ?? []
      ),
    }));
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

  const prevStepRef = useRef<0 | 1>(0);
  const selectedPitchesRef = useRef(selectedPitches);
  selectedPitchesRef.current = selectedPitches;
  useEffect(() => {
    prevStepRef.current = activeStep;
  }, [activeStep]);

  const handlePhase2Complete = () => {
    setPhase2Submitted(true);
    setStep2Assignments(autoAssignStep2(selectedPitchesRef.current, phase2Interests, allocationConfig));
  };

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm', value: string | null) => {
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

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; failed?: boolean }>({ open: false, message: '' });

  const handleFinalize = async () => {
    // Build assignment list
    const assignments: EmcAssignment[] = step2Assignments
      .map(sa => {
        const pitch = allocationPitches.find(p => p.id === sa.pitchId);
        if (!pitch) return null;
        return {
          pitchId: sa.pitchId,
          pitchTitle: pitch.title,
          assignedDev: devByPitchId[sa.pitchId] ?? null,
          devTL: sa.devTL,
          qm: sa.qm,
        };
      })
      .filter((a): a is EmcAssignment => a !== null);

    // Build email body
    const rows = assignments.map(a =>
      `<tr><td>${a.pitchTitle}</td><td>${a.assignedDev ?? '—'}</td><td>${a.devTL ?? '—'}</td><td>${a.qm ?? '—'}</td></tr>`
    ).join('');
    const htmlBody = `
      <h2>Quarterly Allocation — Selected Projects</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Project</th><th>Dev</th><th>Dev TL</th><th>QM</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    try {
      await Promise.all([
        sendKickoffEmail({
          subject: 'Quarterly Allocation Finalized',
          recipients: [allocationConfig.testingCaptain],
          htmlBody,
          senderName: 'TL Allocation Tool',
        }),
        createEmcRecords({ assignments }),
      ]);
      setSnackbar({ open: true, message: `Plan finalized! Email sent and ${assignments.length} EMC2 records queued.`, failed: false });
    } catch (err) {
      setSnackbar({ open: true, message: `Plan finalized, but some actions failed: ${err instanceof Error ? err.message : String(err)}`, failed: true });
    }
    onFinalize?.();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary">Loading allocation data…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeStep === 0 ? (
          <Step1View
            pitches={allocationPitches}
            plans={allocationPlans}
            activePlanId={activePlanId}
            currentAssignments={currentAssignments}
            config={allocationConfig}
            onPlanChange={setActivePlanId}
            onDevChange={handleDevChange}
            onStatusChange={handleStatusChange}
          />
        ) : (
          activeStep === 1 && !phase2Submitted && (voterRole === 'dev TL' || voterRole === 'QM') ? (
            <Phase2InterestForm
              pitches={selectedPitches}
              voterName={voterName}
              voterRole={voterRole as 'dev TL' | 'QM'}
              onComplete={handlePhase2Complete}
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
            />
          )
        )}
      </Box>

      {usingMockData && (
        <Box sx={{ px: 2, py: 0.5, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <Typography variant="caption">
            Showing mock data — real vote data not available yet
          </Typography>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.failed ? 'warning' : 'info'} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
