import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Chip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { TEAM_ROSTER, type TeamMember } from '../../data/teamRoster';

interface NameGateProps {
  onNameSubmit: (name: string, role: string) => void;
  open: boolean;
}

export const NameGate = ({ onNameSubmit, open }: NameGateProps) => {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected) {
      onNameSubmit(selected.name, selected.role);
    }
  };

  return (
    <Dialog open={open} aria-labelledby="name-gate-title" maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle id="name-gate-title">
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome to Problem Polling
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box my={2}>
            <Typography variant="body1" gutterBottom>
              Select your name to begin ranking problem pitches.
            </Typography>
            <Autocomplete
              autoFocus
              autoHighlight
              autoSelect
              options={TEAM_ROSTER}
              getOptionLabel={(option) => option.name}
              filterOptions={(options, { inputValue }) => {
                const lower = inputValue.toLowerCase();
                return options.filter(o =>
                  o.name.split(' ').some(word => word.toLowerCase().startsWith(lower))
                );
              }}
              value={selected}
              onChange={(_, value) => setSelected(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Your Name"
                  placeholder="Start typing your name…"
                  variant="outlined"
                  margin="dense"
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <span style={{ flex: 1 }}>{option.name}</span>
                    <Chip label={option.role} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.name === value.name}
            />
            {selected && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Role: <strong>{selected.role}</strong>
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="submit" color="primary" variant="contained" disabled={!selected}>
            Continue
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
