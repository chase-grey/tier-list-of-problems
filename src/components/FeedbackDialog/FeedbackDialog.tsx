import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

export interface FeedbackData {
  rating: number | null;
  comments: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedbackData: FeedbackData) => void;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose, onSubmit }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    onSubmit({ rating, comments });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Optional: Quick Feedback</DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            How would you rate your experience with this process?
          </Typography>

          <Box sx={{ mt: 2, mb: 0.5 }}>
            <ToggleButtonGroup
              value={rating}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) setRating(newValue);
              }}
              sx={{ display: 'flex', width: '100%' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <ToggleButton
                  key={n}
                  value={n}
                  sx={{ flex: 1, py: 1, fontWeight: rating === n ? 700 : 400 }}
                >
                  {n}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Not great</Typography>
              <Typography variant="caption" color="text.secondary">Amazing</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Any additional feedback or comments?
          </Typography>

          <TextField
            label="Feedback"
            multiline
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Skip
        </Button>
        <Button
          onClick={handleSubmit}
          color="secondary"
          variant="contained"
          disabled={rating === null}
        >
          Submit & Finish
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
