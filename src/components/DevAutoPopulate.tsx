import React from 'react';
import { Box, Button, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { AutoFixHigh as AutoFillIcon } from '@mui/icons-material';
import { generateRandomVotes } from '../utils/testUtils';

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

  const handleToggleStage = () => {
    const currentStage = stageOverride || import.meta.env.VITE_POLLING_STAGE || '1';
    const newStage = currentStage === '2' ? '1' : '2';

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

  const getCurrentStageDisplay = (): string => {
    if (stageOverride) {
      return `Stage ${stageOverride} (override)`;
    }
    const envStage = import.meta.env.VITE_POLLING_STAGE || '1';
    return `Stage ${envStage} (env)`;
  };

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
        <DialogTitle>Auto-Populate Testing Data</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This development-only tool will set a test name and auto-populate votes.
            </Typography>

            <TextField
              label="Polling Cycle Override (Dev Only)"
              value={cycleOverride}
              onChange={(e) => setCycleOverride(e.target.value)}
              fullWidth
              margin="normal"
              placeholder={import.meta.env.VITE_POLLING_CYCLE_ID || "Aug26"}
              helperText="Leave blank to use VITE_POLLING_CYCLE_ID. Example: Aug26. Changing this will reload the page."
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
              <Button onClick={handleApplyCycleOverride} variant="outlined">
                Apply Cycle
              </Button>
              <Button onClick={handleIncrementQuarter} variant="outlined">
                Increment Quarter
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
              Current: <strong>{getCurrentStageDisplay()}</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button onClick={handleToggleStage} variant="outlined" color="secondary">
                Toggle Stage (1 ↔ 2)
              </Button>
              {stageOverride && (
                <Button onClick={handleClearStageOverride} variant="outlined" color="inherit">
                  Clear Override
                </Button>
              )}
            </Box>
            
            <TextField
              label="Test Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="populate-mode-label">Populate Mode</InputLabel>
              <Select
                labelId="populate-mode-label"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                label="Populate Mode"
              >
                <MenuItem value="tiers-only">Tiers Only</MenuItem>
                <MenuItem value="partial">Partial (~70% Complete)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handlePopulate} 
            variant="contained" 
            color="warning"
          >
            Auto-Populate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DevAutoPopulate;
