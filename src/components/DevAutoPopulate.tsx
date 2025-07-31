import React from 'react';
import { Box, Button, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Divider, Chip } from '@mui/material';
import { AutoFixHigh as AutoFillIcon } from '@mui/icons-material';
import { generateRandomVotes } from '../utils/testUtils';
import type { AppStage } from './Timeline/Timeline';
import { APP_CONFIG, updateAppStage } from './App';

interface DevAutoPopulateProps {
  onPopulate: (name: string, votes: Record<string, any>, complete?: boolean) => void;
  pitchIds: string[];
  // Optional prop to allow setting the current stage
  onStageChange?: (stage: AppStage) => void;
  // Current stage for display purposes
  currentStage?: AppStage;
  // Function to determine if a stage can be accessed
  canAccessStage?: (stage: AppStage) => boolean;
}

/**
 * Development-only component to auto-populate the app with test data
 */
const DevAutoPopulate: React.FC<DevAutoPopulateProps> = ({ onPopulate, pitchIds, onStageChange, currentStage = 'priority', canAccessStage }) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('Test User');
  const [mode, setMode] = React.useState('complete');
  const [stage, setStage] = React.useState<AppStage>(currentStage);
  const [role, setRole] = React.useState('developer');
  const [available, setAvailable] = React.useState('true');
  
  // State to track the current app stage (Stage 1 or Stage 2)
  const [appStage, setAppStage] = React.useState<'problems' | 'projects'>(APP_CONFIG.CURRENT_APP_STAGE as 'problems' | 'projects');
  
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  const handlePopulate = () => {
    // Generate votes based on selected mode
    let votes = {};
    let complete = true;
    
    switch (mode) {
      case 'complete':
        // All pitches with both appetite and tier
        votes = generateRandomVotes(pitchIds);
        break;
      case 'appetites-only':
        // Only appetite values, no tiers
        votes = generateRandomVotes(pitchIds);
        Object.values(votes).forEach((vote: any) => {
          delete vote.tier;
        });
        complete = false;
        break;
      case 'tiers-only':
        // Only tier values, no appetites
        votes = generateRandomVotes(pitchIds);
        Object.values(votes).forEach((vote: any) => {
          delete vote.appetite;
        });
        complete = false;
        break;
      case 'partial':
        // About 70% complete
        votes = generateRandomVotes(pitchIds);
        Object.values(votes).forEach((vote: any, index) => {
          // Remove some values randomly
          if (index % 5 === 0) delete vote.tier;
          if (index % 7 === 0) delete vote.appetite;
        });
        complete = false;
        break;
    }
    
    // Update the app stage if it has changed
    if (appStage !== APP_CONFIG.CURRENT_APP_STAGE) {
      updateAppStage(appStage);
    }
    
    // Call the populate function
    onPopulate(name, votes, complete);
    
    // Set the stage if stage change handler is provided
    if (onStageChange && stage !== currentStage) {
      onStageChange(stage);
    }
    
    handleClose();
  };
  
  const handleStageChange = () => {
    // Update the app stage if it has changed
    if (appStage !== APP_CONFIG.CURRENT_APP_STAGE) {
      updateAppStage(appStage);
    }
    
    // Just change the stage without populating data
    if (onStageChange && stage !== currentStage) {
      // Check if the stage can be accessed before changing
      if (!canAccessStage || canAccessStage(stage)) {
        onStageChange(stage);
        handleClose();
      } else {
        // Alert the user that the selected stage cannot be accessed
        alert(`Cannot navigate to ${stage} from the current stage.`);
      }
    } else {
      // If only changing app stage without changing the view stage
      handleClose();
    }
  };
  
  // Handler for toggling between app stages
  const toggleAppStage = () => {
    const newAppStage = appStage === 'problems' ? 'projects' : 'problems';
    setAppStage(newAppStage);
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                This development-only tool will set a test name, auto-populate votes, and select test stages.
              </Typography>
              <Chip 
                label={appStage === 'problems' ? 'Stage 1' : 'Stage 2'} 
                color={appStage === 'problems' ? 'primary' : 'secondary'}
                onClick={toggleAppStage}
                sx={{ fontWeight: 'bold' }}
              />
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
                <MenuItem value="complete">Complete (Appetites + Tiers)</MenuItem>
                <MenuItem value="appetites-only">Appetites Only</MenuItem>
                <MenuItem value="tiers-only">Tiers Only</MenuItem>
                <MenuItem value="partial">Partial (~70% Complete)</MenuItem>
              </Select>
            </FormControl>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Testing Configuration
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="app-stage-select-label">App Stage</InputLabel>
              <Select
                labelId="app-stage-select-label"
                value={appStage}
                onChange={(e) => setAppStage(e.target.value as 'problems' | 'projects')}
                label="App Stage"
              >
                <MenuItem value="problems">Stage 1 (Problems)</MenuItem>
                <MenuItem value="projects">Stage 2 (Projects)</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="stage-select-label">View Stage</InputLabel>
              <Select
                labelId="stage-select-label"
                value={stage}
                onChange={(e) => setStage(e.target.value as AppStage)}
                label="View Stage"
              >
                {/* Disable Stage 1 options when in Stage 2 */}
                <MenuItem value="priority" disabled={appStage === 'projects'}>Stage 1: Rank Problems{appStage === 'projects' && ' (Blocked)'}</MenuItem>
                <MenuItem value="interest" disabled={appStage === 'projects'}>Stage 1: Problem Interest{appStage === 'projects' && ' (Blocked)'}</MenuItem>
                <MenuItem value="projects">Stage 2: Rank Projects</MenuItem>
                <MenuItem value="project-interest">Stage 2: Project Interest</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">User Role</InputLabel>
              <Select
                labelId="role-select-label"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                label="User Role"
              >
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="qm">QM</MenuItem>
                <MenuItem value="uxd">UXD</MenuItem>
                <MenuItem value="dev-tl">Dev TL</MenuItem>
                <MenuItem value="qm-tl">QM TL</MenuItem>
                <MenuItem value="tltl">TLTL</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="available-select-label">Can Help Next Quarter</InputLabel>
              <Select
                labelId="available-select-label"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                label="Can Help Next Quarter"
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {onStageChange && (
            <Button 
              onClick={handleStageChange} 
              variant="outlined" 
              color="info"
              sx={{ mr: 1 }}
            >
              Set Stage Only
            </Button>
          )}
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
