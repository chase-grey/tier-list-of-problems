import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  LinearProgress,
  Alert
} from '@mui/material';
import { fetchResults, fetchPitches } from '../services/api';
import type { ResultItem } from '../services/api';
import type { Pitch } from '../types/models';

/**
 * Admin dashboard component to display vote results
 */
const AdminResults: React.FC = () => {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pitches, setPitches] = useState<Record<string, Pitch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch results and pitches on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch both results and pitches in parallel
        const [resultsData, pitchesData] = await Promise.all([
          fetchResults(),
          fetchPitches()
        ]);
        
        // Convert pitches array to a lookup map by ID
        const pitchesMap = pitchesData.reduce((acc, pitch) => {
          acc[pitch.id] = pitch;
          return acc;
        }, {} as Record<string, Pitch>);
        
        setResults(resultsData);
        setPitches(pitchesMap);
      } catch (err: any) {
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ width: '100%', my: 4 }}>
        <Typography variant="h5" gutterBottom>
          Loading Results...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', my: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', my: 4 }}>
      <Typography variant="h4" gutterBottom>
        Voting Results Dashboard
      </Typography>
      
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Problem Title</TableCell>
              <TableCell align="center">Small (S)</TableCell>
              <TableCell align="center">Medium (M)</TableCell>
              <TableCell align="center">Large (L)</TableCell>
              <TableCell align="center">Mean Tier</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((row) => (
              <TableRow
                key={row.pitch_id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {pitches[row.pitch_id]?.title || 'Unknown Problem'}
                </TableCell>
                <TableCell align="center">{row.small}</TableCell>
                <TableCell align="center">{row.medium}</TableCell>
                <TableCell align="center">{row.large}</TableCell>
                <TableCell align="center">{row.mean_tier.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No results available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminResults;
