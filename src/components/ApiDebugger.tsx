import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert, 
  Divider,
  TextField,
  Stack
} from '@mui/material';

/**
 * Component to directly test API connectivity
 */
const ApiDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>(import.meta.env.VITE_API_URL || '');

  const testPitchesEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    setResult('');
    
    try {
      const response = await fetch(`${apiUrl}?route=pitches`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(`Error ${response.status}: ${errorText}`);
        console.error('API Error Response:', errorText);
        return;
      }
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('API Response Data:', data);
    } catch (err) {
      setError(`Network error: ${err}`);
      console.error('API Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    setResult('');
    
    try {
      const response = await fetch(`${apiUrl}?route=token`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Token Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        setError(`Error ${response.status}: ${errorText}`);
        console.error('Token API Error Response:', errorText);
        return;
      }
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('Token Response Data:', data);
    } catch (err) {
      setError(`Network error: ${err}`);
      console.error('Token API Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>API Connection Debugger</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Use this tool to test the direct connection to your Google Apps Script backend.
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>API URL Configuration</Typography>
        <TextField
          label="API URL"
          variant="outlined"
          fullWidth
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          margin="normal"
          helperText="The URL of your Google Apps Script web app"
        />
      </Paper>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={testPitchesEndpoint} 
          disabled={isLoading}
          color="primary"
        >
          Test GET /pitches
        </Button>
        <Button 
          variant="contained" 
          onClick={testTokenEndpoint} 
          disabled={isLoading}
          color="secondary"
        >
          Test GET /token
        </Button>
      </Stack>
      
      {isLoading && <CircularProgress sx={{ mb: 2 }} />}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Paper elevation={1} sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>Response:</Typography>
          <Divider sx={{ mb: 2 }} />
          <pre style={{ margin: 0, overflowX: 'auto' }}>
            {result}
          </pre>
        </Paper>
      )}
    </Box>
  );
};

export default ApiDebugger;
