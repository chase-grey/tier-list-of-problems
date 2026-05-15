import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Box,
  FormControlLabel, Checkbox, Typography, Divider, Chip, Stack,
} from '@mui/material';
import { ASSIGNMENT_NONE } from '../../types/models';
import type { AssignmentStatus } from '../../types/allocationTypes';

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
  /** Plan status for the project. Omitted from the dialog when editing a
   *  committed pitch (committed pitches stay Planned by definition). */
  status: AssignmentStatus;
  /** Stretch goal — planned but only if there's spare capacity. Shown with a
   *  distinguishing icon in the sidebar and sorted below non-stretch projects.
   *  Suppressed in the dialog when committed (committed projects are firm). */
  stretch: boolean;
  /** Full-bandwidth flag: this one project consumes the assigned team
   *  member's entire role capacity for the quarter (e.g. a team transfer).
   *  Auto-assign respects this — the assigned person(s) won't be assigned
   *  to anything else in their roles, and the pitch is implicitly locked. */
  fullBandwidth: boolean;
  /** Optional PRJ tracker ID, blank string when not provided. Trimmed
   *  on save; round-tripped through the backend PITCHES sheet. */
  prjId: string;
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
  /** When true, title/committed render read-only (used when editing a
   *  voting-imported project — title is owned by the spreadsheet). Category
   *  stays editable so a TL can remap a pitch to a different category
   *  (persisted as a PLAN-row override). Status + team stay editable.
   *  Ignored on create. */
  lockBasicFields?: boolean;
  onSubmit: (draft: AdhocPitchDraft) => void;
  onClose: () => void;
  /** When provided, shows a "Delete project" button in edit mode. Invoked
   *  after a confirmation prompt. Parent is responsible for closing the
   *  dialog after the delete completes. Only wired up for adhoc pitches —
   *  deleting a voting-imported pitch would destroy vote history. */
  onDelete?: () => void;
}

