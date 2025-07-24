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
  RestaurantMenu as AppetiteIcon,
  FormatListNumbered as RankedIcon,
  RestartAlt as ResetIcon,
  ThumbUp as InterestIcon,
  LocalActivity as ProjectIcon
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
          
          {/* Progress metrics - more compact */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ 
              display: 'flex', 
              gap: 1,
              fontSize: '0.8rem',
              px: 1,
              py: 0.5,
              bgcolor: 'rgba(255,255,255,0.1)',
              borderRadius: 1,
              alignItems: 'center'
            }}>
              {stage === 'priority' ? (
                <>
                  <Box 
                    component="span" 
                    sx={{ 
                      color: appetiteCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                      fontWeight: appetiteCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <AppetiteIcon sx={{ fontSize: '1.1rem' }} />
                    <span>{appetiteCount}/{totalPitchCount}</span>
                  </Box>
                  <Box component="span" sx={{ fontSize: '0.8rem', opacity: 0.7 }}>•</Box>
                  <Box 
                    component="span" 
                    sx={{ 
                      color: rankCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                      fontWeight: rankCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <RankedIcon sx={{ fontSize: '1.1rem' }} />
                    <span>{rankCount}/{totalPitchCount}</span>
                  </Box>
                </>
              ) : stage === 'interest' ? (
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: interestCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                    fontWeight: interestCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal'
                  }}
                >
                  <InterestIcon sx={{ fontSize: '1.1rem' }} />
                  <span>{interestCount}/{totalPitchCount}</span>
                </Box>
              ) : (
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <ProjectIcon sx={{ fontSize: '1.1rem' }} />
                  <span>Projects</span>
                </Box>
              )}
            </Typography>
          </Box>
        </Box>
        
        {/* Stage navigation with blocky style buttons and integrated Finish button */}
        <StageNavigation
          activeStage={stage}
          completedStages={completedStages}
          onStageSelect={onStageChange}
          canAccessStage={canAccessStage}
          onFinish={onFinish}
          isExportEnabled={isExportEnabled}
        />
      </Toolbar>
    </AppBar>
  );
};
