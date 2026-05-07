import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, ToggleButton, ToggleButtonGroup, TextField,
} from '@mui/material';
import type { Capacity } from '../../types/models';
import type { PersonCapacity } from '../../types/allocationTypes';
import type { CapacityOverridePayload } from '../../services/allocationApi';
import { getShortName } from '../../data/teamRoster';

interface CapacityOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  /** Drives whether to show one capacity control (TL/QM) or two (dev). */
  personRole: 'dev' | 'qm-or-tl';
  /** Pre-fills the form with the person's current capacity record, if any. */
  current: PersonCapacity | undefined;
  /** Voter name of the TL recording the override. */
  setBy: string;
  onSubmit: (payload: CapacityOverridePayload) => Promise<void>;
}

const TIER_OPTIONS: { value: Capacity; label: string }[] = [
  { value: 'above-avg', label: 'Above avg' },
  { value: 'avg',       label: 'Avg' },
  { value: 'fewer',     label: 'Fewer' },
  { value: 'none',      label: 'None' },
];

/**
 * Dialog letting a TL override one person's capacity tier(s) and comment.
 * Devs get two ToggleButtonGroups (dev project + PQA1); QM/dev TL get one.
 * Comment is required when any tier is non-`'avg'`.
 */
export default function CapacityOverrideDialog({
  open, onClose, personName, personRole, current, setBy, onSubmit,
}: CapacityOverrideDialogProps) {
  const isDev = personRole === 'dev';

  const [devCapacity, setDevCapacity] = useState<Capacity>('avg');
  const [pqa1Capacity, setPqa1Capacity] = useState<Capacity>('avg');
  const [capacity, setCapacity] = useState<Capacity>('avg');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-prime the form when the dialog opens or target person changes so a
  // stale state from a previous person doesn't bleed through.
  useEffect(() => {
    if (!open) return;
    if (isDev) {
      setDevCapacity(current?.devCapacity ?? 'avg');
      setPqa1Capacity(current?.pqa1Capacity ?? 'avg');
    } else {
      setCapacity(current?.capacity ?? 'avg');
    }
    setComment(current?.comment ?? '');
    setSubmitting(false);
  }, [open, isDev, current]);

  const anyNonAvg = useMemo(() => {
    if (isDev) return devCapacity !== 'avg' || pqa1Capacity !== 'avg';
    return capacity !== 'avg';
  }, [isDev, devCapacity, pqa1Capacity, capacity]);

  const commentMissing = anyNonAvg && comment.trim().length === 0;
  const canSave = !submitting && !commentMissing;

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const payload: CapacityOverridePayload = isDev
        ? { name: personName, devCapacity, pqa1Capacity, comment: comment.trim() || undefined, setBy }
        : { name: personName, capacity, comment: comment.trim() || undefined, setBy };
      await onSubmit(payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set capacity for {getShortName(personName)}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {isDev ? (
            <>
              <CapacityRow
                label="Dev project capacity"
                value={devCapacity}
                onChange={setDevCapacity}
              />
              <CapacityRow
                label="PQA1 capacity"
                value={pqa1Capacity}
                onChange={setPqa1Capacity}
              />
            </>
          ) : (
            <CapacityRow
              label="Project capacity"
              value={capacity}
              onChange={setCapacity}
            />
          )}

          <TextField
            label="Why?"
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={anyNonAvg}
            error={commentMissing}
            helperText={commentMissing
              ? 'A reason is required when any tier is non-Avg.'
              : 'Optional context. Required if any tier is non-Avg.'}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!canSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CapacityRow({
  label, value, onChange,
}: { label: string; value: Capacity; onChange: (v: Capacity) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        size="small"
        onChange={(_, v) => { if (v != null) onChange(v as Capacity); }}
      >
        {TIER_OPTIONS.map(opt => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
