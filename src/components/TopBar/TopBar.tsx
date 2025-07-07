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
import type { Vote } from '../../types/models';

interface TopBarProps {
  voterName: string;
  votes: Record<string, Vote>;
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  onExport: () => void;
  isExportEnabled: boolean;
  onHelpClick: () => void;
  onResetClick: () => void;
  stage: 'priority' | 'interest';
  needsInterestRanking: boolean | null;
  onNextStage?: () => void;
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
  onExport, 
  isExportEnabled,
  onHelpClick,
  onResetClick,
  stage,
  needsInterestRanking,
  onNextStage,
  priorityStageComplete
}: TopBarProps) => {
  return (
    <AppBar position="sticky" sx={{ height: 64 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="div">
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
              height: 36, // Match export button height
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.08)'
              }
            }}
          >
            Reset
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', gap: 1 }}>
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
        {needsInterestRanking && priorityStageComplete && (
          <Button
            variant="contained"
            color={stage === 'priority' ? 'secondary' : 'primary'}
            startIcon={stage === 'priority' ? <NextIcon /> : <PrevIcon />}
            onClick={onNextStage}
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
        )}
        
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!isExportEnabled}
          onClick={onExport}
          aria-label="Export results to CSV"
          sx={{
            fontWeight: isExportEnabled ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            '&:not(:disabled)': {
              boxShadow: 3
            }
          }}
        >
          Export CSV
        </Button>
      </Toolbar>
    </AppBar>
  );
};
