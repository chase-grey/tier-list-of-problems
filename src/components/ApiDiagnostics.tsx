import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { testTokenEndpoint, testOptionsRequest } from '../utils/directApiTest';

/**
 * A diagnostic component for testing API connection directly
 */
const ApiDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const runTokenTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const result = await testTokenEndpoint();
      setResults(result);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };
  
  const runOptionsTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const result = await testOptionsRequest();
      setResults(result);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>API Connection Diagnostics</Typography>
      <Typography variant="body1" paragraph>
        This tool will help diagnose connection issues with the Google Apps Script backend.
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>API URL</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          {import.meta.env.VITE_API_URL || 'Not configured'}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={runTokenTest}
          disabled={loading}
        >
          Test Token Endpoint
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={runOptionsTest}
          disabled={loading}
        >
          Test OPTIONS Request
        </Button>
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography>Testing connection...</Typography>
        </Box>
      )}
      
      {results && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          <Alert severity={results.success ? "success" : "error"} sx={{ mb: 2 }}>
            {results.success ? "Test succeeded!" : "Test failed!"}
          </Alert>
          
          <Typography variant="subtitle2">Response Details:</Typography>
          <Box 
            component="pre" 
            sx={{ 
              p: 2, 
              bgcolor: 'rgba(0,0,0,0.05)', 
              borderRadius: 1, 
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.875rem'
            }}
          >
            {JSON.stringify(results, null, 2)}
          </Box>
        </Paper>
      )}
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Troubleshooting Guide</Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography><strong>CORS Issues</strong>: If you're getting CORS errors, make sure your Google Apps Script has proper CORS headers in doGet and doOptions functions.</Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography><strong>Deployment Settings</strong>: Check that your script is deployed as a Web App with "Execute as: Me" and "Who has access: Anyone".</Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography><strong>Script Properties</strong>: Make sure the "pepper" property is set in Script Properties.</Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography><strong>Google Sheets Structure</strong>: Verify you have PITCHES, VOTES, RESULTS_VIEW, and VOTERS tabs.</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ApiDiagnostics;
