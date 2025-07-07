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
}

/**
 * Dialog with instructions on how to use the tier list app
 */
const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose, userRole }) => {
  // Check if user is a customer
  const isCustomer = userRole === 'customer';
  
  // Determine if user should see interest level step
  // Only QMs, developers, QM TLs, and dev TLs should see this step
  const shouldShowInterestStep = 
    userRole === 'developer' || 
    userRole === 'QM' || 
    userRole === 'dev TL' || 
    userRole === 'QM TL';
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
        
        {shouldShowInterestStep && (
          <>
            <Typography variant="h6" gutterBottom>
              Step 3: Rank Your Interest Level
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Note: This step only applies to QMs, developers, QM TLs, and dev TLs that are contributing towards solutions to these problems next quarter.</strong>
            </Typography>
            <Typography variant="body1" paragraph>
              After ranking priorities, you'll be asked to rank your interest level in working on each problem. You will need to:
            </Typography>
            
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                • Drag each problem card into one of eight interest level columns, ranging from "Extremely Interested" to "Not Interested"
              </Typography>
              <Typography variant="body1" gutterBottom>
                • This helps us match problems with people who are most interested in solving them
              </Typography>
            </Box>
            
            <Divider sx={{ my: 3 }} />
          </>
        )}
        
        <Typography variant="h6" gutterBottom>
          {shouldShowInterestStep ? 'Step 4: Export Your Results' : 'Step 3: Export Your Results'}
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
              href="https://epic1.sharepoint.com/:f:/s/SmartTools-Docs/EodUOVUDhwxKhuMUK3OeY2IBV_dj5j41GYqsqgu45MMEmQ?e=BYGkur"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: 'primary.main',
                wordBreak: 'break-all',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              https://epic1.sharepoint.com/:f:/s/SmartTools-Docs/EodUOVUDhwxKhuMUK3OeY2IBV_dj5j41GYqsqgu45MMEmQ?e=BYGkur
            </Typography>
          </Box>
        )}
        
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
