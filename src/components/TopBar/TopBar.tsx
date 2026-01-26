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
  FormatListNumbered as RankedIcon,
  RestartAlt as ResetIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ThumbUp as InterestIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';


interface TopBarProps {
  voterName: string | null;
  totalPitchCount: number;
  rankCount: number;
  interestCount: number;
  onFinish: () => void;
  isExportEnabled: boolean;
  onHelpClick: () => void;
  onResetClick: () => void;
  stage: 'priority' | 'interest';
  onNextStage: () => void;
  canAccessInterestStage: boolean;
  priorityStageComplete: boolean;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ 
  voterName, 
  totalPitchCount, 
  rankCount, 
  interestCount,
  onFinish, 
  isExportEnabled,
  onHelpClick,
  onResetClick,
  stage,
  onNextStage,
  canAccessInterestStage,
  priorityStageComplete,
  themeMode,
  onToggleTheme
}: TopBarProps) => {
  return (
    <AppBar
      position="sticky"
      color="default"
      sx={(theme) => ({
        height: 48,
        bgcolor: theme.palette.mode === 'light' ? '#e0e0e0' : theme.palette.background.paper,
        color: 'text.primary'
      })}
    >
      <Toolbar sx={{ minHeight: '48px !important', py: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ResetIcon />}
            onClick={onResetClick}
            aria-label="Reset all votes"
            sx={{
              mr: 2,
              height: 32, // Smaller reset button
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.08)'
              }
            }}
          >
            Reset
          </Button>
          
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

          {onToggleTheme && (
            <Tooltip title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton
                color="inherit"
                onClick={onToggleTheme}
                sx={{ ml: 1 }}
                aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', gap: 1 }}>
            {stage === 'priority' ? (
              <>
                <Box 
                  component="span" 
                  sx={{ 
                    color: rankCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                    fontWeight: rankCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
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
                  color: interestCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                  fontWeight: interestCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                  transition: 'all 0.2s ease'
                }}
              >
                <InterestIcon sx={{ fontSize: '1.4rem' }} />
                <span>Interests {interestCount}/{totalPitchCount}</span>
              </Box>
            )}
          </Typography>
        </Box>
        {/* Only show the interest section button if the user has access to it */}
        {(canAccessInterestStage || stage === 'interest') && (
          <Tooltip title={
            stage === 'priority' && !canAccessInterestStage ? 
              "Only developers who have indicated availability can rank interest" : 
            stage === 'priority' && !priorityStageComplete ? 
              "You must complete priority rankings first" : 
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
                  bgcolor: (theme) =>
                    stage === 'priority'
                      ? (theme.palette.mode === 'light' ? '#ce93d8' : '#9c27b0')
                      : (theme.palette.mode === 'light' ? '#64b5f6' : '#1976d2'),
                  '&:hover': {
                    bgcolor: (theme) =>
                      stage === 'priority'
                        ? (theme.palette.mode === 'light' ? '#ba68c8' : '#7b1fa2')
                        : (theme.palette.mode === 'light' ? '#42a5f5' : '#1565c0')
                  }
                }}
              >
                {stage === 'priority' ? 'Next: Rank Interest' : 'Previous: Rank Priority'}
              </Button>
            </span>
          </Tooltip>
        )}
        
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
