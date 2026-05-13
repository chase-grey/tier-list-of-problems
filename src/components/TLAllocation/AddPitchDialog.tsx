import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Box,
  FormControlLabel, Checkbox, Typography, Divider,
} from '@mui/material';
import { ASSIGNMENT_NONE } from '../../types/models';

export interface AdhocTeamAssignment {
  dev: string | null;
  devTL: string | null;
  qm: string | null;
  pqa1: string | null;
}

export interface AdhocPitchDraft {
  title: string;
  category: string;
  committed: boolean;
  team: AdhocTeamAssignment;
}

interface AddPitchDialogProps {
  open: boolean;
  categories: string[];
  defaultCategory?: string;
  devNames?: string[];
  devTLNames?: string[];
  qmNames?: string[];
  /**
   * If provided, the dialog opens in edit mode: fields are pre-filled with
   * these values, the title becomes "Edit project", and the submit button
   * reads "Save". The submit handler is the same `onSubmit` either way —
   * the parent decides whether to create or update based on context.
   */
  initial?: AdhocPitchDraft;
  onSubmit: (draft: AdhocPitchDraft) => void;
  onClose: () => void;
}

export default function AddPitchDialog({ open, categories, defaultCategory, devNames, devTLNames, qmNames, initial, onSubmit, onClose }: AddPitchDialogProps) {
  const isEdit = initial != null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? categories[0] ?? '');
  const [committed, setCommitted] = useState(false);
  const [teamDev, setTeamDev] = useState('');
  const [teamDevTL, setTeamDevTL] = useState('');
  const [teamQM, setTeamQM] = useState('');
  const [teamPqa1, setTeamPqa1] = useState('');

  // Re-sync internal state every time the dialog is opened, so prefill values
  // (or a fresh blank form) take effect even when the same dialog instance
  // is reused for both add and edit.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setCategory(initial.category);
      setCommitted(initial.committed);
      setTeamDev(initial.team.dev ?? '');
      setTeamDevTL(initial.team.devTL ?? '');
      setTeamQM(initial.team.qm ?? '');
      setTeamPqa1(initial.team.pqa1 ?? '');
    } else {
      setTitle('');
      setCategory(defaultCategory ?? categories[0] ?? '');
      setCommitted(false);
      setTeamDev('');
      setTeamDevTL('');
      setTeamQM('');
      setTeamPqa1('');
    }
  }, [open, initial, defaultCategory, categories]);

  const hasTeamFields = (devNames?.length ?? 0) > 0 || (devTLNames?.length ?? 0) > 0 || (qmNames?.length ?? 0) > 0;

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !category) return;
    onSubmit({
      title: trimmed,
      category,
      committed,
      team: {
        dev: teamDev || null,
        devTL: teamDevTL || null,
        qm: teamQM || null,
        pqa1: teamPqa1 || null,
      },
    });
    onClose();
  };

  const nameSelect = (label: string, value: string, onChange: (v: string) => void, names: string[]) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={e => onChange(e.target.value)}>
        <MenuItem value=""><em>Unassigned</em></MenuItem>
        <MenuItem value={ASSIGNMENT_NONE}>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None — no one needed</Typography>
        </MenuItem>
        {names.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit project' : 'Add project'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            autoFocus
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box>
            <FormControlLabel
              control={<Checkbox checked={committed} onChange={e => setCommitted(e.target.checked)} />}
              label="Committed project"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4, mt: -0.5 }}>
              Skip priority + interest voting and lock as already-allocated. Use for work that's pre-committed for next quarter.
            </Typography>
          </Box>

          {hasTeamFields && (
            <>
              <Divider />
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                Team (optional)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Dev: any role can be assigned here. Devs first, then a
                    divider + dev TLs, then a divider + QMs. The latter two
                    are unusual choices, so they're visually separated and
                    placed below. */}
                {((devNames?.length ?? 0) > 0 || (devTLNames?.length ?? 0) > 0 || (qmNames?.length ?? 0) > 0) && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Dev</InputLabel>
                    <Select value={teamDev} label="Dev" onChange={e => setTeamDev(e.target.value)}>
                      <MenuItem value=""><em>Unassigned</em></MenuItem>
                      <MenuItem value={ASSIGNMENT_NONE}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>None — no dev needed</Typography>
                      </MenuItem>
                      {(devNames ?? []).map(n => <MenuItem key={`dev-${n}`} value={n}>{n}</MenuItem>)}
                      {(devNames?.length ?? 0) > 0 && (devTLNames?.length ?? 0) > 0 && <Divider component="li" />}
                      {(devTLNames ?? []).map(n => <MenuItem key={`tl-${n}`} value={n}>{n}</MenuItem>)}
                      {((devNames?.length ?? 0) > 0 || (devTLNames?.length ?? 0) > 0) && (qmNames?.length ?? 0) > 0 && <Divider component="li" />}
                      {(qmNames ?? []).map(n => <MenuItem key={`qm-${n}`} value={n}>{n}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                {(devTLNames?.length ?? 0) > 0 && nameSelect('Dev TL', teamDevTL, setTeamDevTL, devTLNames!)}
                {(qmNames?.length ?? 0) > 0 && nameSelect('QM', teamQM, setTeamQM, qmNames!)}
                {(devNames?.length ?? 0) > 0 && nameSelect('PQA1', teamPqa1, setTeamPqa1, devNames!)}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim() || !category}>
          {isEdit ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
