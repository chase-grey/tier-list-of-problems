/**
 * Background styling for the application
 */

// Import ferns SVG for background
import fernsSvg from '../assets/backgrounds/ferns.svg';

/**
 * Background styles with subtle nature elements
 */
export const backgroundStyles = {
  // Main background with ferns
  appBackground: {
    backgroundImage: `url(${fernsSvg})`,
    backgroundSize: '100% auto',
    backgroundAttachment: 'fixed',
    backgroundPosition: 'center',
    backgroundColor: '#121212', // Keep dark theme base color
  },
  
  // Overlay to ensure text remains readable
  mainContentArea: {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(18, 18, 18, 0.6)', // Semi-transparent overlay to maintain readability
      zIndex: -1,
    },
    height: '100%',
    overflow: 'auto',
  }
};
