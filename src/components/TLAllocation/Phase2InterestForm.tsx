import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { AllocationPitch } from '../../types/allocationTypes';
import { submitPhase2InterestVote } from '../../services/allocationApi';

interface Phase2InterestFormProps {
  pitches: AllocationPitch[];
  voterName: string;
  voterRole: 'dev TL' | 'QM';
  onComplete: () => void;
}

type InterestSelection = 1 | 2 | 3 | 4 | 'skip' | null;

const TOGGLE_OPTIONS: { value: InterestSelection; label: string; color: string }[] = [
  { value: 1,      label: 'Very Interested',     color: '#4a148c' },
  { value: 2,      label: 'Interested',           color: '#7b1fa2' },
  { value: 3,      label: 'Somewhat Interested',  color: '#ab47bc' },
  { value: 4,      label: 'Not Interested',       color: '#ce93d8' },
  { value: 'skip', label: 'Skip',                 color: 'text.secondary' },
];

export default function Phase2InterestForm({
  pitches,
  voterName,
  voterRole,
  onComplete,
}: Phase2InterestFormProps) {
  // Map of pitchId → selection (null means no selection made yet)
  const [selections, setSelections] = useState<Record<string, InterestSelection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (pitchId: string, value: InterestSelection) => {
    setSelections(prev => ({ ...prev, [pitchId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // Build interests array: only include pitches where the user made a selection
    const interests = Object.entries(selections)
      .filter(([, sel]) => sel !== null)
      .map(([pitch_id, sel]) => ({
        pitch_id,
        level: sel === 'skip' ? null : (sel as 1 | 2 | 3 | 4),
      }));

    try {
      await submitPhase2InterestVote({ voterName, role: voterRole, interests });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 860, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          Rate your interest in the selected projects
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Help us assign the right people to each project. Your ratings inform the auto-assignment in the next step.
        </Typography>
      </Box>

      {pitches.map(pitch => {
        const sel = selections[pitch.id] ?? null;
        return (
          <Paper key={pitch.id} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body1" sx={{ flex: '1 1 200px', fontWeight: 500 }}>
              {pitch.title}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={sel}
              onChange={(_e, value) => {
                // ToggleButtonGroup returns null when you click the already-selected value
                // — treat that as deselection (back to no-selection)
                if (value !== null) {
                  handleChange(pitch.id, value as InterestSelection);
                } else {
                  setSelections(prev => {
                    const next = { ...prev };
                    delete next[pitch.id];
                    return next;
                  });
                }
              }}
              size="small"
            >
              {TOGGLE_OPTIONS.map(opt => (
                <ToggleButton
                  key={String(opt.value)}
                  value={opt.value}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      color: opt.value === 'skip' ? 'text.secondary' : '#fff',
                      backgroundColor: opt.value === 'skip' ? 'action.selected' : opt.color,
                      '&:hover': {
                        backgroundColor: opt.value === 'skip' ? 'action.hover' : opt.color,
                        opacity: 0.9,
                      },
                    },
                  }}
                >
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Paper>
        );
      })}

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onComplete}>
              Continue anyway
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Submitting…' : 'Submit ratings'}
        </Button>
      </Box>
    </Box>
  );
}
