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
}

const StepIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  if (status === 'done') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
  if (status === 'error') return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
  if (status === 'loading') return <CircularProgress size={18} />;
  return <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled' }} />;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ steps, onRetry }) => {
  const hasError = steps.some(s => s.status === 'error');
  const errorStep = steps.find(s => s.status === 'error');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" color="text.secondary">
        {hasError ? 'Failed to load' : 'Loading…'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 240 }}>
        {steps.map((step) => (
          <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <StepIcon status={step.status} />
            <Typography
              variant="body2"
              color={step.status === 'error' ? 'error' : step.status === 'done' ? 'text.secondary' : 'text.primary'}
              sx={{ flex: 1 }}
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
