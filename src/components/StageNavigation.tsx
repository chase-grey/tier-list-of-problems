import React from 'react';
import { Box, Button, Tooltip, styled } from '@mui/material';
import {
  DragIndicator as RankProblemsIcon,
  ThumbUp as RankInterestIcon,
  LocalActivity as RankProjectsIcon,
  GetApp as FinishIcon
} from '@mui/icons-material';

// Define the available application stages
export type AppStage = 'priority' | 'interest' | 'projects';

// Styled button for the navigation
const NavButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  margin: theme.spacing(0, 0.5),
  minWidth: 'auto',
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
  isExportEnabled
}) => {
  // Define all stages with their labels and icons
  const stages = [
    {
      value: 'priority' as AppStage,
      label: 'Rank Problems',
      icon: <RankProblemsIcon fontSize="small" />,
      tooltip: 'Prioritize problems and assign appetites'
    },
    {
      value: 'interest' as AppStage,
      label: 'Rank Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest level in problems'
    },
    {
      value: 'projects' as AppStage,
      label: 'Rank Projects',
      icon: <RankProjectsIcon fontSize="small" />,
      tooltip: 'Prioritize projects based on previous rankings'
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
      width: '100%'
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
                  {stage.label}
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
