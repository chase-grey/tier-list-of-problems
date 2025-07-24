import React from 'react';
import { Box, Button, Tooltip, styled } from '@mui/material';
import {
  DragIndicator as RankProblemsIcon,
  ThumbUp as RankInterestIcon,
  LocalActivity as RankProjectsIcon,
  GetApp as FinishIcon,
  RestaurantMenu as AppetiteIcon,
  FormatListNumbered as RankIcon
} from '@mui/icons-material';

// Define the available application stages
export type AppStage = 'priority' | 'interest' | 'projects';

// Styled button for the navigation
const NavButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  margin: theme.spacing(0, 0.5),
  minWidth: 'auto',
  height: '48px', // Ensure consistent height
  fontSize: '0.75rem',
  textTransform: 'none',
  fontWeight: 'bold',
}));

// Props for the StageNavigation component
interface StageNavigationProps {
  activeStage: AppStage;
  completedStages: AppStage[];
  onStageSelect: (stage: AppStage) => void;
  canAccessStage: (stage: AppStage) => boolean;
  onFinish: () => void;
  isExportEnabled: boolean;
  // Progress counters
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  interestCount: number;
  // Project counters
  totalProjectCount?: number;
  rankedProjectCount?: number;
}

/**
 * Navigation component that shows all stages as buttons and allows navigation
 */
