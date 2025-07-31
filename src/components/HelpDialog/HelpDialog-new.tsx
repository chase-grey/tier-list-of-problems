import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider,
  Chip,
  Alert
} from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';

// Import app configuration to display the current stage
import { APP_CONFIG } from '../App';

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
    userRole === 'qm' || 
    userRole === 'dev-tl' || 
    userRole === 'qm-tl';
    
  // Check which app stage we're in (problems or projects)
  const isStage1 = APP_CONFIG.CURRENT_APP_STAGE === 'problems';
  
  // Calculate appropriate step numbers based on role and stage
  const getExportStepNumber = () => {
    if (isStage1) {
      return shouldShowInterestStep ? 4 : 3;
    } else {
      return shouldShowInterestStep ? 3 : 2;
    }
  };
  
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Chip 
            label={isStage1 ? 'STAGE 1: PROBLEMS' : 'STAGE 2: PROJECTS'}
            color={isStage1 ? 'primary' : 'secondary'}
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {/* Current stage description */}
        <Alert 
          severity={isStage1 ? "info" : "warning"}
          sx={{ mb: 3 }}
          variant="filled"
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {isStage1 ? 'You are in Stage 1: Problems' : 'You are in Stage 2: Projects'}
          </Typography>
          <Typography variant="body2">
            {isStage1 
              ? 'In this stage, you will rank problems and set appetites for how much time should be spent on each problem.' 
              : 'In this stage, you will rank projects that were developed based on problem priorities from Stage 1.'}
          </Typography>
        </Alert>
        
        {/* Show appropriate content based on current stage */}
        {isStage1 ? (
          // STAGE 1: PROBLEMS CONTENT
          <>
            <Typography variant="h6" gutterBottom>
              Step 1: Rank Problems by Priority
            </Typography>
            <Typography variant="body1" paragraph>
              Drag each problem card into one of the eight tier columns based on how important you think it is to solve in this next version.
              The tiers range from "Highest Priority" (Tier 1) to "Not a Priority" (Tier 8).
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              You need to rank at least 50% of the problems to submit your feedback. However, ranking more helps our team make more informed decisions about what to work on next.
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              Note: Even if a problem isn't prioritized for this version, it could always be pitched and prioritized in the next version instead.
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Step 2: Set an Appetite for Problems
            </Typography>
            <Typography variant="body1" paragraph>
              For each problem, select an appetite by clicking on one of the S/M/L buttons on the card:
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              You need to set appetites for at least 50% of the problems to submit your feedback. The more data you provide, the better we can scope our solutions appropriately.
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
            
            {/* Only show the interest step for developers, QMs, etc. who can help next quarter */}
            {shouldShowInterestStep && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Step 3: Rank Your Interest Level
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Note: This step only applies to QMs, developers, QM TLs, and dev TLs that are contributing towards solutions to these problems next quarter.</strong>
                </Typography>
                <Typography variant="body1" paragraph>
                  After ranking priorities, you'll be asked to rank your interest level in working on each problem. This information helps team leads match people with projects they're excited about working on. You will need to:
                </Typography>
                
                <Typography variant="body1" gutterBottom>
                  Drag each problem card into one of eight interest level columns, ranging from "Extremely Interested" to "Not Interested".
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                  You need to set your interest levels for at least 50% of the problems to submit your feedback. The more data you provide, the better we can match folks to their interests.
                </Typography>
              </>
            )}
          </>
        ) : (
          // STAGE 2: PROJECTS CONTENT
          <>
            <Typography variant="h6" gutterBottom>
              Step 1: Rank Projects by Priority
            </Typography>
            <Typography variant="body1" paragraph>
              Drag each project card into one of the tier columns based on how important you think it is to implement in this next version.
              The tiers range from "Highest Priority" (Tier 1) to "Not a Priority" (Tier 8).
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              You need to rank at least 50% of the projects to submit your feedback.
            </Typography>
            
            {/* Only show the project interest step for developers, QMs, etc. who can help next quarter */}
            {shouldShowInterestStep && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Step 2: Indicate Your Project Interest
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Note: This step only applies to QMs, developers, QM TLs, and dev TLs that are contributing towards implementations next quarter.</strong>
                </Typography>
                <Typography variant="body1" paragraph>
                  After ranking projects, you'll be asked to indicate your interest level in working on each project. This information helps team leads match people with projects they're excited about working on.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                  You need to set your interest levels for at least 50% of the projects to submit your feedback.
                </Typography>
              </>
            )}
          </>
        )}
        
        {/* Export instructions - shown for both stages */}
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Step {getExportStepNumber()}: Export Your Results
        </Typography>
        <Typography variant="body1" paragraph>
          Once you've completed all the required steps, the Finish button will become active.
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
