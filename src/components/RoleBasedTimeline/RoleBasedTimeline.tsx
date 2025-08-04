import React from 'react';
import { Box, Button, Typography, Step, StepButton, StepLabel, Stepper, Tooltip, styled } from '@mui/material';
import {
  DragIndicator as RankProblemsIcon,
  ThumbUp as RankInterestIcon,
  LocalActivity as RankProjectsIcon,
  GetApp as DownloadIcon,
  Check as CompletedIcon
} from '@mui/icons-material';

// Define the available application stages
export type AppStage = 'priority' | 'interest' | 'projects' | 'project-interest' | 'project-priority';

// Define user roles
export type UserRole = 'developer' | 'qm' | 'dev tl' | 'qm tl' | 'tltl' | 'uxd' | 'customer' | 'other';

// Styled components for timeline

// Container for timeline elements
const TimelineContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end', // Align to right side
  width: '100%',
  padding: theme.spacing(0.5, 0), // Add vertical padding
  margin: 0, // Remove all margins
}));

// Button spacing to match column padding
const NavButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  padding: theme.spacing(0.25, 1), // Reduce vertical padding
  margin: theme.spacing(0, 0.25), // Make horizontal spacing tighter
  minWidth: 'auto',
  height: '40px', // Slightly smaller height
  fontSize: '0.75rem',
  textTransform: 'none',
  fontWeight: 'bold',
}));

// Icon container for buttons
const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(0.5), // Reduce right margin
}));

// Stage definition interface
interface StageDefinition {
  value: AppStage;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}

// Props for the RoleBasedTimeline component
interface RoleBasedTimelineProps {
  // User information
  userRole: string | null;
  canHelpNextQuarter: boolean | null;
  
  // Current stage and navigation
  activeStage: AppStage;
  onStageSelect: (stage: AppStage) => void;
  
  // Completion data
  completedStages: AppStage[];
  
  // Problem stage metrics
  problemRankCount: number;
  problemTotal: number;
  problemAppetiteCount: number;
  problemInterestCount: number;
  
  // Project stage metrics
  projectRankCount: number;
  projectTotal: number;
  projectInterestCount: number;
  
  // Finish action
  onFinish: () => void;
  
  // Current app stage (problems or projects)
  currentAppStage: 'problems' | 'projects';
}

/**
 * A unified timeline component that handles role-based section visibility and progression
 * based on completion thresholds and user roles.
 */
