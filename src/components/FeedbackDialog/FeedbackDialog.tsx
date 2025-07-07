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
  Rating 
} from '@mui/material';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';

// Interface for the feedback data
export interface FeedbackData {
  rating: number | null;
  comments: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedbackData: FeedbackData) => void;
}

// Custom icons for the rating component
const customIcons: { [index: string]: { icon: React.ReactElement; label: string } } = {
  1: {
    icon: <SentimentVeryDissatisfiedIcon color="error" />,
    label: 'Very Dissatisfied',
  },
  2: {
    icon: <SentimentDissatisfiedIcon color="error" />,
    label: 'Dissatisfied',
  },
  3: {
    icon: <SentimentSatisfiedIcon color="warning" />,
    label: 'Neutral',
  },
  4: {
    icon: <SentimentSatisfiedAltIcon color="success" />,
    label: 'Satisfied',
  },
  5: {
    icon: <SentimentVerySatisfiedIcon color="success" />,
    label: 'Very Satisfied',
  },
};

function IconContainer(props: any) {
  const { value, ...other } = props;
  return <span {...other}>{customIcons[value].icon}</span>;
}

/**
 * Dialog for collecting feedback before finishing the poll
 */
export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose, onSubmit }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  
  const handleSubmit = () => {
    onSubmit({ rating, comments });
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Almost Done - Quick Feedback</DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            How would you rate your experience with this process?
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            my: 3
          }}>
            <Rating
              name="highlight-selected-only"
              value={rating}
              onChange={(_, newValue) => {
                setRating(newValue);
              }}
              IconContainerComponent={IconContainer}
              highlightSelectedOnly
              size="large"
            />
          </Box>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
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
