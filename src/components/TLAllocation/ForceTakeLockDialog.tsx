import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';

interface Props {
  open: boolean;
  holder: string;
  lastHeartbeat: number;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  stageLabel: string;
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

/**
 * Confirmation dialog before stealing the edit lock from an active holder.
 * Force-take loses the previous holder's unsaved work; the copy here is
 * intentionally heavy so it doesn't get clicked through casually.
 */
export default function ForceTakeLockDialog({ open, holder, lastHeartbeat, busy, onConfirm, onClose, stageLabel }: Props) {
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