export const RoleBasedTimeline: React.FC<RoleBasedTimelineProps> = ({
  userRole,
  canHelpNextQuarter,
  activeStage,
  onStageSelect,
  completedStages,
  problemRankCount,
  problemTotal,
  problemAppetiteCount,
  problemInterestCount,
  projectRankCount,
  projectTotal,
  projectInterestCount,
  onFinish,
  currentAppStage
}) => {
  // Normalize role name for consistent comparison
  const normalizeRoleName = (role: string | null): string => {
    if (!role) return '';
    return role.toLowerCase().trim();
  };
  
  // Determine user role
  const normalizedRole = normalizeRoleName(userRole);
  const isDeveloper = normalizedRole === 'developer';
  const isQM = normalizedRole === 'qm';
  const isDevTL = normalizedRole === 'dev tl' || normalizedRole === 'dev-tl';
  const isQMTL = normalizedRole === 'qm tl' || normalizedRole === 'qm-tl';
  const isUXD = normalizedRole === 'uxd';
  const isTLTL = normalizedRole === 'tltl';
  const isCustomer = normalizedRole === 'customer';
  
  // Check if we're in Stage 2 (projects)
  const isInStage2 = currentAppStage === 'projects';
  
  // Calculate completion thresholds (50% required)
  const problemMinimum = Math.ceil(problemTotal / 2);
  const projectMinimum = Math.ceil(projectTotal / 2);
  
  // Calculate completion status for different sections
  const isProblemRankingComplete = problemRankCount >= problemMinimum && 
                                  problemAppetiteCount >= problemMinimum;
  const isProblemInterestComplete = problemInterestCount >= problemMinimum;
  const isProjectRankingComplete = projectRankCount >= projectMinimum;
  const isProjectInterestComplete = projectInterestCount >= projectMinimum;
  
  // Define which stages should be visible based on user role and app stage
  
  // Problem Interest should only be visible for Developers who can help next quarter in Stage 1
  const shouldShowProblemInterest = !isInStage2 && isDeveloper && canHelpNextQuarter === true;
  
  // Project Interest has more complex visibility rules:
  // - In Stage 2, visible for Devs who can help next quarter
  // - In Stage 2, visible for QMs who can help next quarter 
  // - In Stage 2, visible for Dev TLs who can help next quarter
  const shouldShowProjectInterest = isInStage2 && canHelpNextQuarter === true && 
                                   (isDeveloper || isQM || isDevTL);
  
  /**
   * Determine if a user can access a particular stage based on user role, app stage, and completion status
   * This implements the precise progression rules for each role as specified in the requirements
   */
  const canAccessStage = (stage: AppStage): boolean => {
    // Always block cross-stage navigation
    // In Stage 2, block access to Stage 1 views
    if (isInStage2 && (stage === 'priority' || stage === 'interest')) {
      return false;
    }
    
    // In Stage 1, block access to Stage 2 views
    if (!isInStage2 && (stage === 'projects' || stage === 'project-interest' || stage === 'project-priority')) {
      return false;
    }
    
    // === Priority (Rank Problems) Section ===
    // All users can access the priority stage in Stage 1
    if (stage === 'priority' && !isInStage2) return true;
    
    // === Projects (Rank Projects) Section ===
    // All users can access the projects stage in Stage 2
    // Also handle project-priority as an alias for projects
    if ((stage === 'projects' || stage === 'project-priority') && isInStage2) return true;
    
    // === Problem Interest Section (Stage 1) ===
    // Only available to Devs who can help next quarter AND have completed problem ranking
    if (stage === 'interest') {
      // Support returning to section if user has already made some progress
      if (problemInterestCount > 0) {
        return isDeveloper && canHelpNextQuarter === true;
      }
      
      // Initial access requires completing problem ranking first
      return isDeveloper && canHelpNextQuarter === true && isProblemRankingComplete;
    }
    
    // === Project Interest Section (Stage 2) ===
    // Available to Devs, QMs, and Dev TLs who can help next quarter
    // AND have completed project ranking
    if (stage === 'project-interest') {
      // If they've already completed some project interest votes, always allow access
      // This ensures they can go back to this section without losing progress
      if (projectInterestCount > 0) {
        return (isDeveloper || isQM || isDevTL) && canHelpNextQuarter === true;
      }
      
      // Initial access requires completing project ranking first
      return (isDeveloper || isQM || isDevTL) && 
             canHelpNextQuarter === true && 
             isProjectRankingComplete;
    }
    
    return false;
  };
  
  /**
   * Determine if the Finish button should be enabled based on user role and completion status
   * This implements the precise rules for each role as specified in the requirements
   */
  const isFinishEnabled = (): boolean => {
    // === Stage 1: Problems ===
    if (!isInStage2) {
      // === Dev who CAN help next quarter ===
      // Must complete problem ranking AND problem interest
      if (isDeveloper && canHelpNextQuarter === true) {
        return isProblemRankingComplete && isProblemInterestComplete;
      }
      
      // === All other roles or users who CANNOT help next quarter ===
      // Only need to complete problem ranking
      return isProblemRankingComplete;
    }
    
    // === Stage 2: Projects ===
    else {
      // === QM who CAN help next quarter ===
      // Only need to complete project ranking (per requirement)
      if (isQM && canHelpNextQuarter === true) {
        return isProjectRankingComplete;
      }
      
      // === Dev who CAN help next quarter ===
      // Need to complete both project ranking AND project interest
      if (isDeveloper && canHelpNextQuarter === true) {
        return isProjectRankingComplete && isProjectInterestComplete;
      }
      
      // === Dev TL who CAN help next quarter ===
      // Need to complete both project ranking AND project interest
      if (isDevTL && canHelpNextQuarter === true) {
        return isProjectRankingComplete && isProjectInterestComplete;
      }
      
      // === All other roles or users who CANNOT help next quarter ===
      // Only need to complete project ranking
      return isProjectRankingComplete;
    }
  };
  
  // Calculate progress percentages for visualization
  const getProgressPercentage = (stage: AppStage): number => {
    switch (stage) {
      case 'priority':
        // Average of rank and appetite progress
        const rankProgress = problemRankCount / problemTotal;
        const appetiteProgress = problemAppetiteCount / problemTotal;
        return Math.min(((rankProgress + appetiteProgress) / 2) * 100, 100);
        
      case 'interest':
        return Math.min((problemInterestCount / problemTotal) * 100, 100);
        
      case 'projects':
        return Math.min((projectRankCount / projectTotal) * 100, 100);
        
      case 'project-interest':
        return Math.min((projectInterestCount / projectTotal) * 100, 100);
        
      default:
        return 0;
    }
  };
  
  /**
   * Get tooltip text for a stage
   */
  const getTooltipText = (stage: AppStage): string => {
    // If stage cannot be accessed
    if (!canAccessStage(stage)) {
      if (isInStage2 && (stage === 'priority' || stage === 'interest')) {
        return "Cannot return to Problem stage from Project stage";
      }
      
      if (!isInStage2 && (stage === 'projects' || stage === 'project-interest')) {
        return "Cannot access Project stage yet";
      }
      
      const progress = Math.floor(getProgressPercentage(
        stage === 'interest' ? 'priority' :
        stage === 'project-interest' ? 'projects' : stage
      ));
      
      return `Complete 50% of previous section first (Current: ${progress}%)`;
    }
    
    // If stage is active or completed
    if (activeStage === stage || completedStages.includes(stage)) {
      return "";
    }
    
    // Default tooltips
    switch (stage) {
      case 'priority':
        return "Rank problems by priority and assign appetites";
      case 'interest':
        return "Indicate your interest in problems";
      case 'projects':
        return "Rank projects by priority";
      case 'project-interest':
        return "Indicate your interest in projects";
      default:
        return "";
    }
  };
  
  // Define all possible stages
  const allStages: StageDefinition[] = [
    {
      value: 'priority',
      label: 'Rank Problems',
      icon: <RankProblemsIcon fontSize="small" />,
      tooltip: "Rank problems by priority and assign appetites"
    },
    {
      value: 'interest',
      label: 'Problem Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: "Indicate your interest in problems"
    },
    {
      value: 'projects',
      label: 'Rank Projects',
      icon: <RankProjectsIcon fontSize="small" />,
      tooltip: "Rank projects by priority"
    },
    {
      value: 'project-interest',
      label: 'Project Interest',
      icon: <RankInterestIcon fontSize="small" />,
      tooltip: "Indicate your interest in projects"
    }
  ];
  
  // Filter stages based on current app stage and user role
  const visibleStages: StageDefinition[] = allStages.filter(stage => {
    // In Stage 1, only show Problem stages
    if (!isInStage2) {
      if (stage.value === 'projects' || stage.value === 'project-interest') {
        return false;
      }
      
      // Only show Problem Interest for Devs who can help
      if (stage.value === 'interest' && !shouldShowProblemInterest) {
        return false;
      }
      
      return true;
    }
    // In Stage 2, only show Project stages
    else {
      if (stage.value === 'priority' || stage.value === 'interest') {
        return false;
      }
      
      // Only show Project Interest for specific roles who can help
      if (stage.value === 'project-interest' && !shouldShowProjectInterest) {
        return false;
      }
      
      return true;
    }
  });
  
  return (
    <TimelineContainer>
      {/* Render visible stages */}
      {visibleStages.map((stage) => {
        const isCompleted = completedStages.includes(stage.value);
        const isActive = activeStage === stage.value;
        const canAccess = canAccessStage(stage.value);
        const progress = getProgressPercentage(stage.value);
        const isHalfComplete = progress >= 50;
        
        // Determine button styling based on state
        const buttonVariant = isActive ? "contained" : "outlined";
        const buttonColor = isCompleted ? "success" : isActive ? "primary" : "inherit";
        const buttonOpacity = canAccess ? 1 : 0.6;
        
        // Determine tooltip text
        const tooltipText = !canAccess
          ? "Complete previous steps first"
          : isCompleted && !isActive
            ? "Return to this section"
            : isActive
              ? "Current section"
              : stage.tooltip;
              
        return (
          <Tooltip key={stage.value} title={tooltipText}>
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
                  position: 'relative',
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
                  } : {}
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Label and indicator */}
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isCompleted && !isActive && (
                      <CompletedIcon fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: isActive ? 'bold' : 'normal' }}>
                      {stage.label}
                    </Typography>
                  </Box>
                  
                  {/* Progress counter */}
                  <Box sx={{ 
                    fontSize: '0.65rem', 
                    opacity: 0.9,
                    color: isHalfComplete ? 'success.main' : 'inherit',
                    fontWeight: isHalfComplete ? 'bold' : 'normal',
                    mt: 0.2,
                  }}>
                    {stage.value === 'priority' && `${problemRankCount}/${problemTotal}`}
                    {stage.value === 'interest' && `${problemInterestCount}/${problemTotal}`}
                    {stage.value === 'projects' && `${projectRankCount}/${projectTotal}`}
                    {stage.value === 'project-interest' && `${projectInterestCount}/${projectTotal}`}
                  </Box>
                </Box>
              </NavButton>
            </span>
          </Tooltip>
        );
      })}
      
      {/* Finish button */}
      <Tooltip title={!isFinishEnabled() ? "Complete required fields first" : "Finish and export results"}>
        <span>
          <NavButton
            variant={isFinishEnabled() ? "contained" : "outlined"}
            color={isFinishEnabled() ? "secondary" : "inherit"}
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={onFinish}
            disabled={!isFinishEnabled()}
            sx={{ 
              opacity: isFinishEnabled() ? 1 : 0.5,
              ml: 1,
              boxShadow: isFinishEnabled() ? 2 : 0,
            }}
          >
            <Typography variant="body2">Finish</Typography>
          </NavButton>
        </span>
      </Tooltip>
    </TimelineContainer>
  );
};

export default RoleBasedTimeline;
