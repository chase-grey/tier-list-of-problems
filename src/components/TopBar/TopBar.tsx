import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import type { Vote } from '../../types/models';

interface TopBarProps {
  voterName: string;
  votes: Record<string, Vote>;
  totalPitchCount: number;
  appetiteCount: number;
  rankCount: number;
  onExport: () => void;
  isExportEnabled: boolean;
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
  isExportEnabled 
}: TopBarProps) => {
  return (
    <AppBar position="sticky" sx={{ height: 64 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Problem Polling: {voterName}
        </Typography>
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
