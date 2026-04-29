import React, { useState } from 'react';
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
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import {
  MoreHoriz as MoreHorizIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  EventAvailable as AvailableIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { isContributorRole } from '../../types/models';
import { TEAM_ROSTER, type TeamMember } from '../../data/teamRoster';

interface SettingsMenuProps {
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null;
  onUpdateNameAndRole: (name: string, role: string) => void;
  onUpdateAvailability: (available: boolean) => void;
  onResetClick: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  themeMode,
  onToggleTheme,
  voterName,
  voterRole,
  available,
  onUpdateNameAndRole,
  onUpdateAvailability,
  onResetClick,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [tempMember, setTempMember] = useState<TeamMember | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    onToggleTheme();
  };

  const handleAvailabilityToggle = () => {
    onUpdateAvailability(!available);
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

  const isDeveloper = voterRole && isContributorRole(voterRole);

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

        {/* Availability Toggle - only for contributor roles */}
        {isDeveloper && (
          <MenuItem onClick={handleAvailabilityToggle}>
            <ListItemIcon>
              <AvailableIcon />
            </ListItemIcon>
            <ListItemText
              primary="Available Next Quarter"
              secondary={available ? 'Yes — can rank interests' : 'No — priority only'}
            />
            <Switch
              edge="end"
              checked={available === true}
              onChange={handleAvailabilityToggle}
              onClick={(e) => e.stopPropagation()}
            />
          </MenuItem>
        )}

        <Divider />

        {/* Reset All */}
        <MenuItem onClick={handleResetClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <ResetIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Reset All" />
        </MenuItem>
      </Menu>

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
    </>
  );
};

export default SettingsMenu;
