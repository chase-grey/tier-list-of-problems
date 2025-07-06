import { createTheme } from '@mui/material';
import type { ThemeOptions } from '@mui/material';

// Define theme options object that's compatible with MUI v7
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary:  { main: '#6d5dfc' },      // violet 500
    secondary:{ main: '#fca311' },      // amber 500
    background:{
      default:'#121212',
      paper:  '#1d1d1d',
    },
    text:{
      primary:  '#f1f1f1',
      secondary:'#bdbdbd',
    },
  },
  components:{
    MuiPaper:{ styleOverrides:{ root:{ borderRadius:8 } } },
  },
};

// Create and export the theme
export const darkTheme = createTheme(themeOptions);

// Define color tokens for appetites and tiers
export const colorTokens = {
  appetites: {
    small: '#2ecc71',   // Green
    medium: '#f39c12',  // Amber
    large: '#e74c3c',   // Red
    unset: '#7f8c8d',   // Gray
  },
  tiers: {
    // Consistent blue palette with different shades for all tiers
    1: '#1e40af',      // Highest Priority (Darkest blue)
    2: '#1d4ed8',      // Very High Priority (Very dark blue)
    3: '#2563eb',      // High Priority (Dark blue)
    4: '#3b82f6',      // Moderate Priority (Medium blue)
    5: '#60a5fa',      // Low-Moderate Priority (Blue)
    6: '#93c5fd',      // Low Priority (Light blue - darkened for contrast)
    7: '#3b5998',      // Very Low Priority (Facebook blue - good contrast)
    8: '#0369a1',      // Not a Priority (Dark sky blue)
  }
};
