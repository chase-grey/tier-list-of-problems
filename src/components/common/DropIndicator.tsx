import React from 'react';
import { Box } from '@mui/material';

interface DropIndicatorProps {
  isVisible: boolean;
  isHorizontal?: boolean;
  isAnimated?: boolean; // New prop for enhanced animation
  color?: string; // Custom color option
  thickness?: number; // Custom thickness option
}

/**
 * A visual indicator that shows where a dragged item will be placed when dropped
 * Appears as a horizontal or vertical line
 */
const DropIndicator: React.FC<DropIndicatorProps> = ({
  isVisible, 
  isHorizontal = true,
  isAnimated = false,
  color = 'primary.main',
  thickness = 3
}) => {
  if (!isVisible) return null;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        backgroundColor: color,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isAnimated ? 1 : 0.8,
        zIndex: 5,
        boxShadow: isAnimated 
          ? '0 0 8px rgba(25, 118, 210, 0.8), 0 0 3px rgba(25, 118, 210, 1)' 
          : '0 0 4px rgba(25, 118, 210, 0.5)',
        transform: isAnimated ? 'scale(1.05)' : 'scale(1)',
        transformOrigin: 'center',
        borderRadius: `${thickness}px`,
        ...(isHorizontal 
          ? {
              height: `${thickness}px`,
              width: '100%',
              left: 0,
              marginY: '2px',
              // Enhanced animation based on props
              animation: isAnimated 
                ? 'dropIndicatorPulse 0.6s infinite alternate ease-in-out' 
                : 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 0.8 },
                '50%': { opacity: 0.4 },
                '100%': { opacity: 0.8 },
              },
              '@keyframes dropIndicatorPulse': {
                '0%': { opacity: 0.9, transform: 'scaleY(1)', boxShadow: '0 0 5px rgba(25, 118, 210, 0.8)' },
                '100%': { opacity: 1, transform: 'scaleY(1.5)', boxShadow: '0 0 10px rgba(25, 118, 210, 1)' },
              },
            } 
          : {
              width: `${thickness}px`,
              height: '100%',
              top: 0,
              marginX: '2px',
              // Enhanced animation based on props
              animation: isAnimated 
                ? 'dropIndicatorPulseVertical 0.6s infinite alternate ease-in-out' 
                : 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 0.8 },
                '50%': { opacity: 0.4 },
                '100%': { opacity: 0.8 },
              },
              '@keyframes dropIndicatorPulseVertical': {
                '0%': { opacity: 0.9, transform: 'scaleX(1)', boxShadow: '0 0 5px rgba(25, 118, 210, 0.8)' },
                '100%': { opacity: 1, transform: 'scaleX(1.5)', boxShadow: '0 0 10px rgba(25, 118, 210, 1)' },
              },
            })
      }}
      role="presentation"
    />
  );
};

export default DropIndicator;
