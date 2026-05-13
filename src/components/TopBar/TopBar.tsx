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
  HelpOutline as HelpIcon,
  FormatListNumbered as RankedIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  ThumbUp as InterestIcon,
  AutoFixHigh as WandIcon,
} from '@mui/icons-material';
import { SettingsMenu } from '../SettingsMenu/SettingsMenu';
import { FinishButton } from './FinishButton';
import { SaveButton, type SaveStatusFlag } from './SaveButton';
import LockControl, { type LockStatus } from './LockControl';
import type { Capacity } from '../../types/models';


interface TopBarProps {
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null;
  /** Devs only: separate "available as PQA1" flag (Stage 4 pool). */
  availableForPQA1?: boolean | null;
  /** Devs only: capacity tier for Stage 2 dev assignment. */
  devCapacity?: Capacity | null;
  /** Devs only: capacity tier for Stage 4 PQA1 assignment. */
  pqa1Capacity?: Capacity | null;
  /** QM / dev TL only: single capacity tier for project assignment. */
  capacity?: Capacity | null;
  /** Required free-text comment when any capacity tier is non-`'avg'`. */
  availabilityComment?: string;
  /** Human-readable label for the upcoming quarter, e.g. "Nov '26". */
  quarterLabel?: string;
  totalPitchCount: number;
  rankCount: number;
  interestCount: number;
  /** Save current votes without opening the feedback dialog or showing the
   *  completion view. Always available alongside Finish. */
  onSave?: () => void;
  /** Save button visual state (mirrors the submitState in App.tsx). */
  saveStatus?: SaveStatusFlag;
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
  onUpdateAvailability: (
    available: boolean,
    availableForPQA1?: boolean | null,
    extras?: {
      devCapacity?: Capacity | null;
      pqa1Capacity?: Capacity | null;
      capacity?: Capacity | null;
      availabilityComment?: string;
    },
  ) => void;
  appStage2Mode?: boolean;
  allocationMode?: boolean;
  allocationStep?: 0 | 1;
  /** Save Stage 2/4 in place (no nav to summary). Requires lock-holder. */
  onAllocationSave?: () => void;
  allocationSaveStatus?: SaveStatusFlag;
  /** Whether Stage 4 has every project's team filled (gates Finish). */
  allocationCanFinish?: boolean;
  /** Whether the caller holds the stage edit lock — disables both Save and Finish when false. */
  allocationHasLock?: boolean;
  /** Full lock-state machine for the inline LockControl. Omit to hide the control. */
  allocationLockStatus?: LockStatus;
  allocationLockHolder?: string | null;
  allocationLockLastHeartbeat?: number;
  allocationLockStageLabel?: string;
  /** Take the edit lock; resolves with `acquired:false` if a foreign holder is fresh. */
  onAllocationTakeLock?: (force: boolean) => Promise<{ acquired: boolean }>;
  onAllocationReleaseLock?: () => Promise<void>;
  onAllocationFinish?: () => void;
  allocationSaveState?: 'idle' | 'waiting' | 'saving' | 'done';
  allocationShowResults?: boolean;
  allocationHasResults?: boolean;
  onAllocationViewSummary?: () => void;
  onAllocationBackToEdit?: () => void;
  onAllocationRerun?: () => void;
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
  availableForPQA1 = null,
  devCapacity = null,
  pqa1Capacity = null,
  capacity = null,
  availabilityComment = '',
  quarterLabel,
  totalPitchCount,
  rankCount,
  interestCount,
  onSave,
  saveStatus = 'idle',
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
  onAllocationSave,
  allocationSaveStatus = 'idle',
  allocationCanFinish = false,
  allocationHasLock = false,
  allocationLockStatus,
  allocationLockHolder = null,
  allocationLockLastHeartbeat = 0,
  allocationLockStageLabel = '',
  onAllocationTakeLock,
  onAllocationReleaseLock,
  onAllocationFinish,
  allocationSaveState = 'idle',
  allocationShowResults = false,
  allocationHasResults = false,
  onAllocationViewSummary,
  onAllocationBackToEdit,
  onAllocationRerun,
  votingLoading = false,
  submitState = 'idle',
}: TopBarProps) => {
  const appTitle = allocationMode
    ? (allocationStep === 0 ? 'Dev Matching' : 'Team Matching')
    : appStage2Mode ? 'Interest Voting' : 'Priority Voting';
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
          <Typography variant="subtitle1" component="span">
            {appTitle}
          </Typography>

          {allocationMode && !allocationShowResults && onAllocationRerun && (
            <Tooltip title="Re-run auto-assignment algorithm (Shift+Alt+A)">
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<WandIcon />}
                accessKey="a"
                onClick={onAllocationRerun}
                sx={{ ml: 1 }}
              >
                <u>A</u>uto-assign
              </Button>
            </Tooltip>
          )}

          <Tooltip title="View Instructions (?)">
            <IconButton color="inherit" onClick={onHelpClick} aria-label="Help" sx={{ ml: 1 }}>
              <HelpIcon />
            </IconButton>
          </Tooltip>

          <SettingsMenu
            themeMode={themeMode}
            onToggleTheme={onToggleTheme}
            voterName={voterName}
            voterRole={voterRole}
            available={available}
            availableForPQA1={availableForPQA1}
            devCapacity={devCapacity}
            pqa1Capacity={pqa1Capacity}
            capacity={capacity}
            availabilityComment={availabilityComment}
            quarterLabel={quarterLabel}
            onUpdateNameAndRole={onUpdateNameAndRole}
            onUpdateAvailability={onUpdateAvailability}
            onResetClick={onResetClick}
            allocationMode={allocationMode}
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
            {allocationLockStatus && onAllocationTakeLock && onAllocationReleaseLock && !allocationShowResults && (
              <LockControl
                status={allocationLockStatus}
                holder={allocationLockHolder}
                lastHeartbeat={allocationLockLastHeartbeat}
                stageLabel={allocationLockStageLabel}
                onTake={onAllocationTakeLock}
                onRelease={onAllocationReleaseLock}
              />
            )}
            {onAllocationSave && (
              <SaveButton
                status={allocationSaveStatus}
                onClick={onAllocationSave}
                disabled={!allocationHasLock}
                tooltip={
                  !allocationHasLock
                    ? 'Take the edit lock before saving — someone else is editing.'
                    : 'Save progress without going to the summary page.'
                }
                ariaLabel="Save allocation in place"
              />
            )}
            {onAllocationFinish && (
              <FinishButton
                saveState={
                  allocationSaveState === 'done' ? 'done' :
                  allocationSaveState === 'waiting' ? 'waiting' :
                  allocationSaveState === 'saving' ? 'loading' :
                  'idle'
                }
                onClick={onAllocationFinish}
                disabled={!allocationHasLock || !allocationCanFinish}
                ariaLabel="Finish and save allocation"
              />
            )}
          </Box>
        )}

        {/* Voting-only: rank / interest progress and navigation. Hidden in
            Stage 3 for voters who can't access the interest UI (e.g. QM/TCap
            without availability, devs whose interest data is already on
            file) — they have nothing to track or submit, so the stat pill
            and Finish button were just confusing noise. */}
        {!allocationMode && (canAccessInterestStage || !appStage2Mode) && (
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

            {onSave && (
              <SaveButton
                status={saveStatus}
                onClick={onSave}
                tooltip={
                  rankCount === 0 && interestCount === 0
                    ? 'Nothing to save yet — rank at least one pitch first.'
                    : 'Save progress without finishing — you can keep editing.'
                }
                disabled={rankCount === 0 && interestCount === 0}
                ariaLabel="Save progress"
              />
            )}
            <FinishButton
              saveState={
                submitState === 'submitted' ? 'done' :
                votingLoading ? 'loading' :
                'idle'
              }
              onClick={onFinish}
              disabled={!isExportEnabled && submitState !== 'submitted'}
              ariaLabel="Finish and submit results"
            />
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