export default function AddPitchDialog({ open, categories, defaultCategory, devNames, devTLNames, qmNames, initial, lockBasicFields, onSubmit, onClose, onDelete }: AddPitchDialogProps) {
  const isEdit = initial != null;
  const lockBasics = isEdit && !!lockBasicFields;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? categories[0] ?? '');
  const [committed, setCommitted] = useState(false);
  const [status, setStatus] = useState<AssignmentStatus>('selected');
  const [stretch, setStretch] = useState(false);
  const [fullBandwidth, setFullBandwidth] = useState(false);
  const [prjId, setPrjId] = useState('');
  const [teamDev, setTeamDev] = useState('');
  const [teamDevTL, setTeamDevTL] = useState('');
  const [teamQM, setTeamQM] = useState('');
  const [teamPqa1, setTeamPqa1] = useState('');

  // Re-sync internal state on the closed→open transition only. `categories`
  // is a fresh array each parent render (Object.keys(...)), so depending on it
  // would wipe in-progress edits whenever the parent re-renders while the
  // dialog is open (e.g. edit-lock heartbeats).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (initial) {
        setTitle(initial.title);
        setCategory(initial.category);
        setCommitted(initial.committed);
        setStatus(initial.status);
        setStretch(!!initial.stretch);
        setFullBandwidth(!!initial.fullBandwidth);
        setPrjId(initial.prjId ?? '');
        setTeamDev(initial.team.dev ?? '');
        setTeamDevTL(initial.team.devTL ?? '');
        setTeamQM(initial.team.qm ?? '');
        setTeamPqa1(initial.team.pqa1 ?? '');
      } else {
        setTitle('');
        setCategory(defaultCategory ?? categories[0] ?? '');
        setCommitted(false);
        setStatus('selected');
        setStretch(false);
        setFullBandwidth(false);
        setPrjId('');
        setTeamDev('');
        setTeamDevTL('');
        setTeamQM('');
        setTeamPqa1('');
      }
    }
    wasOpenRef.current = open;
  }, [open, initial, defaultCategory, categories]);

  const hasTeamFields = (devNames?.length ?? 0) > 0 || (devTLNames?.length ?? 0) > 0 || (qmNames?.length ?? 0) > 0;

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !category) return;
    onSubmit({
      title: trimmed,
      category,
      committed,
      // Committed pitches always stay Planned and aren't stretch goals —
      // they're pre-allocated, so either flag would contradict that.
      status: committed ? 'selected' : status,
      stretch: committed ? false : stretch,
      // Full-bandwidth only matters when someone is actually assigned —
      // hide the flag when no team member is set so it can't drift on
      // without effect.
      fullBandwidth: fullBandwidth && (!!teamDev || !!teamDevTL || !!teamQM || !!teamPqa1),
      prjId: prjId.trim(),
      team: {
        dev: teamDev || null,
        devTL: teamDevTL || null,
        qm: teamQM || null,
        pqa1: teamPqa1 || null,
      },
    });
    onClose();
  };

  const statusOptions: { value: AssignmentStatus; label: string }[] = [
    { value: 'selected', label: 'Planned' },
    { value: 'next-up', label: 'Up Next' },
    { value: 'cut',     label: 'Cut' },
  ];

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
            autoFocus={!lockBasics}
            fullWidth
            required
            InputProps={{ readOnly: lockBasics }}
            helperText={lockBasics ? 'Title comes from the voting sheet and isn’t editable here.' : undefined}
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
          <TextField
            label="PRJ ID (optional)"
            value={prjId}
            onChange={e => setPrjId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            fullWidth
            placeholder="e.g. 1234567"
            helperText="Tracker ID for the project, if one exists. Saved with the pitch and shown in the row."
          />
          {!lockBasics && (
            <Box>
              <FormControlLabel
                control={<Checkbox checked={committed} onChange={e => setCommitted(e.target.checked)} />}
                label="Committed project"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4, mt: -0.5 }}>
                Skip priority + interest voting and lock as already-allocated. Use for work that's pre-committed for next quarter.
              </Typography>
            </Box>
          )}

          {/* Status selector — shown when editing a non-committed pitch.
              Committed pitches stay Planned by definition; new (non-edit)
              adds start as Planned and don't need a chooser. */}
          {isEdit && !committed && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Status
              </Typography>
              <Stack direction="row" spacing={1}>
                {statusOptions.map(opt => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    size="small"
                    color={status === opt.value ? 'primary' : 'default'}
                    variant={status === opt.value ? 'filled' : 'outlined'}
                    onClick={() => setStatus(opt.value)}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Stretch goal — only meaningful for non-committed pitches.
              Hidden on a Cut pitch (cut == not happening, so 'stretch' is
              redundant); Up Next stretch is allowed since a TL might want
              to queue a stretch project. */}
          {!committed && status !== 'cut' && (
            <Box>
              <FormControlLabel
                control={<Checkbox checked={stretch} onChange={e => setStretch(e.target.checked)} />}
                label="Stretch goal"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4, mt: -0.5 }}>
                Only complete if there's spare capacity. Sorts beneath non-stretch projects in the sidebar.
              </Typography>
            </Box>
          )}

          {/* Full-bandwidth — adhoc-only flag for projects that consume an
              assigned person's whole role capacity (team transfer, full-
              quarter embed, etc). The auto-assign algorithm sees the
              assignee as fully booked and won't give them other work in
              that role. lockBasics === true means this is a voting-imported
              pitch — hide the flag there (no semantics for non-adhoc). */}
          {!lockBasics && status !== 'cut' && (
            <Box>
              <FormControlLabel
                control={<Checkbox checked={fullBandwidth} onChange={e => setFullBandwidth(e.target.checked)} />}
                label="Full bandwidth"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4, mt: -0.5 }}>
                This single project consumes the assigned team member's whole role capacity for the quarter (e.g. team transfer). Auto-assign won't give them other work in that role.
              </Typography>
            </Box>
          )}

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
        {/* Delete sits on the left, separated from Cancel/Save by a spacer,
            so its destructive action can't be hit by accident next to Save.
            Only rendered for adhoc pitches — the parent omits onDelete for
            voting-imported rows since deleting those would destroy vote
            history. */}
        {isEdit && onDelete && (
          <Button
            color="error"
            onClick={() => {
              const ok = window.confirm(`Delete "${title}"? This removes it from the plan and the spreadsheet — can't be undone.`);
              if (ok) onDelete();
            }}
          >
            Delete project
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim() || !category}>
          {isEdit ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
