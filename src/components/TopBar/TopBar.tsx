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
  GetApp as DownloadIcon,
  HelpOutline as HelpIcon 
} from '@mui/icons-material';
import type { Vote } from '../../types/models';

interface TopBarProps {
  voterName: string;
  votes: Record<string, Vote>;
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  onExport: () => void;
  isExportEnabled: boolean;
  onHelpClick: () => void;
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ 
  voterName, 
  totalPitchCount, 
  appetiteCount, 
  rankCount, 
  onExport, 
  isExportEnabled,
  onHelpClick 
}: TopBarProps) => {
  return (
    <AppBar position="sticky" sx={{ height: 64 }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="div">
            Problem Polling: {voterName}
          </Typography>
          <Tooltip title="View Instructions">
            <IconButton 
              color="inherit" 
              onClick={onHelpClick}
              sx={{ ml: 2 }}
              aria-label="Help"
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', gap: 1 }}>
            <Box 
              component="span" 
              sx={{ 
                color: appetiteCount === totalPitchCount ? '#4caf50' : 'inherit',
                fontWeight: appetiteCount === totalPitchCount ? 'bold' : 'normal',
                transition: 'all 0.2s ease'
              }}
            >
              🍽 Appetites {appetiteCount}/{totalPitchCount}
            </Box>
            <Box component="span">•</Box>
            <Box 
              component="span" 
              sx={{ 
                color: rankCount === totalPitchCount ? '#4caf50' : 'inherit',
                fontWeight: rankCount === totalPitchCount ? 'bold' : 'normal',
                transition: 'all 0.2s ease'
              }}
            >
              🗂 Ranked {rankCount}/{totalPitchCount}
            </Box>
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!isExportEnabled}
          onClick={onExport}
          aria-label="Export results to CSV"
          sx={{
            fontWeight: isExportEnabled ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            '&:not(:disabled)': {
              boxShadow: 3
            }
          }}
        >
          Export CSV
        </Button>
      </Toolbar>
    </AppBar>
  );
};
