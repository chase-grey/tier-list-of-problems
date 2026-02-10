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
  userRole: string | null;
  showInterestStep: boolean;
}

/**
 * Dialog with instructions on how to use the tier list app
 */
const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose, userRole, showInterestStep }) => {
  // Check if user is a customer
  const isCustomer = userRole === 'customer';
  const sharePointUrl = 'https://epic1.sharepoint.com/:f:/s/SmartTools-Docs/IgCMGRgsBqd0SZqSL-gZ9sQGAZjgncTeb_kmoGM6_OODz_4?e=wVa9u4';

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
          Stage 1: Priority Ranking
        </Typography>
        <Typography variant="body1" paragraph>
          Drag each pitch into a tier column (Tier 1 = Highest Priority, Tier 4 = Not a Priority).
          Rank at least 50% to submit. Pitches not prioritized this version can still be re-pitched next time.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {showInterestStep && (
          <>
            <Typography variant="h6" gutterBottom>
              Interest Ranking
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Stage 1:</strong> Devs who are available rank interest on all pitches after completing priority ranking.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Stage 2:</strong> QM and dev TL roles who are available rank interest on a subset of pitches that advanced.
            </Typography>
            <Typography variant="body1" paragraph>
              Drag each pitch into an interest column (Very Interested → Not Interested). 
              This helps match people with projects they're excited about. Rank at least 50% to submit.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
          </>
        )}
        
        <Typography variant="h6" gutterBottom>
          Export Your Results
        </Typography>
        <Typography variant="body1" paragraph>
          Once complete, click Export to download your rankings as CSV.
        </Typography>

        <Typography variant="body1" paragraph>
          {isCustomer ? (
            <>Email your results to Chase Grey (<strong>cgrey@epic.com</strong>).</>
          ) : (
            <>Save your file to SharePoint using your full name as the filename:</>
          )}
        </Typography>
        
        {!isCustomer && (
          <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.07)', borderRadius: 1, mb: 2, overflowX: 'auto' }}>
            <Typography 
              variant="body2" 
              component="a" 
              href={sharePointUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: (theme) => theme.palette.mode === 'dark' ? '#90caf9' : theme.palette.primary.main,
                wordBreak: 'break-all',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {sharePointUrl}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Got It</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
