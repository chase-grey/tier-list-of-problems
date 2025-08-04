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
export type AppStage = 'priority' | 'interest' | 'project-interest' | 'project-priority' | 'projects';

// Define the user roles
export type UserRole = 'developer' | 'qm' | 'uxd' | 'dev-tl' | 'qm-tl' | 'tltl' | 'customer' | 'other';

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
  // User role and availability info
  voterRole: string | null;
  available: boolean | null;
  // Project interest counters
  projectInterestCount?: number;
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
  rankedProjectCount = 0,
  voterRole,
  available,
  projectInterestCount = 0
}) => {
  // Determine whether user can help with projects next quarter
  const canHelpNextQuarter = available === true;
  
  // Determine if user is a developer (needs Problem Interest)
  const isDeveloper = voterRole === 'developer';
  
  // Determine which roles have access to Project Interest section
  const canShowProjectInterest = (
    (voterRole === 'qm' || voterRole === 'dev-tl') && canHelpNextQuarter
  ) || (isDeveloper && canHelpNextQuarter);

  // Define all potential stages with their labels, icons, and progress counters
  const allStages = [
    {
      value: 'priority' as AppStage,
      label: 'Rank Problems',
      icon: <RankProblemsIcon fontSize="small" />,
      tooltip: 'Prioritize problems and assign appetites',
      progressCounts: {
        appetite: appetiteCount,
        rank: rankCount,
        total: totalPitchCount
      },
      // Always show this stage for all users
      show: true
    },
    {
      value: 'interest' as AppStage,
      label: 'Problem Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest level in problems',
      progressCounts: {
        interest: interestCount,
        total: totalPitchCount
      },
      // Only show for developers who can help next quarter
      show: isDeveloper && canHelpNextQuarter
    },
    {
      value: 'projects' as AppStage,
      label: 'Rank Projects',
      icon: <RankProjectsIcon fontSize="small" />,
      tooltip: 'Prioritize projects based on previous rankings',
      progressCounts: {
        ranked: rankedProjectCount,
        total: totalProjectCount
      },
      // Always show this stage for all users
      show: true
    },
    {
      value: 'project-interest' as AppStage,
      label: 'Project Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest level in projects',
      progressCounts: {
        ranked: projectInterestCount,
        total: totalProjectCount
      },
      // Only show for certain roles who can help next quarter
      show: canShowProjectInterest
    }
  ];
  
  // Filter stages based on user role and availability
  const stages = allStages.filter(stage => stage.show);

  // Determine where to show the Finish button based on stage and available sections
  const hasProblemInterest = allStages.some(stage => stage.value === 'interest' && stage.show);
  const hasProjectInterestStage = allStages.some(stage => stage.value === 'project-interest' && stage.show);
  
  // In Stage 1 (Priority/Interest), show finish button after Problem Interest for devs with canHelp=true
  // otherwise show it after Rank Problems
  // In Stage 2 (Projects), show finish button after Project Interest for roles with canHelp=true
  // otherwise show it after Rank Projects
  
  // We're in Stage 1 when we're not in the Projects stage
  // Treat both 'projects' and 'project-priority' as the same stage for UI purposes
  const inStage1 = activeStage !== 'projects' && activeStage !== 'project-interest' && activeStage !== 'project-priority';
  
  // Determine where to show the finish button
  const finishButtonPosition = inStage1 ? 
    (hasProblemInterest ? 1 : 0) : // After Problem Interest or Rank Problems in Stage 1
    (hasProjectInterestStage ? stages.length - 1 : stages.findIndex(s => s.value === 'projects')); // After Project Interest or Projects in Stage 2
  
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
        // Treat 'project-priority' as equivalent to 'projects' for highlighting
        const isActive = (activeStage === stage.value) || 
                       (activeStage === 'project-priority' && stage.value === 'projects');
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
                ? (inStage1 && (stage.value === 'projects' || stage.value === 'project-interest'))
                  ? "This section will be available when Stage 2 voting begins"
                  : !inStage1 && (stage.value === 'priority' || stage.value === 'interest')
                    ? "Cannot return to Stage 1 views from Stage 2"
                    : "Complete previous steps first" 
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
                    // Add visual indication that Stage 1 views are no longer accessible in Stage 2
                    position: 'relative',
                    '&::before': !inStage1 && (stage.value === 'priority' || stage.value === 'interest') ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      zIndex: 1,
                    } : undefined,
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
            
            {/* Add Finish button at the appropriate position based on stage and user role */}
            {inStage1 && index === finishButtonPosition && (
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
                      // Add highlight effect when active, regardless of stage
                      boxShadow: isExportEnabled ? 2 : 0,
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
      {!inStage1 && finishButtonPosition === stages.length - 1 && (
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
                // Add highlight effect when active, regardless of stage
                boxShadow: isExportEnabled ? 2 : 0,
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
