import React from 'react';
import { Box, Button, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { AutoFixHigh as AutoFillIcon } from '@mui/icons-material';
import { generateRandomVotes } from '../utils/testUtils';

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
  const [mode, setMode] = React.useState('complete');
  
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
    
    // Call the populate function
    onPopulate(name, votes, complete);
    handleClose();
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
