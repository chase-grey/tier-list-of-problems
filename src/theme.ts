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
    // Neutral, subtle color palette with smooth progression and good contrast
    1: '#4338ca',      // Highest Priority (Indigo dark)
    2: '#4f46e5',      // Very High Priority (Indigo medium)
    3: '#6366f1',      // High Priority (Indigo light)
    4: '#6b7280',      // Moderate Priority (Cool gray)
    5: '#71717a',      // Low-Moderate Priority (Gray)
    6: '#78716c',      // Low Priority (Stone gray)
    7: '#825a8e',      // Very Low Priority (Muted purple)
    8: '#9333ea',      // Not a Priority (Medium purple)
  }
};
