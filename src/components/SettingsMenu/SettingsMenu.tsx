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
  FormControl,
  InputLabel,
  Select,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  MoreHoriz as MoreHorizIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  EventAvailable as AvailableIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { isContributorRole } from '../../types/models';

interface SettingsMenuProps {
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  voterName: string | null;
  voterRole: string | null;
  available: boolean | null;
  onUpdateName: (name: string) => void;
  onUpdateRole: (role: string) => void;
  onUpdateAvailability: (available: boolean) => void;
  onResetClick: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  themeMode,
  onToggleTheme,
  voterName,
  voterRole,
  available,
  onUpdateName,
  onUpdateRole,
  onUpdateAvailability,
  onResetClick,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Edit dialogs state
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempRole, setTempRole] = useState('');
  const [tempOtherRole, setTempOtherRole] = useState('');

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeToggle = () => {
    onToggleTheme();
    // Don't close menu after toggling theme
  };

  const handleAvailabilityToggle = () => {
    onUpdateAvailability(!available);
    // Don't close menu after toggling availability
  };

  // Name edit handlers
  const handleEditNameOpen = () => {
    setTempName(voterName || '');
    setEditNameOpen(true);
    handleClose();
  };

  const handleEditNameClose = () => {
    setEditNameOpen(false);
    setTempName('');
  };

  const handleEditNameSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim());
    }
    handleEditNameClose();
  };

  // Role edit handlers
  const handleEditRoleOpen = () => {
    // Check if current role is a standard role or custom
    const standardRoles = ['dev', 'TS', 'QM', 'UXD', 'dev TL', 'QM TL', 'TLTL', 'customer', 'other'];
    if (voterRole && standardRoles.includes(voterRole)) {
      setTempRole(voterRole);
      setTempOtherRole('');
    } else {
      setTempRole('other');
      setTempOtherRole(voterRole || '');
    }
    setEditRoleOpen(true);
    handleClose();
  };

  const handleEditRoleClose = () => {
    setEditRoleOpen(false);
    setTempRole('');
    setTempOtherRole('');
  };

  const handleEditRoleSave = () => {
    const finalRole = tempRole === 'other' ? tempOtherRole.trim() : tempRole;
    if (finalRole) {
      onUpdateRole(finalRole);
    }
    handleEditRoleClose();
  };

  const handleResetClick = () => {
    handleClose();
    onResetClick();
  };

  // Check if user is a developer (can see availability option)
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
        MenuListProps={{
          'aria-labelledby': 'settings-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { minWidth: 280 }
        }}
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
            primary="Update Name" 
            secondary={voterName || 'Not set'}
          />
        </MenuItem>

        {/* Update Role */}
        <MenuItem onClick={handleEditRoleOpen}>
          <ListItemIcon>
            <WorkIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Update Role" 
            secondary={voterRole || 'Not set'}
          />
        </MenuItem>

        {/* Availability Toggle - Only show for developers */}
        {isDeveloper && (
          <MenuItem onClick={handleAvailabilityToggle}>
            <ListItemIcon>
              <AvailableIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Available Next Quarter" 
              secondary={available ? 'Yes - can rank interests' : 'No - priority only'}
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

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onClose={handleEditNameClose} maxWidth="xs" fullWidth>
        <DialogTitle>Update Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tempName.trim()) {
                handleEditNameSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditNameClose}>Cancel</Button>
          <Button 
            onClick={handleEditNameSave} 
            variant="contained" 
            disabled={!tempName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onClose={handleEditRoleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Update Role</DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" margin="dense">
            <InputLabel id="edit-role-select-label">Your Role</InputLabel>
            <Select
              labelId="edit-role-select-label"
              value={tempRole}
              label="Your Role"
              onChange={(e) => setTempRole(e.target.value)}
            >
              <MenuItem value="dev">Dev</MenuItem>
              <MenuItem value="TS">TS</MenuItem>
              <MenuItem value="QM">QM</MenuItem>
              <MenuItem value="UXD">UXD</MenuItem>
              <MenuItem value="dev TL">Dev TL</MenuItem>
              <MenuItem value="QM TL">QM TL</MenuItem>
              <MenuItem value="TLTL">TLTL</MenuItem>
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          {tempRole === 'other' && (
            <TextField
              margin="dense"
              label="Please specify your role"
              type="text"
              fullWidth
              variant="outlined"
              value={tempOtherRole}
              onChange={(e) => setTempOtherRole(e.target.value)}
            />
          )}

          {/* Show info about availability when switching to/from dev */}
          {tempRole === 'dev' && !isDeveloper && (
            <Typography variant="body2" color="info.main" sx={{ mt: 2 }}>
              As a dev, you'll be asked about your availability for next quarter.
            </Typography>
          )}
          {tempRole !== 'dev' && isDeveloper && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
              Changing from dev will remove access to the interest ranking section.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditRoleClose}>Cancel</Button>
          <Button 
            onClick={handleEditRoleSave} 
            variant="contained" 
            disabled={!tempRole || (tempRole === 'other' && !tempOtherRole.trim())}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SettingsMenu;
