import { useState } from 'react';
import { Box, Button, Chip, CircularProgress, Tooltip } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getShortName } from '../../data/teamRoster';
import ForceTakeLockDialog from '../TLAllocation/ForceTakeLockDialog';
import { useSnackbar } from '../../hooks/useSnackbar';

export type LockStatus = 'loading' | 'editor' | 'viewer' | 'idle' | 'lost';

interface Props {
  status: LockStatus;
  holder: string | null;
  lastHeartbeat: number;
  stageLabel: string;
  /** Current voter name. Used to detect the "same user, different tab" case:
   *  when status='viewer' AND holder === voterName, the lock is held by
   *  another tab from this user — the chip reflects that more precisely. */
  voterName?: string | null;
  /**
   * Acquire the lock. `force=true` overrides an active foreign holder; the
   * dialog disclaims the data-loss risk before this is called.
   * Returns { acquired: boolean } so the control knows whether to surface the
   * force-take dialog on a refusal.
   */
  onTake: (force: boolean) => Promise<{ acquired: boolean }>;
  onRelease: () => Promise<void>;
}

/**
 * Compact lock control rendered inline in the TopBar (between Help and Save).
 * Surfaces the current edit-lock state and offers the relevant action:
 *   - editor: chip showing "Lock held" + a "Release" button.
 *   - viewer: chip showing the holder's short name + a "Take lock" button.
 *             A foreign-holder refusal triggers the force-take confirmation.
 *   - idle:   "Take lock" button (no chip — nobody to attribute it to).
 *   - lost:   minimal chip; the full-width banner explains and offers refresh.
 *   - loading: small spinner while the initial fetch resolves.
 */
export default function LockControl({ status, holder, lastHeartbeat, stageLabel, voterName, onTake, onRelease }: Props) {
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { showSnackbar } = useSnackbar();
  const handleTake = async (force: boolean) => {
    setBusy(true);
    try {
      const result = await onTake(force);
      if (!result.acquired && !force) {
        setForceDialogOpen(true);
      } else if (result.acquired) {
        setForceDialogOpen(false);
      }
    } catch (err: any) {
      // Previously this swallowed the rejection silently — the button just
      // reverted to "Take lock" with no feedback. Surface a snackbar so the
      // user knows the click did something (and can report what went wrong).
      showSnackbar(`Couldn't take the lock: ${err?.message ?? 'unknown error'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    setBusy(true);
    try { await onRelease(); } finally { setBusy(false); }
  };

  if (status === 'loading') {
    return <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />;
  }

  if (status === 'lost') {
    // The full-width "Your lock was taken" alert handles messaging and the
    // refresh CTA — keep the toolbar minimal in that state.
    return (
      <Tooltip title="Your edit lock was taken — refresh to continue.">
        <Chip
          icon={<LockOpenIcon />}
          label="Lock lost"
          size="small"
          color="error"
          sx={{ mr: 1, '& .MuiChip-icon': { fontSize: 16 } }}
        />
      </Tooltip>
    );
  }

  if (status === 'editor') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 1 }}>
        <Tooltip title={`You hold the ${stageLabel} edit lock. Others see view-only until you release.`}>
          <Chip
            icon={<LockIcon />}
            label="You're editing"
            size="small"
            color="success"
            sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
          />
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<LockOpenIcon />}
          onClick={handleRelease}
          disabled={busy}
          sx={{ borderColor: 'currentColor' }}
        >
          Release
        </Button>
      </Box>
    );
  }

  if (status === 'viewer') {
    // Same name as the current voter means the lock is held by another tab
    // from this user, not a different person. Signal that more clearly so the
    // TL doesn't get a confusing "Chase is editing" chip while sitting at
    // their own keyboard.
    const isSelfElsewhere = !!voterName && holder === voterName;
    const chipLabel = isSelfElsewhere ? 'Open in another tab' : `${getShortName(holder ?? '')} is editing`;
    const tooltipText = isSelfElsewhere
      ? `You have ${stageLabel} open in another tab. Take the lock here to switch — the other tab will go view-only.`
      : `${holder ?? 'Someone'} is editing ${stageLabel}. You're in view-only mode.`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 1 }}>
        <Tooltip title={tooltipText}>
          <Chip
            icon={<VisibilityIcon />}
            label={chipLabel}
            size="small"
            color={isSelfElsewhere ? 'warning' : 'info'}
            sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
          />
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => handleTake(false)}
          disabled={busy}
          sx={{ borderColor: 'currentColor' }}
        >
          Take lock
        </Button>
        <ForceTakeLockDialog
          open={forceDialogOpen}
          holder={holder ?? ''}
          lastHeartbeat={lastHeartbeat}
          busy={busy}
          onConfirm={() => handleTake(true)}
          onClose={() => setForceDialogOpen(false)}
          stageLabel={stageLabel}
        />
      </Box>
    );
  }

  // idle — no one holds the lock
  return (
    <Tooltip title={`Take the ${stageLabel} edit lock to start editing. Other TLs will see view-only until you release.`}>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<LockOpenIcon />}
        onClick={() => handleTake(false)}
        disabled={busy}
        sx={{ mr: 1, borderColor: 'currentColor' }}
      >
        Take lock
      </Button>
    </Tooltip>
  );
}
