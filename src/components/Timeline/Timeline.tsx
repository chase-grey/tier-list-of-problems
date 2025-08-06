import React from 'react';
import { Box, Stepper, Step, StepLabel, StepButton, Tooltip, styled } from '@mui/material';
import {
  DragIndicator as RankProblemsIcon,
  ThumbUp as RankInterestIcon,
  LocalActivity as RankProjectsIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { APP_CONFIG } from '../../components/App';

// Define the available application stages
export type AppStage = 'priority' | 'interest' | 'project-interest' | 'project-priority' | 'projects';

// Styled components for customized timeline
const CustomStepper = styled(Stepper)(({ theme }) => ({
  backgroundColor: 'transparent',
  padding: theme.spacing(0.5, 0),
  width: '100%',
  '& .MuiStepConnector-line': {
    minHeight: 8, // Shorter connector line
  },
  '& .MuiStepConnector-root': {
    top: 14, // Properly align connector with icons
  },
  '& .MuiStep-root': {
    padding: '0 8px', // Reduce horizontal padding between steps
  },
}));

const StepIconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

// Props for the Timeline component
interface TimelineProps {
  activeStage: AppStage;
  completedStages: AppStage[];
  onStageSelect: (stage: AppStage) => void;
  canAccessStage: (stage: AppStage) => boolean;
  onFinish: () => void;
  isExportEnabled: boolean;
  userRole: string | null; // Added to determine which sections to show based on role
  canHelpNextQuarter: boolean | null; // Added to determine if the user can help next quarter
  // Progress tracking for different sections
  problemProgress: { ranked: number; total: number; };
  problemInterestProgress?: { completed: number; total: number; };
  projectProgress?: { ranked: number; total: number; };
  projectInterestProgress?: { completed: number; total: number; };
}

/**
 * Timeline component that shows all voting stages and allows navigation
 */
export const Timeline: React.FC<TimelineProps> = ({
  activeStage,
  completedStages,
  onStageSelect,
  canAccessStage,
  onFinish,
  isExportEnabled,
  userRole,
  canHelpNextQuarter,
  problemProgress,
  problemInterestProgress,
  projectProgress,
  projectInterestProgress
}) => {
  // Define all stages with their labels and icons
  const stages: Array<{
    value: AppStage;
    label: string;
    icon: React.ReactNode;
    tooltip: string;
  }> = [
    {
      value: 'priority',
      label: 'Rank Problems',
      icon: <RankProblemsIcon />,
      tooltip: 'Prioritize problems and assign appetites'
    },
    {
      value: 'interest',
      label: 'Problem Interest',
      icon: <RankInterestIcon />,
      tooltip: 'Indicate your interest level in problems'
    },
    {
      value: 'projects',
      label: 'Rank Projects',
      icon: <RankProjectsIcon />,
      tooltip: 'Prioritize projects based on previous rankings'
    },
    {
      value: 'project-interest',
      label: 'Project Interest',
      icon: <RankInterestIcon />,
      tooltip: 'Indicate your interest level in projects'
    }
  ];

  // Get the index of the active stage
  const activeStageIndex = stages.findIndex(s => s.value === activeStage);
  
  // Determine if we're currently in Stage 2 based on app config
  const isInStage2 = APP_CONFIG.CURRENT_APP_STAGE === 'projects';
  
  // Helper functions to determine section completion status
  const getSectionCompletionStatus = (stage: AppStage): { 
    isCompleted: boolean; 
    isActive: boolean; 
    canAccess: boolean;
    progress: number; // 0 to 1
  } => {
    const isCompleted = completedStages.includes(stage);
    const isActive = activeStage === stage;
    const canAccess = canAccessStage(stage);
    
    // Calculate progress based on section
    let progress = 0;
    if (stage === 'priority' && problemProgress) {
      progress = problemProgress.ranked / (problemProgress.total * 2); // Count both rank and appetite
    } else if (stage === 'interest' && problemInterestProgress) {
      progress = problemInterestProgress.completed / problemInterestProgress.total;
    } else if (stage === 'projects' && projectProgress) {
      progress = projectProgress.ranked / projectProgress.total;
    } else if (stage === 'project-interest' && projectInterestProgress) {
      progress = projectInterestProgress.completed / projectInterestProgress.total;
    }
    
    // Cap progress at 1 (100%)
    progress = Math.min(progress, 1);
    
    return { isCompleted, isActive, canAccess, progress };
  };
  
  // Determine if user role should see problem interest
  const shouldShowProblemInterest = userRole?.toLowerCase() === 'developer' && canHelpNextQuarter === true;
  
  // Determine if user role should see project interest (devs, QMs, or dev TLs who can help)
  const normalizedRole = userRole?.toLowerCase() || '';
  const isDeveloper = normalizedRole === 'developer';
  const isQM = normalizedRole === 'qm';
  const isDevTL = normalizedRole === 'dev tl' || normalizedRole === 'dev-tl';
  const shouldShowProjectInterest = (isDeveloper || isQM || isDevTL) && canHelpNextQuarter === true;
  
  // Helper function to get tooltip text based on stage accessibility and progress
  const getTooltipText = (stage: AppStage): string => {
    const status = getSectionCompletionStatus(stage);
    const isStage1View = stage === 'priority' || stage === 'interest';
    
    if (!status.canAccess) {
      // Show specific message when trying to access Stage 1 from Stage 2
      if (isInStage2 && isStage1View) {
        return "Cannot return to Stage 1 views from Stage 2";
      }
      // Show progress-based message
      const threshold = Math.floor(status.progress * 100);
      return `Complete at least 50% of previous section (Current: ${threshold}%)`;
    }
    
    // No tooltip when already on this stage or completed
    if (status.isCompleted || status.isActive) return "";
    
    // Default tooltip from stage definition
    return stages.find(s => s.value === stage)?.tooltip || "";
  };
  
  // Create a compact version of the timeline with conditional sections based on user role
  return (
    <Box sx={{ 
      width: '100%', 
      my: 0,
      display: 'flex',
      justifyContent: 'center', // Center the stepper
    }}>
      <CustomStepper 
        alternativeLabel
        activeStep={activeStageIndex} 
        sx={{ 
          maxWidth: '800px', // Increased to accommodate additional sections
          width: 'auto',
          '& .MuiStepLabel-label': { 
            fontSize: '0.7rem',
            mt: 0.25,
            lineHeight: 1,
            whiteSpace: 'nowrap', // Prevent text wrapping
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '70px', // Limit label width
          },
          '& .MuiStepButton-root': {
            py: 0.25,
            px: 0.25,
            minWidth: 0, // Allow steps to shrink
            maxWidth: '80px', // Maximum width per step
          },
          '& .MuiStepLabel-iconContainer': {
            padding: 0, // Remove padding around icon container
            mr: 0.5, // Reduce right margin
          }
        }}
      >
        {/* === RANK PROBLEMS === */}
        {/* Always show in Stage 1, show as completed in Stage 2 */}
        {(isInStage2 ? [stages[0]] : [stages[0]]).map((stage) => {
          const status = getSectionCompletionStatus(stage.value);
          
          return (
            <Step key={stage.value} completed={status.isCompleted}>
              <Tooltip title={getTooltipText(stage.value)}>
                <span>
                  <StepButton
                    onClick={() => status.canAccess && onStageSelect(stage.value)}
                    disabled={!status.canAccess}
                    icon={
                      <StepIconContainer
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: status.isActive 
                            ? 'primary.main' 
                            : status.isCompleted 
                              ? 'success.main' 
                              : 'grey.400',
                          fontSize: '0.75rem', // Ensure consistent spacing
                        }}
                      >
                        {stage.icon}
                      </StepIconContainer>
                    }
                  >
                    <StepLabel
                      sx={{
                        '& .MuiStepLabel-label': {
                          fontWeight: status.isActive ? 'bold' : 'normal',
                        }
                      }}
                    >
                      {stage.label}
                    </StepLabel>
                  </StepButton>
                </span>
              </Tooltip>
            </Step>
          );
        })}
        
        {/* === PROBLEM INTEREST === */}
        {/* Only show for developers who can help next quarter in Stage 1 */}
        {!isInStage2 && shouldShowProblemInterest && (
          <Step key="interest" completed={completedStages.includes('interest')}>
            {(() => {
              const status = getSectionCompletionStatus('interest');
              return (
                <Tooltip title={getTooltipText('interest')}>
                  <span>
                    <StepButton
                      onClick={() => status.canAccess && onStageSelect('interest')}
                      disabled={!status.canAccess}
                      icon={
                        <StepIconContainer
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: status.isActive 
                              ? 'primary.main' 
                              : status.isCompleted 
                                ? 'success.main' 
                                : 'grey.400',
                            fontSize: '0.75rem',
                          }}
                        >
                          {stages[1].icon}
                        </StepIconContainer>
                      }
                    >
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: status.isActive ? 'bold' : 'normal',
                          }
                        }}
                      >
                        {stages[1].label}
                      </StepLabel>
                    </StepButton>
                  </span>
                </Tooltip>
              );
            })()} 
          </Step>
        )}
        
        {/* === FINISH BUTTON FOR STAGE 1 === */}
        {!isInStage2 && (
          <Step key="finish-stage1">
            <Tooltip title={!isExportEnabled ? "Complete required fields first" : "Finish and export results"}>
              <span>
                <StepButton
                  onClick={onFinish}
                  disabled={!isExportEnabled}
                  icon={
                    <StepIconContainer
                      sx={{
                        width: 26,
                        height: 26,
                        bgcolor: isExportEnabled ? 'secondary.main' : 'grey.400',
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </StepIconContainer>
                  }
                >
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: isExportEnabled ? 'bold' : 'normal',
                        color: isExportEnabled ? 'secondary.main' : 'inherit',
                      }
                    }}
                  >
                    Finish
                  </StepLabel>
                </StepButton>
              </span>
            </Tooltip>
          </Step>
        )}
        
        {/* === RANK PROJECTS === */}
        {/* Show in Stage 2 */}
        {isInStage2 && (
          <Step key="projects" completed={completedStages.includes('projects')}>
            {(() => {
              const status = getSectionCompletionStatus('projects');
              return (
                <Tooltip title={getTooltipText('projects')}>
                  <span>
                    <StepButton
                      onClick={() => status.canAccess && onStageSelect('projects')}
                      disabled={!status.canAccess}
                      icon={
                        <StepIconContainer
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: status.isActive 
                              ? 'primary.main' 
                              : status.isCompleted 
                                ? 'success.main' 
                                : 'grey.400',
                            fontSize: '0.75rem',
                          }}
                        >
                          {stages[2].icon}
                        </StepIconContainer>
                      }
                    >
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: status.isActive ? 'bold' : 'normal',
                          }
                        }}
                      >
                        {stages[2].label}
                      </StepLabel>
                    </StepButton>
                  </span>
                </Tooltip>
              );
            })()}
          </Step>
        )}
        
        {/* === PROJECT INTEREST === */}
        {/* Only shown to users who can help next quarter in Stage 2 */}
        {isInStage2 && shouldShowProjectInterest && (
          <Step key="project-interest" completed={completedStages.includes('project-interest')}>
            {(() => {
              const status = getSectionCompletionStatus('project-interest');
              return (
                <Tooltip title={getTooltipText('project-interest')}>
                  <span>
                    <StepButton
                      onClick={() => status.canAccess && onStageSelect('project-interest')}
                      disabled={!status.canAccess}
                      icon={
                        <StepIconContainer
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: status.isActive 
                              ? 'primary.main' 
                              : status.isCompleted 
                                ? 'success.main' 
                                : 'grey.400',
                            fontSize: '0.75rem',
                          }}
                        >
                          {stages[3].icon}
                        </StepIconContainer>
                      }
                    >
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: status.isActive ? 'bold' : 'normal',
                          }
                        }}
                      >
                        {stages[3].label}
                      </StepLabel>
                    </StepButton>
                  </span>
                </Tooltip>
              );
            })()}
          </Step>
        )}
        
        {/* === FINISH BUTTON FOR STAGE 2 === */}
        {isInStage2 && (
          <Step key="finish-stage2">
            <Tooltip title={!isExportEnabled ? "Complete required fields first" : "Finish and export results"}>
              <span>
                <StepButton
                  onClick={onFinish}
                  disabled={!isExportEnabled}
                  icon={
                    <StepIconContainer
                      sx={{
                        width: 26,
                        height: 26,
                        bgcolor: isExportEnabled ? 'secondary.main' : 'grey.400',
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </StepIconContainer>
                  }
                >
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: isExportEnabled ? 'bold' : 'normal',
                        color: isExportEnabled ? 'secondary.main' : 'inherit',
                      }
                    }}
                  >
                    Finish
                  </StepLabel>
                </StepButton>
              </span>
            </Tooltip>
          </Step>
        )}
      </CustomStepper>
    </Box>
  );
};

export default Timeline;
