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
export type AppStage = 'priority' | 'interest' | 'project-interest' | 'projects';

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
  isExportEnabled
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

  // Determine if we need to show finish button before projects stage or at the end
  const showFinishBeforeProjects = activeStage !== 'projects';
  
  // Determine if we're currently in Stage 2 based on app config
  const isInStage2 = APP_CONFIG.CURRENT_APP_STAGE === 'projects';
  
  // Helper function to get tooltip text based on stage accessibility
  const getTooltipText = (stage: AppStage, canAccess: boolean, isActive: boolean, isCompleted: boolean): string => {
    // If in Stage 2, block access to Stage 1 views
    const isStage1View = stage === 'priority' || stage === 'interest';
    
    if (!canAccess) {
      // Show specific message when trying to access Stage 1 from Stage 2
      if (isInStage2 && isStage1View) {
        return "Cannot return to Stage 1 views from Stage 2";
      }
      return "Complete previous steps first";
    }
    
    // No tooltip when already on this stage or completed
    if (isCompleted || isActive) return "";
    
    // Default tooltip from stage definition
    return stages.find(s => s.value === stage)?.tooltip || "";
  };
  
  // Create a compact version of the timeline
  return (
    <Box sx={{ 
      width: '100%', 
      my: 0,
      display: 'flex',
      justifyContent: 'center', // Center the stepper
    }}>
      <CustomStepper 
        activeStep={activeStageIndex} 
        alternativeLabel
        sx={{ 
          maxWidth: '600px', // Hard limit on width
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
        {/* First two stages (always shown) */}
        {stages.slice(0, 2).map((stage) => {
          const isCompleted = completedStages.includes(stage.value);
          const isActive = activeStage === stage.value;
          const canAccess = canAccessStage(stage.value);
          
          return (
            <Step key={stage.value} completed={isCompleted}>
              <Tooltip title={
                !canAccess 
                  ? "Complete previous steps first" 
                  : isCompleted || isActive 
                    ? "" 
                    : stage.tooltip
              }>
                <span>
                  <StepButton
                    onClick={() => canAccess && onStageSelect(stage.value)}
                    disabled={!canAccess}
                    icon={
                      <StepIconContainer
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: isActive 
                            ? 'primary.main' 
                            : isCompleted 
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
                          fontWeight: isActive ? 'bold' : 'normal',
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
        
        {/* Contextual Finish button - shown between Interest and Projects when in early stages */}
        {showFinishBeforeProjects && (
          <Step key="finish-middle">
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
        
        {/* Projects stage */}
        {stages.slice(2).map((stage) => {
          const isCompleted = completedStages.includes(stage.value);
          const isActive = activeStage === stage.value;
          const canAccess = canAccessStage(stage.value);
          
          return (
            <Step key={stage.value} completed={isCompleted}>
              <Tooltip title={
                !canAccess 
                  ? "Complete previous steps first" 
                  : isCompleted || isActive 
                    ? "" 
                    : stage.tooltip
              }>
                <span>
                  <StepButton
                    onClick={() => canAccess && onStageSelect(stage.value)}
                    disabled={!canAccess}
                    icon={
                      <StepIconContainer
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: isActive 
                            ? 'primary.main' 
                            : isCompleted 
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
                          fontWeight: isActive ? 'bold' : 'normal',
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
        
        {/* Contextual Finish button - shown at the end when in Projects stage */}
        {!showFinishBeforeProjects && (
          <Step key="finish-end">
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
