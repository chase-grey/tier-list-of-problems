import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from './theme';
import TestProjectInterestRanking from './components/ProjectInterestRanking/TestProjectInterestRanking';

// Create a simple test entry point for the ProjectInterestRanking component
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TestProjectInterestRanking />
    </ThemeProvider>
  </React.StrictMode>
);
