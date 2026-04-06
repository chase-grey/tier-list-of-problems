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
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ThumbUp as InterestIcon,
} from '@mui/icons-material';
import { SettingsMenu } from '../SettingsMenu/SettingsMenu';


interface TopBarProps {
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null;
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
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onUpdateName: (name: string) => void;
  onUpdateRole: (role: string) => void;
  onUpdateAvailability: (available: boolean) => void;
  appStage2Mode?: boolean; // True when app is in Stage 2 (interest ranking only, priority locked)
  allocationMode?: boolean; // True when in a TL allocation stage
  allocationStep?: 0 | 1;  // Which allocation step is active
  onAllocationFinish?: () => void; // Called when the allocation Finish button is clicked
  allocationFinishLabel?: string;  // Label for the allocation Finish button
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ 
  voterName,
  voterRole,
  available,
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
  onToggleTheme,
  onUpdateName,
  onUpdateRole,
  onUpdateAvailability,
  appStage2Mode = false,
  allocationMode = false,
  allocationStep = 0,
  onAllocationFinish,
  allocationFinishLabel = 'Finish Step',
}: TopBarProps) => {
  const allocationStepLabel = allocationStep === 0
    ? 'Step 1: Assign Devs'
    : 'Step 2: Assign TLs + QMs';
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
          <Typography variant="subtitle1" component="div">
            {allocationMode
              ? `TL Allocation — ${allocationStepLabel}`
              : `Problem Polling: ${voterName}`}
          </Typography>

          <Tooltip title="View Instructions">
            <IconButton color="inherit" onClick={onHelpClick} sx={{ ml: 2 }} aria-label="Help">
              <HelpIcon />
            </IconButton>
          </Tooltip>

          <SettingsMenu
            themeMode={themeMode}
            onToggleTheme={onToggleTheme}
            voterName={voterName}
            voterRole={voterRole}
            available={available}
            onUpdateName={onUpdateName}
            onUpdateRole={onUpdateRole}
            onUpdateAvailability={onUpdateAvailability}
            onResetClick={onResetClick}
          />
        </Box>

        {/* Allocation mode: Finish/Proceed button */}
        {allocationMode && onAllocationFinish && (
          <Button
            variant="contained"
            color="primary"
            onClick={onAllocationFinish}
          >
            {allocationFinishLabel}
          </Button>
        )}

        {/* Voting-only: rank / interest progress and navigation */}
        {!allocationMode && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Typography variant="body2" sx={{ display: 'flex', gap: 1 }}>
                {stage === 'priority' ? (
                  <Box component="span" sx={{
                    color: rankCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                    fontWeight: rankCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 0.5
                  }}>
                    <RankedIcon sx={{ fontSize: '1.4rem' }} />
                    <span>Ranked {rankCount}/{totalPitchCount}</span>
                  </Box>
                ) : (
                  <Box component="span" sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    color: interestCount >= Math.ceil(totalPitchCount / 2) ? '#4caf50' : 'inherit',
                    fontWeight: interestCount >= Math.ceil(totalPitchCount / 2) ? 'bold' : 'normal',
                    transition: 'all 0.2s ease'
                  }}>
                    <InterestIcon sx={{ fontSize: '1.4rem' }} />
                    <span>Interests {interestCount}/{totalPitchCount}</span>
                  </Box>
                )}
              </Typography>
            </Box>

            {!appStage2Mode && (canAccessInterestStage || stage === 'interest') && (
              <Tooltip title={
                stage === 'priority' && !canAccessInterestStage ?
                  'Only QM and dev TL roles who are available can rank interest' :
                stage === 'priority' && !priorityStageComplete ?
                  'You must complete priority rankings first' : ''
              } arrow placement="bottom">
                <span>
                  <Button
                    variant="contained"
                    color={stage === 'priority' ? 'secondary' : 'primary'}
                    startIcon={stage === 'priority' ? <NextIcon /> : <PrevIcon />}
                    onClick={onNextStage}
                    disabled={stage === 'priority' && (!canAccessInterestStage || !priorityStageComplete)}
                    sx={{
                      mr: 2,
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
                '&:not(:disabled)': { boxShadow: 3 }
              }}
            >
              Finish
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
