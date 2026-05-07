import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from '@mui/material';
import { isDevRole } from '../../types/models';
import type { Capacity } from '../../types/models';

interface AvailabilityDialogProps {
  open: boolean;
  voterRole: string | null;
  /**
   * Human-readable label for the upcoming quarter, e.g. "Nov '26". Falls back
   * to "Next Quarter" when the backend hasn't published a label yet.
   */
  quarterLabel?: string;
  /**
   * Called with the user's answer. Booleans are derived back-compat fields
   * (`tier !== 'none'`); the third arg carries the new capacity tiers and
   * required comment for non-standard answers.
   */
  onAvailabilitySet: (
    available: boolean,
    availableForPQA1: boolean | null,
    extras: {
      devCapacity?: Capacity | null;
      pqa1Capacity?: Capacity | null;
      capacity?: Capacity | null;
      availabilityComment: string;
    },
  ) => void;
}

/**
 * Shared segmented capacity picker. Exported so SettingsMenu can reuse it
 * without a separate file.
 */
export const CapacitySelector: React.FC<{
  label: string;
  value: Capacity;
  onChange: (next: Capacity) => void;
  helperText?: string;
}> = ({ label, value, onChange, helperText }) => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
      {label}
    </Typography>
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, next) => { if (next !== null) onChange(next as Capacity); }}
      size="small"
      color="primary"
      aria-label={label}
    >
      <ToggleButton value="above-avg">Above avg</ToggleButton>
      <ToggleButton value="avg">Avg</ToggleButton>
      <ToggleButton value="fewer">Fewer</ToggleButton>
      <ToggleButton value="none">None</ToggleButton>
    </ToggleButtonGroup>
    {helperText && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {helperText}
      </Typography>
    )}
  </Box>
);

/**
 * Asks users about their capacity for next quarter using progressive
 * disclosure: a single "Standard work" switch covers the happy path.
 * Unchecking reveals per-pool capacity tiers (devs: dev + PQA1, others:
 * single project capacity) plus a required free-text comment.
 *
 * "Standard" maps to: devs → devCapacity='avg', pqa1Capacity='avg';
 *   non-devs → capacity='avg'. Booleans derive from `tier !== 'none'`.
 */
export const AvailabilityDialog = ({ open, voterRole, quarterLabel, onAvailabilitySet }: AvailabilityDialogProps) => {
  const labelText = quarterLabel?.trim() || 'Next Quarter';
  const isDev = isDevRole(voterRole);
  const [isStandard, setIsStandard] = React.useState(true);
  const [devCapacity, setDevCapacity] = React.useState<Capacity>('avg');
  const [pqa1Capacity, setPqa1Capacity] = React.useState<Capacity>('avg');
  const [capacity, setCapacity] = React.useState<Capacity>('avg');
  const [comment, setComment] = React.useState('');

  // When in custom mode we need a non-empty comment; standard mode is always submittable.
  const commentRequired = !isStandard;
  const submitDisabled = commentRequired && comment.trim().length === 0;

  const allCapacitiesNone = isDev
    ? devCapacity === 'none' && pqa1Capacity === 'none'
    : capacity === 'none';

  const handleSubmit = () => {
    if (isStandard) {
      // Happy path: everyone has 'avg' capacity, no comment.
      if (isDev) {
        onAvailabilitySet(true, true, {
          devCapacity: 'avg',
          pqa1Capacity: 'avg',
          availabilityComment: '',
        });
      } else {
        onAvailabilitySet(true, null, {
          capacity: 'avg',
          availabilityComment: '',
        });
      }
      return;
    }

    if (isDev) {
      onAvailabilitySet(devCapacity !== 'none', pqa1Capacity !== 'none', {
        devCapacity,
        pqa1Capacity,
        availabilityComment: comment.trim(),
      });
    } else {
      onAvailabilitySet(capacity !== 'none', null, {
        capacity,
        availabilityComment: comment.trim(),
      });
    }
  };

  return (
    <Dialog
      open={open}
      aria-labelledby="availability-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="availability-dialog-title">
        <Typography variant="h5" component="h2" gutterBottom>
          Availability for {labelText}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box my={2}>
          <FormControlLabel
            control={
              <Switch
                checked={isStandard}
                onChange={(e) => setIsStandard(e.target.checked)}
                color="primary"
              />
            }
            label={`Available for standard work in ${labelText}`}
          />
          {isStandard && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 6 }}>
              You'll be in the pool at typical capacity. Toggle off if anything's
              different (out for part of the quarter, more or less bandwidth, etc.).
            </Typography>
          )}

          {!isStandard && (
            <Box sx={{ mt: 2, pl: 1 }}>
              {isDev ? (
                <>
                  <CapacitySelector
                    label="Dev project capacity"
                    value={devCapacity}
                    onChange={setDevCapacity}
                    helperText="Used for Stage 2 dev assignment."
                  />
                  <CapacitySelector
                    label="PQA1 capacity"
                    value={pqa1Capacity}
                    onChange={setPqa1Capacity}
                    helperText="Used for Stage 4 PQA1 assignment."
                  />
                </>
              ) : (
                <CapacitySelector
                  label="Project capacity"
                  value={capacity}
                  onChange={setCapacity}
                />
              )}

              <TextField
                label={`What's going on in ${labelText}?`}
                placeholder="Your TL will see this"
                multiline
                rows={3}
                fullWidth
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                error={commentRequired && comment.trim().length === 0}
                sx={{ mt: 2 }}
              />
            </Box>
          )}

          {!isStandard && allCapacitiesNone && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You'll only rank priorities — no interest ranking needed since
              you won't be in the assignment pool.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={submitDisabled}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvailabilityDialog;
