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
    1: '#7c3aed',      // violet 400
    8: '#f472b6',      // rose 400
    // Interpolated colors for tiers 2-7
    2: '#9333ea',
    3: '#a855f7',
    4: '#c084fc',
    5: '#d946ef',
    6: '#e879f9',
    7: '#f0abfc',
  }
};
