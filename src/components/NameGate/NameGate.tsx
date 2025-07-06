import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface NameGateProps {
  onNameSubmit: (name: string) => void;
  open: boolean;
}

/**
 * Initial gate component that collects the voter's name
 */
export const NameGate = ({ onNameSubmit, open }: NameGateProps) => {
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };
  
  const isDisabled = name.trim().length === 0;

  return (
    <Dialog 
      open={open} 
      aria-labelledby="name-gate-title"
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="name-gate-title">
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome to Problem Polling
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box my={2}>
            <Typography variant="body1" gutterBottom>
              Please enter your full name to begin ranking problem pitches.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Your Full Name"
              type="text"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              inputProps={{
                'aria-label': 'Enter your full name',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            type="submit" 
            color="primary" 
            variant="contained"
            disabled={isDisabled}
          >
            Continue
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
