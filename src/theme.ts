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

export const lightTheme = createTheme({
  ...themeOptions,
  palette: {
    ...themeOptions.palette,
    mode: 'light',
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#111111',
      secondary: '#444444',
    },
  },
});

// Define color tokens for appetites and tiers
export const colorTokens = {
  tiers: {
    // Subtle progression from dark to light blue
    1: '#1e3a8a',      // Highest Priority (Navy blue)
    2: '#1e40af',      // Very High Priority (Dark blue)
    3: '#2563eb',      // High Priority (Royal blue)
    4: '#3b82f6',      // Moderate Priority (Medium blue)
    5: '#4b91fe',      // Low-Moderate Priority (Sky blue)
    6: '#5a9ef8',      // Low Priority (Light blue - adjusted)
    7: '#6aabf2',      // Very Low Priority (Lighter blue)
    8: '#7ab7ec',      // Not a Priority (Lightest blue)
  }
};
