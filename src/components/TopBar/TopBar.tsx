import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  HelpOutline as HelpIcon,
  RestartAlt as ResetIcon
} from '@mui/icons-material';
import StageNavigation from '../StageNavigation';
import type { AppStage } from '../StageNavigation';


interface TopBarProps {
  voterName: string | null;
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  interestCount: number;
  onFinish: () => void;
  isExportEnabled: boolean;
  onHelpClick: () => void;
  onResetClick: () => void;
  stage: AppStage;
  onStageChange: (stage: AppStage) => void;
  canAccessStage: (stage: AppStage) => boolean;
  completedStages: AppStage[];
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ 
  voterName, 
  totalPitchCount, 
  appetiteCount, 
  rankCount, 
  interestCount,
  onFinish, 
  isExportEnabled,
  onHelpClick,
  onResetClick,
  stage,
  onStageChange,
  canAccessStage,
  completedStages
}: TopBarProps) => {
  return (
    <AppBar position="sticky">
      <Toolbar sx={{ flexDirection: 'column', py: 0.5 }}>
        {/* Top section with title and stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, mr: 1 }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<ResetIcon />}
              onClick={onResetClick}
              aria-label="Reset all votes"
              sx={{
                mr: 2,
                height: 28, // Smaller reset button
                '&:hover': {
                  bgcolor: 'rgba(244, 67, 54, 0.08)'
                }
              }}
            >
              Reset
            </Button>
            
            <Typography variant="subtitle1" component="div" sx={{ fontSize: '0.95rem' }}>
              Problem Polling: {voterName}
            </Typography>
            
            <Tooltip title="View Instructions">
              <IconButton 
                color="inherit"
                size="small" 
                onClick={onHelpClick}
                sx={{ ml: 1 }}
                aria-label="Help"
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          {/* This space is now free since counters are in the navigation buttons */}
          <Box sx={{ width: 20 }} />
        </Box>
        
        {/* Stage navigation with blocky style buttons, counters, and integrated Finish button */}
        <StageNavigation
          activeStage={stage}
          completedStages={completedStages}
          onStageSelect={onStageChange}
          canAccessStage={canAccessStage}
          onFinish={onFinish}
          isExportEnabled={isExportEnabled}
          totalPitchCount={totalPitchCount}
          appetiteCount={appetiteCount}
          rankCount={rankCount}
          interestCount={interestCount}
        />
      </Toolbar>
    </AppBar>
  );
};
