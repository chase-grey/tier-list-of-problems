import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import { exportVotes } from '../../utils/csv';
import { Vote } from '../../types/models';

interface TopBarProps {
  voterName: string;
  votes: Record<string, Vote>;
  totalPitchCount: number;
}

/**
 * Application header with progress stats and export functionality
 */
export const TopBar = ({ voterName, votes, totalPitchCount }: TopBarProps) => {
  // Count the number of pitches with appetites set
  const appetiteCount = Object.values(votes).filter(vote => vote.appetite).length;
  
  // Count the number of pitches with tiers assigned (dragged to a bucket)
  const rankCount = Object.values(votes).filter(vote => vote.tier).length;
  
  // CSV export is enabled only when all pitches have both appetite and tier set
  const isExportEnabled = appetiteCount === totalPitchCount && rankCount === totalPitchCount;

  const handleExport = () => {
    exportVotes(voterName, votes);
  };

  return (
    <AppBar position="sticky" sx={{ height: 64 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Problem Polling: {voterName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography variant="subtitle1">
            🍽 Appetites {appetiteCount}/{totalPitchCount} • 🗂 Ranked {rankCount}/{totalPitchCount}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          disabled={!isExportEnabled}
          onClick={handleExport}
          aria-label="Export results to CSV"
        >
          Export CSV
        </Button>
      </Toolbar>
    </AppBar>
  );
};
