import { useState, useMemo } from 'react';
import { Box, Typography, Stepper, Step, StepLabel, Paper, Snackbar, Alert } from '@mui/material';
import type { AssignmentStatus, PlanAssignment, StaffingAssignment } from '../../types/allocationTypes';
import {
  MOCK_CONFIG, MOCK_PITCHES, MOCK_PLANS, MOCK_PHASE2_INTERESTS,
} from '../../mocks/allocationMockData';
import Step1View from './Step1View';
import Step2View from './Step2View';

const STEPS = ['Step 1: Assign Devs', 'Step 2: Assign TLs + QMs'];

export default function TLAllocationView() {
  const [activeStep, setActiveStep] = useState(0);

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
        // Auto-promote to selected when dev assigned from next-up; auto-demote when unassigned from selected
        const newStatus: AssignmentStatus =
          dev !== null && a.status === 'next-up' ? 'selected' :
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

  // Sync step 2 assignments when selected pitches change (proceeding to step 2)
  const handleProceedToStep2 = () => {
    setStep2Assignments(
      selectedPitches.map(p => ({ pitchId: p.id, devTL: null, qm: null }))
    );
    setActiveStep(1);
  };

  const handleStep2Assign = (pitchId: string, field: 'devTL' | 'qm', value: string | null) => {
    setStep2Assignments(prev => {
      const exists = prev.find(a => a.pitchId === pitchId);
      if (exists) return prev.map(a => a.pitchId === pitchId ? { ...a, [field]: value } : a);
      return [...prev, { pitchId, devTL: null, qm: null, [field]: value }];
    });
  };

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const handleFinalize = () => {
    setSnackbar({ open: true, message: 'Plan finalized! (EMC2 record creation and email sending require backend integration.)' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Paper elevation={0} square sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h6" fontWeight={700}>TL Allocation</Typography>
          <Stepper activeStep={activeStep} sx={{ flex: 1, maxWidth: 500 }}>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Paper>

      {/* Body */}
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
            onProceed={handleProceedToStep2}
          />
        ) : (
          <Step2View
            selectedPitches={selectedPitches}
            assignments={step2Assignments}
            phase2Interests={MOCK_PHASE2_INTERESTS}
            config={MOCK_CONFIG}
            onAssign={handleStep2Assign}
            onFinalize={handleFinalize}
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
