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
    // Enhanced colors with consistent saturation and better contrast
    1: '#6d28d9',      // Highest Priority (Deep purple)
    2: '#7c3aed',      // Very High Priority (Medium purple)
    3: '#8b5cf6',      // High Priority (Light purple)
    4: '#3b82f6',      // Moderate Priority (Blue)
    5: '#0ea5e9',      // Low-Moderate Priority (Light blue)
    6: '#0d9488',      // Low Priority (Teal)
    7: '#be185d',      // Very Low Priority (Dark pink)
    8: '#c026d3',      // Not a Priority (Magenta)
  }
};
