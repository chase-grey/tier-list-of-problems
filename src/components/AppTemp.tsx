import React, { useEffect, useReducer, memo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { darkTheme } from '../theme';

/**
 * This is a simplified temporary version of the AppContent component
 * to help diagnose the syntax error in the original file
 */
const AppContent: React.FC = () => {
  // Minimal state setup
  const [name, setName] = useState<string | null>(null);
  
  // Simple render function
  return (
    <div>
      <h1>Tier List App - Test Component</h1>
      <p>This is a simplified version to test syntax</p>
    </div>
  );
};

/**
 * Wrapped app with providers
 */
const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
};

export default memo(App);
