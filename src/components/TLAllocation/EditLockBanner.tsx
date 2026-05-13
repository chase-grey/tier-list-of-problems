import { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getShortName } from '../../data/teamRoster';
import type { EditLockState } from '../../services/api';
import type { EditLockStatus } from '../../hooks/useEditLock';

interface Props {
  status: EditLockStatus;
  lock: EditLockState;
  stageLabel: string; // "Stage 2" or "Stage 4"
  onTake: (force: boolean) => Promise<{ acquired: boolean; lock: EditLockState }>;
  onRelease: () => Promise<void>;
  onRefresh: () => void;
}

function formatTimeAgo(timestampMs: number): string {
  if (!timestampMs) return 'just now';
  const seconds = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day(s) ago`;
}

export default function EditLockBanner({ status, lock, stageLabel, onTake, onRelease, onRefresh }: Props) {
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleTake = async (force: boolean) => {
    setBusy(true);
    try {
      const result = await onTake(force);
      if (!result.acquired && !force) {
        // Active foreign holder — surface the confirmation dialog.
        setForceDialogOpen(true);
      } else if (result.acquired) {
        setForceDialogOpen(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    setBusy(true);
    try { await onRelease(); } finally { setBusy(false); }
  };

  // Loading: keep the banner area reserved so the layout doesn't jump.
  if (status === 'loading') {
    return <Box sx={{ height: 0 }} />;
  }

  if (status === 'lost') {
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

  if (status === 'editor') {
    return (
      <Alert
        severity="success"
        icon={<LockIcon />}
        sx={{ borderRadius: 0 }}
        action={
          <Button color="inherit" size="small" onClick={handleRelease} disabled={busy} startIcon={<LockOpenIcon />}>
            Release lock
          </Button>
        }
      >
        You hold the {stageLabel} edit lock. Save your work before walking away — other TLs see view-only until you release.
      </Alert>
    );
  }

  if (status === 'viewer') {
    return (
      <>
        <Alert
          severity="info"
          icon={<VisibilityIcon />}
          sx={{ borderRadius: 0 }}
          action={
            <Button color="inherit" size="small" onClick={() => handleTake(false)} disabled={busy}>
              Take edit lock
            </Button>
          }
        >
          <strong>{getShortName(lock.holder ?? '')}</strong> is currently editing {stageLabel}
          {lock.lastHeartbeat ? ` (last activity ${formatTimeAgo(lock.lastHeartbeat)})` : ''}. You're in view-only mode.
        </Alert>
        <ForceTakeDialog
          open={forceDialogOpen}
          holder={lock.holder ?? ''}
          lastHeartbeat={lock.lastHeartbeat}
          busy={busy}
          onConfirm={() => handleTake(true)}
          onClose={() => setForceDialogOpen(false)}
          stageLabel={stageLabel}
        />
      </>
    );
  }

  // idle — no one holds the lock
  return (
    <Alert
      severity="warning"
      icon={<LockOpenIcon />}
      sx={{ borderRadius: 0 }}
      action={
        <Button color="inherit" size="small" onClick={() => handleTake(false)} disabled={busy}>
          Take edit lock
        </Button>
      }
    >
      {stageLabel} is currently unowned. Take the edit lock to start editing — everyone else will see view-only.
    </Alert>
  );
}

interface ForceTakeDialogProps {
  open: boolean;
  holder: string;
  lastHeartbeat: number;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  stageLabel: string;
}

function ForceTakeDialog({ open, holder, lastHeartbeat, busy, onConfirm, onClose, stageLabel }: ForceTakeDialogProps) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Force-take the {stageLabel} edit lock?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          <strong>{holder}</strong> currently holds the lock
          {lastHeartbeat ? ` and was last active ${formatTimeAgo(lastHeartbeat)}` : ''}.
        </Typography>
        <Typography variant="body2" color="error" sx={{ mb: 1.5 }}>
          Any unsaved changes they have will not be recoverable.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use force-take only after coordinating with them (Slack / in person). If you're unsure whether they're still
          actively editing, wait a few minutes and the lock will go stale automatically.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={busy}>
          Force take
        </Button>
      </DialogActions>
    </Dialog>
  );
}
