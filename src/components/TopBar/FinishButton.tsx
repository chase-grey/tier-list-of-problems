import { Button, CircularProgress, Tooltip } from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

export type FinishSaveState = 'idle' | 'loading' | 'waiting' | 'done';

interface FinishButtonProps {
  saveState: FinishSaveState;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export const FinishButton = ({
  saveState,
  onClick,
  disabled = false,
  ariaLabel = 'Finish',
}: FinishButtonProps) => {
  const isIdle = saveState === 'idle';

  const color = saveState === 'done' ? 'success'
    : saveState === 'waiting' ? 'warning'
    : 'primary';

  const icon = saveState === 'loading' || saveState === 'waiting'
    ? <CircularProgress size={16} color="inherit" />
    : saveState === 'done' ? <CheckCircleIcon />
    : <SendIcon />;

  const label = saveState === 'loading' ? 'Saving…'
    : saveState === 'waiting' ? 'Waiting…'
    : saveState === 'done' ? 'Finished ✓'
    : <><u>F</u>inish</>;

  return (
    <Tooltip
      title={saveState === 'waiting' ? 'Sheet is busy — retrying automatically…' : ''}
      placement="bottom"
    >
      <span>
        <Button
          variant="contained"
          color={color}
          startIcon={icon}
          disabled={disabled}
          accessKey={isIdle && !disabled ? 'f' : undefined}
          onClick={isIdle && !disabled ? onClick : undefined}
          tabIndex={isIdle && !disabled ? undefined : -1}
          aria-label={ariaLabel}
          sx={{
            fontWeight: isIdle && !disabled ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            boxShadow: isIdle && !disabled ? 3 : 0,
            pointerEvents: !isIdle ? 'none' : 'auto',
          }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
};
