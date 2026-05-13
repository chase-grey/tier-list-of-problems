import { Button, CircularProgress, Tooltip } from '@mui/material';
import { Save as SaveIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export type SaveStatusFlag = 'idle' | 'saving' | 'saved' | 'dirty';

interface SaveButtonProps {
  status: SaveStatusFlag;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
  ariaLabel?: string;
}

/**
 * Persists the current state without navigating away. Mirrors FinishButton's
 * shape but stays "secondary"-styled so it doesn't compete with Finish for the
 * user's eye — Finish is the primary action; Save is the always-available
 * checkpoint.
 *
 * Status:
 *   - 'idle'    → "Save" (button is a no-op when nothing's changed; tooltip
 *                  explains)
 *   - 'dirty'   → "Save" with elevated styling (changes pending)
 *   - 'saving'  → spinner + "Saving…", click disabled
 *   - 'saved'   → "Saved ✓" briefly, then the caller flips back to idle/dirty
 */
export const SaveButton = ({
  status,
  onClick,
  disabled = false,
  tooltip,
  ariaLabel = 'Save',
}: SaveButtonProps) => {
  const isWorking = status === 'saving';
  const showCheck = status === 'saved';
  const hasChanges = status === 'dirty';

  const label = isWorking ? 'Saving…' : showCheck ? 'Saved ✓' : 'Save';
  const icon = isWorking
    ? <CircularProgress size={16} color="inherit" />
    : showCheck ? <CheckCircleIcon />
    : <SaveIcon />;

  const buttonColor = showCheck ? 'success' : 'inherit';

  return (
    <Tooltip title={tooltip ?? ''} placement="bottom">
      <span>
        <Button
          variant={hasChanges ? 'contained' : 'outlined'}
          color={buttonColor}
          startIcon={icon}
          disabled={disabled || isWorking}
          onClick={onClick}
          aria-label={ariaLabel}
          sx={{
            transition: 'all 0.2s ease',
            mr: 1,
            // Outlined variant uses currentColor; keep the border visible in
            // both light and dark themes without forcing a specific palette.
            ...(hasChanges ? {} : { borderColor: 'currentColor' }),
          }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
};
