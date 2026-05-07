import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  TextField,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Chip,
  FormControlLabel,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  MoreHoriz as MoreHorizIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  EventAvailable as AvailableIcon,
  RestartAlt as ResetIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { isContributorRole, isDevRole } from '../../types/models';
import type { Capacity } from '../../types/models';
import { TEAM_ROSTER, type TeamMember } from '../../data/teamRoster';
import { CapacitySelector } from '../AvailabilityDialog/AvailabilityDialog';
import { setPollingStateRemote } from '../../services/allocationApi';
import { getPollingStage, getPollingCycleId, applyPollingState, type PollingStage } from '../../utils/config';

/** Voter who can see the Polling Admin menu item. Hardcoded to keep the
 *  surface area small; update here if the admin changes. */
const ADMIN_VOTER_NAME = 'Chase Grey';

/** Stage progression: 1 → tl-1 → 2 → tl-2 → (no further advance — must roll quarter). */
const STAGE_ORDER: PollingStage[] = [1, 'tl-1', 2, 'tl-2'];

const stageDisplayLabel = (s: PollingStage): string => {
  switch (s) {
    case 1:      return 'Stage 1: Priority Voting';
    case 'tl-1': return 'Stage 2: Dev Matching';
    case 2:      return 'Stage 3: Interest Voting';
    case 'tl-2': return 'Stage 4: Team Matching';
  }
};

const stageWireValue = (s: PollingStage): string =>
  s === 1 ? '1' : s === 2 ? '2' : s;

