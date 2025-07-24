import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from './theme';
import TestApp from './components/ProjectBoard/TestApp'

// Debug message to confirm this file is loading
console.log('test-app.tsx loaded - starting Project Prioritization App test')

// Create the app with StrictMode
const app = (
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TestApp />
    </ThemeProvider>
  </StrictMode>
);

// Render the TestApp to the DOM
createRoot(document.getElementById('root')!).render(app);
