import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Box,
  FormControlLabel, Checkbox, Typography, Divider,
} from '@mui/material';

export interface AdhocTeamAssignment {
  dev: string | null;
  devTL: string | null;
  qm: string | null;
  pqa1: string | null;
}

interface AddPitchDialogProps {
  open: boolean;
  categories: string[];
  defaultCategory?: string;
  devNames?: string[];
  devTLNames?: string[];
  qmNames?: string[];
  onAdd: (title: string, category: string, committed: boolean, team: AdhocTeamAssignment) => void;
  onClose: () => void;
}

export default function AddPitchDialog({ open, categories, defaultCategory, devNames, devTLNames, qmNames, onAdd, onClose }: AddPitchDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? categories[0] ?? '');
  const [committed, setCommitted] = useState(false);
  const [teamDev, setTeamDev] = useState('');
  const [teamDevTL, setTeamDevTL] = useState('');
  const [teamQM, setTeamQM] = useState('');
  const [teamPqa1, setTeamPqa1] = useState('');

  const hasTeamFields = (devNames?.length ?? 0) > 0 || (devTLNames?.length ?? 0) > 0 || (qmNames?.length ?? 0) > 0;

  const reset = () => {
    setTitle('');
    setCategory(defaultCategory ?? categories[0] ?? '');
    setCommitted(false);
    setTeamDev('');
    setTeamDevTL('');
    setTeamQM('');
    setTeamPqa1('');
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !category) return;
    onAdd(trimmed, category, committed, {
      dev: teamDev || null,
      devTL: teamDevTL || null,
      qm: teamQM || null,
      pqa1: teamPqa1 || null,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const nameSelect = (label: string, value: string, onChange: (v: string) => void, names: string[]) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={e => onChange(e.target.value)}>
        <MenuItem value=""><em>Unassigned</em></MenuItem>
        {names.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add project</DialogTitle>
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
                {(devNames?.length ?? 0) > 0 && nameSelect('Dev', teamDev, setTeamDev, devNames!)}
                {(devTLNames?.length ?? 0) > 0 && nameSelect('Dev TL', teamDevTL, setTeamDevTL, devTLNames!)}
                {(qmNames?.length ?? 0) > 0 && nameSelect('QM', teamQM, setTeamQM, qmNames!)}
                {(devNames?.length ?? 0) > 0 && nameSelect('PQA1', teamPqa1, setTeamPqa1, devNames!)}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim() || !category}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
