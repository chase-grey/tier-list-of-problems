import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  HelpOutline as HelpIcon,
  FormatListNumbered as RankedIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ThumbUp as InterestIcon,
  CheckCircle as CheckCircleIcon,
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
  onUpdateNameAndRole: (name: string, role: string) => void;
  onUpdateAvailability: (available: boolean) => void;
  appStage2Mode?: boolean;
  allocationMode?: boolean;
  allocationStep?: 0 | 1;
  onAllocationFinish?: () => void;
  allocationSaveState?: 'idle' | 'waiting' | 'saving' | 'done';
  allocationShowResults?: boolean;
  allocationHasResults?: boolean;
  onAllocationViewSummary?: () => void;
  onAllocationBackToEdit?: () => void;
  votingLoading?: boolean;
  submitState?: 'idle' | 'submitted' | 'changed';
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
  onUpdateNameAndRole,
  onUpdateAvailability,
  appStage2Mode = false,
  allocationMode = false,
  allocationStep = 0,
  onAllocationFinish,
  allocationSaveState = 'idle',
  allocationShowResults = false,
  allocationHasResults = false,
  onAllocationViewSummary,
  onAllocationBackToEdit,
  votingLoading = false,
  submitState = 'idle',
}: TopBarProps) => {
  const appTitle = allocationMode
    ? (allocationStep === 0 ? 'Stage 2: Dev Matching' : 'Stage 4: Team Matching')
    : appStage2Mode ? 'Stage 3: Interest Voting' : 'Stage 1: Priority Voting';
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
            {appTitle}
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
            onUpdateNameAndRole={onUpdateNameAndRole}
            onUpdateAvailability={onUpdateAvailability}
            onResetClick={onResetClick}
          />
        </Box>

        {/* Allocation mode: nav + finish buttons */}
        {allocationMode && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {allocationShowResults && onAllocationBackToEdit && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<PrevIcon />}
                onClick={onAllocationBackToEdit}
              >
                Back to editing
              </Button>
            )}
            {allocationHasResults && !allocationShowResults && onAllocationViewSummary && (
              <Button
                variant="outlined"
                color="success"
                size="small"
                onClick={onAllocationViewSummary}
              >
                View summary
              </Button>
            )}
            {onAllocationFinish && (
              <Tooltip
                title={allocationSaveState === 'waiting' ? 'Sheet is busy — retrying automatically…' : ''}
                placement="bottom"
              >
                <span>
                  <Button
                    variant="contained"
                    color={
                      allocationSaveState === 'done' ? 'success' :
                      allocationSaveState === 'waiting' ? 'warning' :
                      'secondary'
                    }
                    startIcon={
                      allocationSaveState === 'saving' || allocationSaveState === 'waiting'
                        ? <CircularProgress size={16} color="inherit" />
                        : allocationSaveState === 'done' ? <CheckCircleIcon /> : <SendIcon />
                    }
                    accessKey={allocationSaveState === 'idle' ? 'f' : undefined}
                    onClick={allocationSaveState === 'idle' ? onAllocationFinish : undefined}
                    tabIndex={allocationSaveState === 'idle' ? undefined : -1}
                    aria-label="Finish and save allocation"
                    sx={{
                      fontWeight: allocationSaveState === 'idle' ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      boxShadow: allocationSaveState === 'idle' ? 3 : 0,
                      pointerEvents: allocationSaveState === 'idle' ? 'auto' : 'none',
                    }}
                  >
                    {allocationSaveState === 'saving' ? 'Saving…' :
                     allocationSaveState === 'waiting' ? 'Waiting…' :
                     allocationSaveState === 'done' ? 'Finished ✓' :
                     <><u>F</u>inish</>}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
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
                    accessKey={stage === 'priority' ? 'n' : 'p'}
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
                    {stage === 'priority'
                      ? <><u>N</u>ext: Rank Interest</>
                      : <><u>P</u>revious: Rank Priority</>
                    }
                  </Button>
                </span>
              </Tooltip>
            )}

            <Button
              variant="contained"
              color={submitState === 'submitted' ? 'success' : 'secondary'}
              startIcon={
                votingLoading
                  ? <CircularProgress size={16} color="inherit" />
                  : submitState === 'submitted' ? <CheckCircleIcon /> : <SendIcon />
              }
              disabled={!isExportEnabled && submitState !== 'submitted'}
              accessKey={submitState !== 'submitted' && !votingLoading ? 'f' : undefined}
              onClick={submitState !== 'submitted' && !votingLoading ? onFinish : undefined}
              tabIndex={submitState !== 'submitted' && !votingLoading ? undefined : -1}
              aria-label="Finish and submit results"
              sx={{
                fontWeight: (isExportEnabled && submitState !== 'submitted') ? 'bold' : 'normal',
                transition: 'all 0.2s ease',
                boxShadow: (isExportEnabled && submitState !== 'submitted') ? 3 : 0,
                pointerEvents: (submitState === 'submitted' || votingLoading) ? 'none' : 'auto',
              }}
            >
              {votingLoading ? 'Saving…' : submitState === 'submitted' ? 'Finished ✓' : <><u>F</u>inish</>}
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
