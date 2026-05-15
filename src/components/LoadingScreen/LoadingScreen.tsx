import React from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export type StepStatus = 'pending' | 'loading' | 'done' | 'error';

export interface LoadingStep {
  label: string;
  status: StepStatus;
  error?: string;
}

interface LoadingScreenProps {
  steps: LoadingStep[];
  onRetry?: () => void;
  /**
   * Pixels of space to reserve at the top of the screen — set to the TopBar
   * height (48) when rendering before the TopBar mounts, so the centered
   * content stays put once the TopBar appears.
   */
  topReserve?: number;
  /**
   * Render at 100% of the parent's height (so it can fill a flex slot below
   * an already-mounted TopBar) rather than the default 100vh full-viewport
   * mode used for the pre-mount loading screen.
   */
  embedded?: boolean;
}

const StepIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === 'done') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
  if (status === 'error') return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
  if (status === 'loading') return <CircularProgress size={18} />;
  return <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled' }} />;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ steps, onRetry, topReserve = 0, embedded = false }) => {
  const hasError = steps.some(s => s.status === 'error');
  const errorStep = steps.find(s => s.status === 'error');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: embedded ? '100%' : '100vh', flexDirection: 'column', gap: 2, pt: `${topReserve}px`, boxSizing: 'border-box' }}>
      <Typography variant="h6" color="text.secondary">
        {hasError ? 'Failed to load' : 'Loading…'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {steps.map((step) => (
          <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <StepIcon status={step.status} />
            </Box>
            <Typography
              variant="body2"
              color={step.status === 'error' ? 'error' : step.status === 'done' ? 'text.secondary' : 'text.primary'}
            >
              {step.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {hasError && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          {errorStep?.error && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, maxWidth: 360 }}>
              {errorStep.error}
            </Typography>
          )}
          {onRetry && (
            <Button variant="outlined" onClick={onRetry} size="small">
              Retry
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
