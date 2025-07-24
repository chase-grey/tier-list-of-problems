import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider, CssBaseline, Box, Typography, Paper } from '@mui/material';
import { darkTheme } from './theme';
import { mockProjects } from './components/ProjectBoard/mockData';

// Debug component that doesn't use DnD at all
const SimpleTestComponent = () => {
  // Console logs for debugging
  console.log('SimpleTestComponent rendering');
  console.log('Mock projects:', mockProjects);
  
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Simple Test App (No DnD)
      </Typography>
      <Typography variant="body1" paragraph>
        This is a simplified test app that doesn't use drag and drop functionality.
      </Typography>
      
      {mockProjects.map(project => (
        <Paper 
          key={project.id} 
          sx={{ 
            p: 2, 
            mb: 2, 
            border: '1px solid #ccc',
            borderRadius: 2
          }}
        >
          <Typography variant="h6">{project.title}</Typography>
          <Typography variant="body2">
            Appetite: {project.appetite}
          </Typography>
          <Typography variant="body2">
            Hours: {project.details.hourEstimate}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

// Debug message to confirm this file is loading
console.log('simple-test.tsx loaded - starting Simplified Test App');

// Create the app with StrictMode
const app = (
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SimpleTestComponent />
    </ThemeProvider>
  </StrictMode>
);

// Render the TestApp to the DOM
console.log('Attempting to render to DOM element with id "root"');
const rootElement = document.getElementById('root');
console.log('Root element found:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(app);
  console.log('App rendered successfully');
} else {
  console.error('Root element not found in DOM');
}
