import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { colorTokens } from '../../theme';

/**
 * Displays a legend for appetite dots
 */
const AppetiteLegend: React.FC = () => {
  const legendItems = [
    { color: colorTokens.appetites.unset, label: 'Unset' },
    { color: colorTokens.appetites.small, label: 'Small' },
    { color: colorTokens.appetites.medium, label: 'Medium' },
    { color: colorTokens.appetites.large, label: 'Large' },
  ];

  return (
    <Paper 
      sx={{ 
        p: 2, 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        width: 'fit-content',
        mx: 'auto'
      }}
    >
      {legendItems.map((item) => (
        <Box 
          key={item.label} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}
        >
          <Box 
            sx={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%', 
              backgroundColor: item.color 
            }}
            aria-hidden="true"
          />
          <Typography variant="body2">{item.label}</Typography>
        </Box>
      ))}
    </Paper>
  );
};

export default AppetiteLegend;
