import React from 'react';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { darkTheme } from '../theme';

/**
 * Minimal app component to diagnose rendering issues
 */
const MinimalApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100vh',
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          Problem-Polling App Diagnostic
        </Typography>
        <Typography variant="body1" paragraph>
          If you can see this page, the basic React rendering is working.
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => alert('UI is working!')}
        >
          Test UI
        </Button>
      </Box>
    </ThemeProvider>
  );
};

export default MinimalApp;
