import React from 'react';
import { Box, Button, Divider, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, FormControl, InputLabel, Select, MenuItem, ToggleButton } from '@mui/material';
import { AutoFixHigh as AutoFillIcon } from '@mui/icons-material';
import { generateRandomVotes } from '../utils/testUtils';
import { fetchPitchesByProject } from '../services/pitchApiService';
import { getPitchPrjId } from '../utils/config';

const DEBUG_CYCLE_OVERRIDE_KEY = 'polling.debugCycleId';
const DEBUG_STAGE_OVERRIDE_KEY = 'polling.debugStage';

interface DevAutoPopulateProps {
  onPopulate: (name: string, votes: Record<string, any>, complete?: boolean) => void;
  pitchIds: string[];
}

/**
 * Development-only component to auto-populate the app with test data
 */
const DevAutoPopulate: React.FC<DevAutoPopulateProps> = ({ onPopulate, pitchIds }) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('Test User');
  const [mode, setMode] = React.useState('tiers-only');
  const [cycleOverride, setCycleOverride] = React.useState(() => {
    try {
      return localStorage.getItem(DEBUG_CYCLE_OVERRIDE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [stageOverride, setStageOverride] = React.useState(() => {
    try {
      return localStorage.getItem(DEBUG_STAGE_OVERRIDE_KEY) || '';
    } catch {
      return '';
    }
  });
  
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  const handlePopulate = () => {
    // Generate votes based on selected mode
    let votes = {};
    let complete = true;
    
    switch (mode) {
      case 'tiers-only':
        // All pitches with tiers
        votes = generateRandomVotes(pitchIds);
        complete = false;
        break;
      case 'partial':
        // About 70% complete (tiers)
        votes = generateRandomVotes(pitchIds);
        Object.values(votes).forEach((vote: any, index) => {
          // Remove some values randomly
          if (index % 5 === 0) delete vote.tier;
        });
        complete = false;
        break;
    }
    
    // Call the populate function
    onPopulate(name, votes, complete);
    handleClose();
  };

  const incrementQuarter = (cycleId: string): string | null => {
    // Format: Feb26, May26, Aug26, Nov26
    const normalized = cycleId.trim();
    const match = /^(Feb|May|Aug|Nov)([0-9]{2})$/.exec(normalized);
    if (!match) return null;

    const month = match[1];
    const year2 = Number(match[2]);
    if (!Number.isFinite(year2)) return null;

    const months = ['Feb', 'May', 'Aug', 'Nov'] as const;
    const index = months.indexOf(month as (typeof months)[number]);
    if (index === -1) return null;

    const nextIndex = (index + 1) % months.length;
    const nextMonth = months[nextIndex];

    const bumpYear = month === 'Nov' && nextMonth === 'Feb';
    const nextYear2 = bumpYear ? (year2 + 1) % 100 : year2;

    return `${nextMonth}${String(nextYear2).padStart(2, '0')}`;
  };

  const getBaseCycleId = (): string => {
    const override = cycleOverride.trim();
    if (override) return override;

    return import.meta.env.VITE_POLLING_CYCLE_ID || '';
  };

  const handleApplyCycleOverride = () => {
    const next = cycleOverride.trim();

    try {
      if (next) {
        localStorage.setItem(DEBUG_CYCLE_OVERRIDE_KEY, next);
      } else {
        localStorage.removeItem(DEBUG_CYCLE_OVERRIDE_KEY);
      }
    } catch {
      return;
    }

    window.location.reload();
  };

  const handleIncrementQuarter = () => {
    const base = getBaseCycleId();
    const next = incrementQuarter(base);
    if (!next) return;

    try {
      localStorage.setItem(DEBUG_CYCLE_OVERRIDE_KEY, next);
    } catch {
      return;
    }

    window.location.reload();
  };

  const STAGES = ['1', 'tl-1', '2', 'tl-2'] as const;
  const STAGE_LABELS: Record<string, string> = {
    '1':    'Stage 1\nPriority Voting',
    'tl-1': 'Stage 2\nDev Matching',
    '2':    'Stage 3\nInterest Voting',
    'tl-2': 'Stage 4\nTeam Matching',
  };

  const handleSetStage = (newStage: string) => {
    try {
      localStorage.setItem(DEBUG_STAGE_OVERRIDE_KEY, newStage);
      setStageOverride(newStage);
    } catch {
      return;
    }
    window.location.reload();
  };

  const handleClearStageOverride = () => {
    try {
      localStorage.removeItem(DEBUG_STAGE_OVERRIDE_KEY);
      setStageOverride('');
    } catch {
      return;
    }
    window.location.reload();
  };

  const [exportStatus, setExportStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [exportError, setExportError] = React.useState('');

  const handleExportPitches = async () => {
    const prjId = getPitchPrjId();
    if (!prjId) {
      setExportStatus('error');
      setExportError('VITE_PITCH_PRJ_ID is not set in .env');
      return;
    }
    setExportStatus('loading');
    setExportError('');
    try {
      const pitches = await fetchPitchesByProject(prjId);
      const json = JSON.stringify(pitches, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pitches.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
    } catch (err) {
      setExportStatus('error');
      setExportError(String(err));
    }
  };

  const envCycleId = (import.meta.env.VITE_POLLING_CYCLE_ID as string) || '';
  const envStage = (import.meta.env.VITE_POLLING_STAGE as string) || '1';
  const activeStage = stageOverride || envStage;

  return (
    <>
      <Tooltip title="Auto-Populate (Dev Only)">
        <Fab 
          color="warning" 
          size="medium" 
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 96, // Position to the left of the Fill Random button
            zIndex: 1000,
          }}
        >
          <AutoFillIcon />
        </Fab>
      </Tooltip>
      
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Dev Tools</DialogTitle>
        <DialogContent sx={{ pt: 0 }}>

          {/* ── Cycle ── */}
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Polling Cycle
          </Typography>
          <TextField
            label="Cycle ID Override"
            value={cycleOverride}
            onChange={(e) => setCycleOverride(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            placeholder={envCycleId || 'Aug26'}
            helperText={envCycleId
              ? `Env: ${envCycleId}${cycleOverride ? ' (overridden above)' : ''}`
              : 'Env: VITE_POLLING_CYCLE_ID not set'
            }
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 2 }}>
            <Button onClick={handleApplyCycleOverride} variant="outlined" size="small">Apply</Button>
            <Button onClick={handleIncrementQuarter} variant="outlined" size="small">Next Quarter</Button>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* ── Stage ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Stage
            </Typography>
            <Typography variant="caption" color={stageOverride ? 'warning.main' : 'text.disabled'}>
              {stageOverride ? 'override active' : 'using env'}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 0.75 }}>
            {STAGES.map(s => (
              <ToggleButton
                key={s}
                value={s}
                selected={activeStage === s}
                onChange={() => handleSetStage(s)}
                size="small"
                color="primary"
                sx={{ fontSize: '0.65rem', lineHeight: 1.3, px: 1, py: 0.75, whiteSpace: 'pre-line', textAlign: 'center' }}
              >
                {STAGE_LABELS[s]}
              </ToggleButton>
            ))}
          </Box>
          {stageOverride && stageOverride !== envStage && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
              Env: {STAGE_LABELS[envStage]?.replace('\n', ' · ') ?? envStage}
            </Typography>
          )}
          {stageOverride && (
            <Button onClick={handleClearStageOverride} variant="text" color="inherit" size="small" sx={{ mt: 0.25, mb: 0.25 }}>
              Clear override
            </Button>
          )}

          <Divider sx={{ mt: stageOverride ? 1 : 0.75, mb: 1.5 }} />

          {/* ── Pitches ── */}
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Pitches
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.75, mt: 0.25 }}>
            PRJ: {getPitchPrjId() || <em>VITE_PITCH_PRJ_ID not set</em>}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            disabled={exportStatus === 'loading'}
            onClick={handleExportPitches}
            sx={{ mb: 0.5 }}
          >
            {exportStatus === 'loading' ? 'Fetching…' : 'Export pitches.json'}
          </Button>
          {exportStatus === 'done' && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 0.5 }}>
              Downloaded — replace src/assets/pitches.json and redeploy
            </Typography>
          )}
          {exportStatus === 'error' && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.5 }}>
              {exportError}
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* ── Test Data ── */}
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Test Data
          </Typography>
          <TextField
            label="Test Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
          />
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel id="populate-mode-label">Populate Mode</InputLabel>
            <Select
              labelId="populate-mode-label"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              label="Populate Mode"
            >
              <MenuItem value="tiers-only">Tiers Only</MenuItem>
              <MenuItem value="partial">Partial (~70%)</MenuItem>
            </Select>
          </FormControl>

        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handlePopulate} variant="contained" color="warning">
            Auto-Populate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DevAutoPopulate;
