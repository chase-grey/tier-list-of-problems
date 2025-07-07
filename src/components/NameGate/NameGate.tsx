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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';

interface NameGateProps {
  onNameSubmit: (name: string, role: string) => void;
  open: boolean;
}

/**
 * Initial gate component that collects the voter's name
 */
export const NameGate = ({ onNameSubmit, open }: NameGateProps) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [otherRole, setOtherRole] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && (role || otherRole.trim())) {
      // If 'other' is selected, use the custom role text, otherwise use the selected role
      const finalRole = role === 'other' ? otherRole.trim() : role;
      onNameSubmit(name.trim(), finalRole);
    }
  };
  
  const isDisabled = name.trim().length === 0 || 
    (role === '' || (role === 'other' && otherRole.trim().length === 0));

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
              Please enter your full name and role to begin ranking problem pitches.
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
            <FormControl 
              fullWidth 
              variant="outlined" 
              margin="dense"
              required
            >
              <InputLabel id="role-select-label">Your Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={role}
                label="Your Role"
                onChange={(e) => setRole(e.target.value)}
                aria-label="Select your role"
              >
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="QM">QM</MenuItem>
                <MenuItem value="UXD">UXD</MenuItem>
                <MenuItem value="dev TL">Dev TL</MenuItem>
                <MenuItem value="QM TL">QM TL</MenuItem>
                <MenuItem value="TLTL">TLTL</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
              <FormHelperText>Select your role in the project</FormHelperText>
            </FormControl>

            {/* Show text field for 'Other' role */}
            {role === 'other' && (
              <TextField
                margin="dense"
                id="other-role"
                label="Please specify your role"
                type="text"
                fullWidth
                variant="outlined"
                value={otherRole}
                onChange={(e) => setOtherRole(e.target.value)}
                required
                inputProps={{
                  'aria-label': 'Enter your custom role',
                }}
              />
            )}
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