const StageNavigation: React.FC<StageNavigationProps> = ({
  activeStage,
  completedStages,
  onStageSelect,
  canAccessStage,
  onFinish,
  isExportEnabled,
  totalPitchCount,
  appetiteCount,
  rankCount,
  interestCount,
  totalProjectCount = 8, // Default value if not provided
  rankedProjectCount = 0
}) => {
  // Define all stages with their labels, icons, and progress counters
  const stages = [
    {
      value: 'priority' as AppStage,
      label: 'Rank Problems',
      icon: <RankProblemsIcon fontSize="small" />,
      tooltip: 'Prioritize problems and assign appetites',
      progressCounts: {
        appetite: appetiteCount,
        rank: rankCount,
        total: totalPitchCount
      }
    },
    {
      value: 'interest' as AppStage,
      label: 'Rank Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest level in problems',
      progressCounts: {
        interest: interestCount,
        total: totalPitchCount
      }
    },
    {
      value: 'projects' as AppStage,
      label: 'Rank Projects',
      icon: <RankProjectsIcon fontSize="small" />,
      tooltip: 'Prioritize projects based on previous rankings',
      progressCounts: {
        ranked: rankedProjectCount,
        total: totalProjectCount
      }
    }
  ];

  // Determine when to show the Finish button
  // Show after Interest if in priority/interest stage, or after Projects if in projects stage
  const showFinishAfterInterest = activeStage !== 'projects';
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: '100%',
      mt: -2.5, // More aggressive negative margin to eliminate gap completely
      position: 'relative',
      top: '-5px', // Additional top adjustment to move buttons up
    }}>
      {stages.map((stage, index) => {
        const isActive = activeStage === stage.value;
        const isCompleted = completedStages.includes(stage.value);
        const canAccess = canAccessStage(stage.value);
        
        const buttonVariant = isActive ? 'contained' : (isCompleted ? 'outlined' : 'outlined');
        
        // Choose button color based on state
        const buttonColor = isActive 
          ? 'primary'
          : isCompleted 
            ? 'success'
            : 'inherit';
            
        // Show opacity for buttons that can't be accessed yet
        const buttonOpacity = canAccess ? 1 : 0.5;
        
        return (
          <React.Fragment key={stage.value}>
            <Tooltip title={
              !canAccess 
                ? "Complete previous steps first" 
                : (isCompleted && !isActive)
                  ? "Return to this stage"
                  : isActive
                    ? "Current stage"
                    : stage.tooltip
            }>
              <span> {/* Wrapper needed for disabled tooltip */}
                <NavButton
                  variant={buttonVariant}
                  color={buttonColor}
                  startIcon={stage.icon}
                  onClick={() => canAccess && onStageSelect(stage.value)}
                  disabled={!canAccess}
                  sx={{ 
                    opacity: buttonOpacity,
                    pointerEvents: canAccess ? 'auto' : 'none',
                    // Add arrow indicator if active
                    '&::after': isActive ? {
                      content: '""',
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid',
                      borderTopColor: 'primary.main',
                    } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box>{stage.label}</Box>
                    
                    {/* Progress counter displays */}
                    {stage.progressCounts && stage.value === 'priority' && (
                      <Box 
                        sx={{ 
                          fontSize: '0.65rem', 
                          opacity: 0.9,
                          mt: 0.2,
                          display: 'flex',
                          gap: 0.5,
                          alignItems: 'center',
                        }}
                      >
                        <Box 
                          component="span"
                          sx={{ 
                            color: appetiteCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                            fontWeight: appetiteCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <AppetiteIcon sx={{ fontSize: '0.9rem', mr: 0.2 }} />
                          {appetiteCount}/{totalPitchCount}
                        </Box>
                        <Box component="span" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>•</Box>
                        <Box 
                          component="span"
                          sx={{ 
                            color: rankCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                            fontWeight: rankCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <RankIcon sx={{ fontSize: '0.9rem', mr: 0.2 }} />
                          {rankCount}/{totalPitchCount}
                        </Box>
                      </Box>
                    )}
                    
                    {stage.progressCounts && stage.value === 'interest' && (
                      <Box 
                        sx={{ 
                          fontSize: '0.65rem', 
                          opacity: 0.9,
                          mt: 0.2,
                          color: interestCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                          fontWeight: interestCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                        }}
                      >
                        {interestCount}/{totalPitchCount}
                      </Box>
                    )}
                    
                    {/* Projects counter */}
                    {stage.progressCounts && stage.value === 'projects' && (
                      <Box 
                        sx={{ 
                          fontSize: '0.65rem', 
                          opacity: 0.9,
                          mt: 0.2,
                          color: rankedProjectCount >= Math.ceil(totalProjectCount / 2) ? '#4caf50' : 'inherit',
                          fontWeight: rankedProjectCount >= Math.ceil(totalProjectCount / 2) ? 'bold' : 'normal',
                        }}
                      >
                        {rankedProjectCount}/{totalProjectCount}
                      </Box>
                    )}
                  </Box>
                </NavButton>
              </span>
            </Tooltip>
            
            {/* Add Finish button after Interest if in priority/interest stage */}
            {index === 1 && showFinishAfterInterest && (
              <Tooltip title={!isExportEnabled ? "Complete required fields first" : "Finish and export results"}>
                <span>
                  <NavButton
                    variant={isExportEnabled ? "contained" : "outlined"}
                    color={isExportEnabled ? "secondary" : "inherit"}
                    startIcon={<FinishIcon fontSize="small" />}
                    onClick={onFinish}
                    disabled={!isExportEnabled}
                    sx={{ 
                      opacity: isExportEnabled ? 1 : 0.5,
                      ml: 1,
                    }}
                  >
                    Finish
                  </NavButton>
                </span>
              </Tooltip>
            )}
          </React.Fragment>
        );
      })}
      
      {/* Add Finish button at the end when in Projects stage */}
      {!showFinishAfterInterest && (
        <Tooltip title={!isExportEnabled ? "Complete required fields first" : "Finish and export results"}>
          <span>
            <NavButton
              variant={isExportEnabled ? "contained" : "outlined"}
              color={isExportEnabled ? "secondary" : "inherit"}
              startIcon={<FinishIcon fontSize="small" />}
              onClick={onFinish}
              disabled={!isExportEnabled}
              sx={{ 
                opacity: isExportEnabled ? 1 : 0.5,
                ml: 1,
              }}
            >
              Finish
            </NavButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export default StageNavigation;
