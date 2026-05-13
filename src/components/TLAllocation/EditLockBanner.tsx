import { Button, Alert } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getShortName } from '../../data/teamRoster';
import type { EditLockState } from '../../services/api';
import type { EditLockStatus } from '../../hooks/useEditLock';

interface Props {
  status: EditLockStatus;
  lock: EditLockState;
  onRefresh: () => void;
}

/**
 * Critical-only banner: rendered as a full-width alert when the user's edit
 * lock has been force-taken by someone else. The everyday Take / Release /
 * Force-take controls live in the toolbar (LockControl) — only the "lost"
 * state warrants stealing layout space because it means unsaved work is
 * about to be lost.
 */
export default function EditLockBanner({ status, lock, onRefresh }: Props) {
  if (status !== 'lost') return null;
  return (
    <Alert
      severity="error"
      icon={<WarningAmberIcon />}
      sx={{ borderRadius: 0 }}
      action={
        <Button color="inherit" size="small" onClick={onRefresh}>Refresh</Button>
      }
    >
      <strong>Your edit lock was taken{lock.holder ? ` by ${getShortName(lock.holder)}` : ''}.</strong>{' '}
      Any unsaved changes here can't be saved. Refresh to see the latest state.
    </Alert>
  );
}
