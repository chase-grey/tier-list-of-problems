import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Switch
} from '@mui/material';

interface AvailabilityDialogProps {
  open: boolean;
  onAvailabilitySet: (available: boolean) => void;
}

/**
 * Dialog to ask users if they are available to work on projects next quarter
 */
export const AvailabilityDialog = ({ open, onAvailabilitySet }: AvailabilityDialogProps) => {
  const [isAvailable, setIsAvailable] = React.useState(true);

  const handleSubmit = () => {
    onAvailabilitySet(isAvailable);
  };

  return (
    <Dialog 
      open={open} 
      aria-labelledby="availability-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="availability-dialog-title">
        <Typography variant="h5" component="h2" gutterBottom>
          Availability for Next Quarter
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box my={2}>
          <Typography variant="body1" paragraph>
            Are you available to work on these projects in the next quarter?
          </Typography>
          <Typography variant="body2" paragraph color="text.secondary">
            If you are already working on a committed project, changing teams, or have any other reason you won't be available, please indicate that.
          </Typography>
          
          <FormControlLabel
            control={
              <Switch 
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                color="primary"
              />
            }
            label={isAvailable ? "I am available to help on these projects" : "I am NOT available to help on these projects"}
          />
          
          {!isAvailable && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You'll still rank the priorities, but you won't need to rank your interest in helping solve them.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvailabilityDialog;
