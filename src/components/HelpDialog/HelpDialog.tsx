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
          Step 1: Rank Problems by Priority
        </Typography>
        <Typography variant="body1" paragraph>
          Drag each problem card into one of the four tier columns based on how important you think it is to solve in this next version.
          The tiers range from "Highest Priority" (Tier 1) to "Not a Priority" (Tier 4).
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'text.primary' }}>
          You need to rank at least 50% of the problems to submit your feedback. However, ranking more helps our team make more informed decisions about what to work on next.
        </Typography>
        <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          Note: Even if a problem isn't prioritized for this version, it could always be pitched and prioritized in the next version instead.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {showInterestStep && (
          <>
            <Typography variant="h6" gutterBottom>
              Step 2: Rank Your Interest Level
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Note: This step only applies to developers who indicated they are available to help next quarter.</strong>
            </Typography>
            <Typography variant="body1" paragraph>
              After ranking priorities, you'll be asked to rank your interest level in working on each problem. This information helps team leads match people with projects they're excited about working on. You will need to:
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              Drag each problem card into one of four interest level columns, ranging from "Very Interested" to "Not Interested".
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'text.primary' }}>
              You need to set your interest levels for at least 50% of the problems to submit your feedback. The more data you provide, the better we can match folks to their interests.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
          </>
        )}
        
        <Typography variant="h6" gutterBottom>
          {showInterestStep ? 'Step 3: Export Your Results' : 'Step 2: Export Your Results'}
        </Typography>
        <Typography variant="body1" paragraph>
          Once you've completed all the required steps, the Export button will become active.
          Click it to download your rankings as a CSV file.
        </Typography>

        <Typography variant="body1" paragraph>
          {isCustomer ? (
            <>After downloading, please email your results to Chase Grey (<strong>cgrey@epic.com</strong>).</>
          ) : (
            <>After downloading, please save your file to this SharePoint site using your full name as the filename:</>
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
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 0, 0, 0.07)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
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
