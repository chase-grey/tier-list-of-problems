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
  GetApp as DownloadIcon,
  HelpOutline as HelpIcon,
  RestaurantMenu as AppetiteIcon,
  FormatListNumbered as RankedIcon,
  RestartAlt as ResetIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ThumbUp as InterestIcon
} from '@mui/icons-material';


interface TopBarProps {
  voterName: string | null;
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  onFinish: () => void;
  isExportEnabled: boolean;
  onHelpClick: () => void;
  onResetClick: () => void;
  stage: 'priority' | 'interest';
  onNextStage: () => void;
  canAccessInterestStage: boolean;
  priorityStageComplete: boolean;
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ 
  voterName, 
  totalPitchCount, 
  appetiteCount, 
  rankCount, 
  onFinish, 
  isExportEnabled,
  onHelpClick,
  onResetClick,
  stage,
  onNextStage,
  canAccessInterestStage,
  priorityStageComplete
}: TopBarProps) => {
  return (
    <AppBar position="sticky" sx={{ height: 48 }}>
      <Toolbar sx={{ minHeight: '48px !important', py: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="subtitle1" component="div">
            Problem Polling: {voterName}
          </Typography>
          
          <Tooltip title="View Instructions">
            <IconButton 
              color="inherit" 
              onClick={onHelpClick}
              sx={{ ml: 2 }}
              aria-label="Help"
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<ResetIcon />}
            onClick={onResetClick}
            aria-label="Reset all votes"
            sx={{
              ml: 2,
              height: 32, // Smaller reset button
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.08)'
              }
            }}
          >
            Reset
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', gap: 1 }}>
            {stage === 'priority' ? (
              <>
                <Box 
                  component="span" 
                  sx={{ 
                    color: appetiteCount === totalPitchCount ? '#4caf50' : 'inherit',
                    fontWeight: appetiteCount === totalPitchCount ? 'bold' : 'normal',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <AppetiteIcon sx={{ fontSize: '1.4rem' }} />
                  <span>Appetites {appetiteCount}/{totalPitchCount}</span>
                </Box>
                <Box component="span">•</Box>
                <Box 
                  component="span" 
                  sx={{ 
                    color: rankCount === totalPitchCount ? '#4caf50' : 'inherit',
                    fontWeight: rankCount === totalPitchCount ? 'bold' : 'normal',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <RankedIcon sx={{ fontSize: '1.4rem' }} />
                  <span>Ranked {rankCount}/{totalPitchCount}</span>
                </Box>
              </>
            ) : (
              <Box 
                component="span" 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: '#4caf50', // Always green when in interest stage since cards are defaulted
                  fontWeight: 'bold'
                }}
              >
                <InterestIcon sx={{ fontSize: '1.4rem' }} />
                <span>Ranking Interest Levels</span>
              </Box>
            )}
          </Typography>
        </Box>
        <Tooltip title={
          stage === 'priority' && !canAccessInterestStage ? 
            "Only QM, developers, QM TLs, and dev TLs who have indicated availability can rank interest" : 
            stage === 'priority' && !priorityStageComplete ? 
            "You must complete all appetites and priority rankings first" : 
            ""
        } arrow placement="bottom">
          <span> {/* Wrapper needed for disabled button tooltips */}
            <Button
              variant="contained"
              color={stage === 'priority' ? 'secondary' : 'primary'}
              startIcon={stage === 'priority' ? <NextIcon /> : <PrevIcon />}
              onClick={onNextStage}
              disabled={stage === 'priority' && (!canAccessInterestStage || !priorityStageComplete)}
              sx={{
                mr: 2,
                // Use purple for interest stage button, blue for priority stage button
                bgcolor: stage === 'priority' ? '#9c27b0' : '#1976d2',
                '&:hover': {
                  bgcolor: stage === 'priority' ? '#7b1fa2' : '#1565c0'
                }
              }}
            >
              {stage === 'priority' ? 'Next: Rank Interest' : 'Previous: Rank Priority'}
            </Button>
          </span>
        </Tooltip>
        
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!isExportEnabled}
          onClick={onFinish}
          aria-label="Finish and export results"
          sx={{
            fontWeight: isExportEnabled ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            '&:not(:disabled)': {
              boxShadow: 3
            }
          }}
        >
          Finish
        </Button>
      </Toolbar>
    </AppBar>
  );
};
