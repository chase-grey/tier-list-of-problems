import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog with instructions on how to use the tier list app
 */
const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="help-dialog-title"
    >
      <DialogTitle id="help-dialog-title" sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <HelpIcon color="info" />
          <Typography variant="h5">How to Complete This Poll</Typography>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Step 1: Rank All Problems
        </Typography>
        <Typography variant="body1" paragraph>
          Drag each problem card into one of the eight tier columns based on how important you think it is to solve in this next version.
          The tiers range from "Highest Priority" (Tier 1) to "Not a Priority" (Tier 8).
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          Note: Even if a problem isn't prioritized for this version, it could always be pitched and prioritized in the next version instead.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Step 2: Set an Appetite for Each Problem
        </Typography>
        <Typography variant="body1" paragraph>
          For each problem, select an appetite by clicking on one of the S/M/L buttons on the card:
        </Typography>
        
        <Box sx={{ pl: 2, mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Small (S):</strong> If this problem is only worth addressing in a couple of weeks of development or less.
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Medium (M):</strong> If it would be worth spending around half a quarter on this problem.
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Large (L):</strong> If it would be a good use of time for a developer to spend their entire next quarter working on this problem.
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          <strong>Appetite means:</strong> If this problem does get prioritized and we are going to spend time addressing it, how much time is it worth spending on it?
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Step 3: Export Your Results
        </Typography>
        <Typography variant="body1" paragraph>
          Once you've ranked all problems and set an appetite for each one, the Export button will become active.
          Click it to download your rankings and appetites as a CSV file.
        </Typography>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33, 150, 243, 0.08)', borderRadius: 1 }}>
          <Typography variant="body2" color="primary">
            You can access these instructions at any time by clicking the help icon in the top bar.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Got It</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
