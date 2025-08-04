import React from 'react';
import { Box, Button, Tooltip, styled } from '@mui/material';
import {
  DragIndicator as RankProblemsIcon,
  ThumbUp as RankInterestIcon,
  LocalActivity as RankProjectsIcon,
  GetApp as FinishIcon,
  RestaurantMenu as AppetiteIcon,
  FormatListNumbered as RankIcon,
  Check as CompletedIcon
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
  // Helper function to normalize role names for consistent comparison
  const normalizeRoleName = (role: string | null): string => {
    if (!role) return '';
    return role.toLowerCase().trim();
  };
  
  // Determine whether user can help with projects next quarter
  const canHelpNextQuarter = available === true;
  
  // Determine user role categories (case-insensitive)
  const normalizedRole = normalizeRoleName(voterRole);
  const isDeveloper = normalizedRole === 'developer';
  const isQM = normalizedRole === 'qm';
  const isDevTL = normalizedRole === 'dev tl' || normalizedRole === 'dev-tl';
  const isQMTL = normalizedRole === 'qm tl' || normalizedRole === 'qm-tl';
  const isUXD = normalizedRole === 'uxd';
  const isTLTL = normalizedRole === 'tltl';
  const isCustomer = normalizedRole === 'customer';
  // Determine if role is Other or unrecognized (used in role documentation)
  const isOtherRole = normalizedRole === 'other' || 
    (!isDeveloper && !isQM && !isDevTL && !isQMTL && !isUXD && !isTLTL && !isCustomer);
  
  // Determine section visibility based on user role and ability to help next quarter
  
  // Stage 1: Problem Interest section is only shown to Developers who can help next quarter
  const canShowProblemInterest = isDeveloper && canHelpNextQuarter;
  
  // Stage 2: Project Interest section is shown to QMs, Devs, and Dev TLs who can help next quarter
  const canShowProjectInterest = canHelpNextQuarter && (isDeveloper || isQM || isDevTL);
  
  // Define the completion requirements for each section based on user role
  const getSectionCompletionRequirement = (section: AppStage): boolean => {
    // Calculate minimum thresholds (50% of tasks)
    const problemMinimum = Math.ceil(totalPitchCount / 2);
    const projectMinimum = Math.ceil(totalProjectCount / 2);
    
    switch(section) {
      case 'priority':
        // All roles need to rank half the problems and set half the appetites
        return rankCount >= problemMinimum && appetiteCount >= problemMinimum;
      
      case 'interest':
        // Only relevant for developers who can help, need half the problem interests
        return interestCount >= problemMinimum;
      
      case 'projects':
        // All roles need to rank half the projects
        return rankedProjectCount >= projectMinimum;
      
      case 'project-interest':
        // Only relevant for roles who can help, need half the project interests
        return projectInterestCount >= projectMinimum;
      
      default:
        return false;
    }
  };
    
  // Determine if current stage is Stage 1 (Problems) or Stage 2 (Projects)
  const inStage1 = activeStage === 'priority' || activeStage === 'interest';

  // Determine when Finish button should become active based on role, availability and progress
  const shouldEnableFinishButton = () => {
    // Stage 1 (Problems) finish conditions
    if (inStage1) {
      // Basic requirement for all users: need minimum problem ranking
      if (!getSectionCompletionRequirement('priority')) {
        return false;
      }
      
      // Extra requirement for developers who can help: need problem interest
      if (isDeveloper && canHelpNextQuarter && !getSectionCompletionRequirement('interest')) {
        return false;
      }
      
      // All conditions passed
      return true;
    }
    
    // Stage 2 (Projects) finish conditions
    else {
      // Basic requirement for all users: need minimum project ranking
      if (!getSectionCompletionRequirement('projects')) {
        return false;
      }
      
      // Extra requirement for relevant roles who can help: need project interest
      if (canShowProjectInterest && !getSectionCompletionRequirement('project-interest')) {
        return false;
      }
      
      // All conditions passed
      return true;
    }
  };
  
  // Function to calculate section completion percentage (0-100)
  const getSectionCompletionPercentage = (section: AppStage): number => {
    switch (section) {
      case 'priority':
        return Math.floor(((rankCount / totalPitchCount) + (appetiteCount / totalPitchCount)) * 50);
      case 'interest':
        return Math.floor((interestCount / totalPitchCount) * 100);
      case 'projects':
        return Math.floor((rankedProjectCount / totalProjectCount) * 100);
      case 'project-interest':
        return Math.floor((projectInterestCount / totalProjectCount) * 100);
      default:
        return 0;
    }
  };

  // Determine if a section meets the 50% completion threshold
  const isSectionCompleted = (section: AppStage): boolean => {
    return getSectionCompletionPercentage(section) >= 50;
  };
  
  // Logic to show finish button after the appropriate stage based on user role and availability
  let finishButtonPosition = -1;
  
  if (inStage1) {
    if (isDeveloper && canHelpNextQuarter) {
      finishButtonPosition = 1; // After interest for Developers in Stage 1
    } else {
      finishButtonPosition = 0; // After priority for all others in Stage 1
    }
  } else {
    if (canShowProjectInterest) {
      finishButtonPosition = 3; // After project-interest in Stage 2 for those who can help
    } else {
      finishButtonPosition = 2; // After projects in Stage 2 for others
    }
  }
  
  // Determine if Finish button should be enabled based on progress and permissions
  const finishEnabled = isExportEnabled && shouldEnableFinishButton();
  
  // Define all the available stages with their configuration based on user role
  const stageDefinitions = [
    {
      value: 'priority' as AppStage,
      label: 'Rank Problems',
      icon: <RankProblemsIcon fontSize="small" />,
      tooltip: 'Rank problems by priority and set appetites',
      progressCounts: true,
      getCompletionPercentage: () => getSectionCompletionPercentage('priority'),
      isCompleted: () => isSectionCompleted('priority'),
      show: true, // Always show for all users
      // Include role-specific details for documentation
      roleInfo: `Required for all users: ${normalizedRole}`
    },
    {
      value: 'interest' as AppStage,
      label: 'Problem Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest in each problem',
      progressCounts: true,
      getCompletionPercentage: () => getSectionCompletionPercentage('interest'),
      isCompleted: () => isSectionCompleted('interest'),
      show: canShowProblemInterest, // Only show for developers who can help
      // Include role-specific details for documentation
      roleInfo: `Only for developers who can help: ${isDeveloper && canHelpNextQuarter}`
    },
    {
      value: 'projects' as AppStage,
      label: 'Rank Projects',
      icon: <RankProjectsIcon fontSize="small" />,
      tooltip: 'Rank the proposed projects by priority',
      progressCounts: true,
      getCompletionPercentage: () => getSectionCompletionPercentage('projects'),
      isCompleted: () => isSectionCompleted('projects'),
      show: true, // Always show for all users
      // Include role-specific details for documentation
      roleInfo: `Required for all users: ${normalizedRole}`
    },
    {
      value: 'project-interest' as AppStage,
      label: 'Project Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: 'Indicate your interest level in projects',
      progressCounts: true,
      getCompletionPercentage: () => getSectionCompletionPercentage('project-interest'),
      isCompleted: () => isSectionCompleted('project-interest'),
      show: canShowProjectInterest, // Only show for roles who can help
      // Include details about which roles can see this section
      roleInfo: `For Devs/QMs/DevTLs who can help: ${isDeveloper || isQM || isDevTL} and ${canHelpNextQuarter}`
    }
  ];
  
  // Filter stages based on user role and availability
  const stages = stageDefinitions.filter(stage => stage.show);

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
                    {/* Show green checkmark for completed stages */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {stage.label}
                      {isCompleted && (
                        <CompletedIcon 
                          sx={{ 
                            ml: 0.5, 
                            fontSize: '0.9rem', 
                            color: '#4caf50' 
                          }} 
                        />
                      )}
                    </Box>
                    
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
              <Tooltip title={!finishEnabled ? "Complete required fields first" : "Finish and export results"}>
                <span>
                  <NavButton
                    variant={isExportEnabled ? "contained" : "outlined"}
                    color={isExportEnabled ? "secondary" : "inherit"}
                    startIcon={<FinishIcon fontSize="small" />}
                    onClick={onFinish}
                    disabled={!finishEnabled}
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
              disabled={!finishEnabled}
              sx={{ 
                opacity: finishEnabled ? 1 : 0.5,
                ml: 1,
                // Add highlight effect when active, regardless of stage
                boxShadow: finishEnabled ? 2 : 0,
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