const nextStage = (s: PollingStage): PollingStage | null => {
  const idx = STAGE_ORDER.indexOf(s);
  if (idx < 0 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
};

interface SettingsMenuProps {
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null;
  /** Dev-only: separate "available as PQA1 reviewer" flag. Null for non-devs. */
  availableForPQA1?: boolean | null;
  /** Devs only: capacity tier for Stage 2 dev assignment. */
  devCapacity?: Capacity | null;
  /** Devs only: capacity tier for Stage 4 PQA1 assignment. */
  pqa1Capacity?: Capacity | null;
  /** QM / dev TL only: single capacity tier for project assignment. */
  capacity?: Capacity | null;
  /** Required free-text comment when any capacity tier is non-`'avg'`. */
  availabilityComment?: string;
  onUpdateNameAndRole: (name: string, role: string) => void;
  /**
   * Update availability. Capacity tiers + comment travel through `extras`.
   * Booleans are derived back-compat fields (`tier !== 'none'`).
   */
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
  onResetClick: () => void;
  allocationMode?: boolean;
  /** Human-readable label for the upcoming quarter, e.g. "Nov '26". */
  quarterLabel?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  themeMode,
  onToggleTheme,
  voterName,
  voterRole,
  available,
  availableForPQA1 = null,
  devCapacity = null,
  pqa1Capacity = null,
  capacity = null,
  availabilityComment = '',
  onUpdateNameAndRole,
  onUpdateAvailability,
  onResetClick,
  allocationMode = false,
  quarterLabel,
}) => {
  const labelText = quarterLabel?.trim() || 'Next Quarter';
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [tempMember, setTempMember] = useState<TeamMember | null>(null);

  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const isDev = isDevRole(voterRole);

  // Polling Admin dialog state — only meaningful for the admin user.
  const [pollingAdminOpen, setPollingAdminOpen] = useState(false);
  const [pollingSaving, setPollingSaving] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [newCycleInput, setNewCycleInput] = useState('');
  const currentStage = getPollingStage();
  const currentCycleId = getPollingCycleId();
  const advanceTarget = nextStage(currentStage);

  const handlePollingAdminOpen = () => {
    setPollingAdminOpen(true);
    setNewCycleInput('');
    setPollingError(null);
    handleClose();
  };

  const handleAdvanceStage = async () => {
    if (!advanceTarget) return;
    setPollingSaving(true);
    setPollingError(null);
    try {
      await setPollingStateRemote({ stage: stageWireValue(advanceTarget), setBy: ADMIN_VOTER_NAME });
      const changed = applyPollingState({ stage: stageWireValue(advanceTarget) });
      if (changed) window.location.reload();
      else setPollingAdminOpen(false);
    } catch (err: any) {
      setPollingError(err?.message ?? 'Failed to advance stage');
    } finally {
      setPollingSaving(false);
    }
  };

  const handleRollQuarter = async () => {
    const next = newCycleInput.trim();
    if (!next) {
      setPollingError('Enter the new cycle ID (e.g. "Feb27")');
      return;
    }
    setPollingSaving(true);
    setPollingError(null);
    try {
      await setPollingStateRemote({ stage: '1', cycleId: next, setBy: ADMIN_VOTER_NAME });
      const changed = applyPollingState({ stage: '1', cycleId: next });
      if (changed) window.location.reload();
      else setPollingAdminOpen(false);
    } catch (err: any) {
      setPollingError(err?.message ?? 'Failed to roll quarter');
    } finally {
      setPollingSaving(false);
    }
  };

  // A user is "standard" when every applicable tier is 'avg' (or unset, which we treat as 'avg').
  const computeIsStandard = (): boolean => {
    if (isDev) {
      const dev = devCapacity ?? 'avg';
      const pqa = pqa1Capacity ?? 'avg';
      return dev === 'avg' && pqa === 'avg';
    }
    return (capacity ?? 'avg') === 'avg';
  };

  // Local form state — initialized from props each time the dialog opens.
  const [formIsStandard, setFormIsStandard] = useState(true);
  const [formDevCapacity, setFormDevCapacity] = useState<Capacity>('avg');
  const [formPqa1Capacity, setFormPqa1Capacity] = useState<Capacity>('avg');
  const [formCapacity, setFormCapacity] = useState<Capacity>('avg');
  const [formComment, setFormComment] = useState('');

  useEffect(() => {
    if (availabilityOpen) {
      setFormIsStandard(computeIsStandard());
      setFormDevCapacity((devCapacity ?? 'avg') as Capacity);
      setFormPqa1Capacity((pqa1Capacity ?? 'avg') as Capacity);
      setFormCapacity((capacity ?? 'avg') as Capacity);
      setFormComment(availabilityComment ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityOpen]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    onToggleTheme();
  };

  const handleAvailabilityOpen = () => {
    setAvailabilityOpen(true);
    handleClose();
  };

  const handleAvailabilityClose = () => {
    setAvailabilityOpen(false);
  };

  // Comment is required if the user is in custom mode AND any capacity is non-'avg'.
  const formAnyNonAvg = isDev
    ? formDevCapacity !== 'avg' || formPqa1Capacity !== 'avg'
    : formCapacity !== 'avg';
  const formCommentRequired = !formIsStandard && formAnyNonAvg;
  const formSaveDisabled = formCommentRequired && formComment.trim().length === 0;

  const handleAvailabilitySave = () => {
    if (formIsStandard) {
      if (isDev) {
        onUpdateAvailability(true, true, {
          devCapacity: 'avg',
          pqa1Capacity: 'avg',
          availabilityComment: '',
        });
      } else {
        onUpdateAvailability(true, null, {
          capacity: 'avg',
          availabilityComment: '',
        });
      }
    } else if (isDev) {
      onUpdateAvailability(formDevCapacity !== 'none', formPqa1Capacity !== 'none', {
        devCapacity: formDevCapacity,
        pqa1Capacity: formPqa1Capacity,
        availabilityComment: formComment.trim(),
      });
    } else {
      onUpdateAvailability(formCapacity !== 'none', null, {
        capacity: formCapacity,
        availabilityComment: formComment.trim(),
      });
    }
    setAvailabilityOpen(false);
  };

  const handleEditNameOpen = () => {
    const current = TEAM_ROSTER.find(m => m.name === voterName) ?? null;
    setTempMember(current);
    setEditNameOpen(true);
    handleClose();
  };

  const handleEditNameClose = () => {
    setEditNameOpen(false);
    setTempMember(null);
  };

  const handleEditNameSave = () => {
    if (tempMember) {
      onUpdateNameAndRole(tempMember.name, tempMember.role);
    }
    handleEditNameClose();
  };

  const handleResetClick = () => {
    handleClose();
    onResetClick();
  };

  const isContributor = voterRole && isContributorRole(voterRole);

  // Summary label shown in the menu row.
  const availabilitySummary = (() => {
    if (available === null && availableForPQA1 === null) return 'Not set';
    if (computeIsStandard() && available === true) return 'Standard';
    const parts: string[] = [];
    if (isDev) {
      parts.push(`dev ${devCapacity ?? (available ? 'avg' : 'none')}`);
      parts.push(`PQA1 ${pqa1Capacity ?? (availableForPQA1 ? 'avg' : 'none')}`);
    } else {
      parts.push(capacity ?? (available ? 'avg' : 'none'));
    }
    return parts.join(' · ');
  })();

  return (
    <>
      <Tooltip title="Settings">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label="Settings menu"
          aria-controls={open ? 'settings-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>

      <Menu
        id="settings-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{ 'aria-labelledby': 'settings-button' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { minWidth: 280 } }}
      >
        {/* Theme Toggle */}
        <MenuItem onClick={handleThemeToggle}>
          <ListItemIcon>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} />
        </MenuItem>

        <Divider />

        {/* Update Name */}
        <MenuItem onClick={handleEditNameOpen}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText
            primary="Change Name"
            secondary={voterName ? `${voterName} · ${voterRole ?? ''}` : 'Not set'}
          />
        </MenuItem>

        {/* Capacity / availability — only for contributor roles */}
        {isContributor && (
          <MenuItem onClick={handleAvailabilityOpen}>
            <ListItemIcon>
              <AvailableIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Availability for ${labelText}`}
              secondary={availabilitySummary}
            />
          </MenuItem>
        )}

        {/* Polling-state admin — only for the designated admin user. */}
        {voterName === ADMIN_VOTER_NAME && (
          <MenuItem onClick={handlePollingAdminOpen}>
            <ListItemIcon>
              <AdminIcon />
            </ListItemIcon>
            <ListItemText
              primary="Polling Admin"
              secondary={`${stageDisplayLabel(currentStage)} · ${currentCycleId || '—'}`}
            />
          </MenuItem>
        )}

        <Divider />

        {/* Reset All */}
        <MenuItem onClick={handleResetClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <ResetIcon color="error" />
          </ListItemIcon>
          <ListItemText primary={allocationMode ? 'Clear All Assignments' : 'Reset All'} />
        </MenuItem>
      </Menu>

      {/* Availability dialog */}
      <Dialog
        open={availabilityOpen}
        onClose={handleAvailabilityClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Availability for {labelText}</DialogTitle>
        <DialogContent>
          <Box my={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={formIsStandard}
                  onChange={(e) => setFormIsStandard(e.target.checked)}
                  color="primary"
                />
              }
              label={`Available for standard work in ${labelText}`}
            />
            {formIsStandard && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 6 }}>
                Toggle off if anything's different — out part of the quarter,
                more or less bandwidth, etc.
              </Typography>
            )}

            {!formIsStandard && (
              <Box sx={{ mt: 2, pl: 1 }}>
                {isDev ? (
                  <>
                    <CapacitySelector
                      label="Dev project capacity"
                      value={formDevCapacity}
                      onChange={setFormDevCapacity}
                      helperText="Used for Stage 2 dev assignment."
                    />
                    <CapacitySelector
                      label="PQA1 capacity"
                      value={formPqa1Capacity}
                      onChange={setFormPqa1Capacity}
                      helperText="Used for Stage 4 PQA1 assignment."
                    />
                  </>
                ) : (
                  <CapacitySelector
                    label="Project capacity"
                    value={formCapacity}
                    onChange={setFormCapacity}
                  />
                )}

                <TextField
                  label={`What's going on in ${labelText}?`}
                  placeholder="Your TL will see this"
                  multiline
                  rows={3}
                  fullWidth
                  required={formCommentRequired}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  error={formCommentRequired && formComment.trim().length === 0}
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAvailabilityClose}>Cancel</Button>
          <Button
            onClick={handleAvailabilitySave}
            variant="contained"
            disabled={formSaveDisabled}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Name Dialog */}
      <Dialog open={editNameOpen} onClose={handleEditNameClose} maxWidth="xs" fullWidth>
        <DialogTitle>Change Name</DialogTitle>
        <DialogContent>
          <Autocomplete
            autoFocus
            autoHighlight
            autoSelect
            options={TEAM_ROSTER}
            getOptionLabel={(option) => option.name}
            filterOptions={(options, { inputValue }) => {
              const lower = inputValue.toLowerCase();
              return options.filter(o =>
                o.name.split(' ').some(word => word.toLowerCase().startsWith(lower))
              );
            }}
            value={tempMember}
            onChange={(_, value) => setTempMember(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Your Name"
                placeholder="Start typing…"
                variant="outlined"
                margin="dense"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.name}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <span style={{ flex: 1 }}>{option.name}</span>
                  <Chip label={option.role} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>
              </li>
            )}
            isOptionEqualToValue={(option, value) => option.name === value.name}
          />
          {tempMember && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Role: <strong>{tempMember.role}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditNameClose}>Cancel</Button>
          <Button onClick={handleEditNameSave} variant="contained" disabled={!tempMember}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Polling Admin dialog — Chase Grey only. Two actions: advance to the
          next stage, or roll over to a new quarter (resets stage to 1). Both
          POST to the backend and reload so config.ts picks up the new cache. */}
      <Dialog
        open={pollingAdminOpen}
        onClose={() => !pollingSaving && setPollingAdminOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Polling Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Current state — applies to every user once they reload.
            </Typography>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              <strong>{stageDisplayLabel(currentStage)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cycle: <strong>{currentCycleId || '— (using build-time default)'}</strong>
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Advance Stage</Typography>
            {advanceTarget ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Next: {stageDisplayLabel(advanceTarget)}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleAdvanceStage}
                  disabled={pollingSaving}
                  sx={{ mb: 3 }}
                >
                  Advance to {stageDisplayLabel(advanceTarget).split(':')[0]}
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You're at the final stage of this cycle. Roll to the next quarter to start over.
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Roll to Next Quarter</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Sets stage back to 1 and updates the cycle ID for everyone. Use a short label like <code>Feb27</code>.
            </Typography>
            <TextField
              label="New cycle ID"
              placeholder="Feb27"
              fullWidth
              size="small"
              value={newCycleInput}
              onChange={(e) => setNewCycleInput(e.target.value)}
              disabled={pollingSaving}
              sx={{ mb: 1 }}
            />
            <Button
              variant="outlined"
              color="warning"
              onClick={handleRollQuarter}
              disabled={pollingSaving || !newCycleInput.trim()}
            >
              Roll to {newCycleInput.trim() || '…'}
            </Button>

            {pollingError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 2 }}>
                {pollingError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPollingAdminOpen(false)} disabled={pollingSaving}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SettingsMenu;
