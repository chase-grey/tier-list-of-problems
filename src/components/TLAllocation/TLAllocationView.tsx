import { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import type { AllocationPitch, AllocationConfig, AssignmentStatus, Phase2Interest, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLANS, MOCK_PHASE2_INTERESTS,
} from '../../mocks/allocationMockData';
import Step1View from './Step1View';
import Step2View from './Step2View';

interface TLAllocationViewProps {
  activeStep: 0 | 1;
  onFinalize?: () => void;
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

export default function TLAllocationView({ activeStep, onFinalize }: TLAllocationViewProps) {
  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [activePlanId, setActivePlanId] = useState<'A' | 'B' | 'C'>('C');
  // Start from the plan's generated assignments; edits diverge from here
  const [planOverrides, setPlanOverrides] = useState<Record<'A' | 'B' | 'C', PlanAssignment[] | null>>({
    A: null, B: null, C: null,
  });

  const currentAssignments = useMemo<PlanAssignment[]>(() => {
    if (planOverrides[activePlanId]) return planOverrides[activePlanId]!;
    return MOCK_PLANS.find(p => p.id === activePlanId)?.assignments ?? [];
  }, [activePlanId, planOverrides]);

  const mutateCurrentAssignments = (updater: (prev: PlanAssignment[]) => PlanAssignment[]) => {
    setPlanOverrides(prev => ({
      ...prev,
      [activePlanId]: updater(
        prev[activePlanId] ?? MOCK_PLANS.find(p => p.id === activePlanId)?.assignments ?? []
      ),
    }));
  };

  const handleDevChange = (pitchId: string, dev: string | null) => {
    mutateCurrentAssignments(prev =>
      prev.map(a => {
        if (a.pitchId !== pitchId) return a;
        // Auto-promote to selected when dev assigned from next-up or cut; auto-demote when unassigned from selected
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
        // Unassign dev when moving away from selected
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
    () => MOCK_PITCHES.filter(p => selectedPitchIds.has(p.id)),
    [selectedPitchIds]
  );

  const [step2Assignments, setStep2Assignments] = useState<StaffingAssignment[]>([]);

  // Auto-init step 2 assignments when activeStep transitions 0→1
  const prevStepRef = useRef<0 | 1>(0);
  const selectedPitchesRef = useRef(selectedPitches);
  selectedPitchesRef.current = selectedPitches;
  useEffect(() => {
    if (activeStep === 1 && prevStepRef.current === 0) {
      setStep2Assignments(
        autoAssignStep2(selectedPitchesRef.current, MOCK_PHASE2_INTERESTS, MOCK_CONFIG)
      );
    }
    prevStepRef.current = activeStep;
  }, [activeStep]);

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm', value: string | null) => {
    setStep2Assignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, [field]: value } : a);
      return [...prev, { pitchId, devTL: null, qm: null, [field]: value }];
    });
  };

  // Derive devByPitchId from step 1 assignments (for Step2View read-only dev column)
  const devByPitchId = useMemo<Record<string, string | null>>(
    () => Object.fromEntries(currentAssignments.map(a => [a.pitchId, a.assignedDev])),
    [currentAssignments]
  );

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const handleFinalize = () => {
    setSnackbar({ open: true, message: 'Plan finalized! (EMC2 record creation and email sending require backend integration.)' });
    onFinalize?.();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {activeStep === 0 ? (
          <Step1View
            pitches={MOCK_PITCHES}
            plans={MOCK_PLANS}
            activePlanId={activePlanId}
            currentAssignments={currentAssignments}
            config={MOCK_CONFIG}
            onPlanChange={setActivePlanId}
            onDevChange={handleDevChange}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <Step2View
            selectedPitches={selectedPitches}
            assignments={step2Assignments}
            phase2Interests={MOCK_PHASE2_INTERESTS}
            config={MOCK_CONFIG}
            onAssign={handleStep2Assign}
            onFinalize={handleFinalize}
            devByPitchId={devByPitchId}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert severity="info" onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
