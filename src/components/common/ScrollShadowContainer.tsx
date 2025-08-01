import React, { useRef, useState, useEffect } from 'react';
import { Box, styled } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

// Define types for the component props
interface ScrollShadowContainerProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  className?: string;
  showScrollBar?: boolean;
  sx?: SxProps<Theme>;
}

// Create styled components for the shadow effects
const ShadowContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'showScrollBar',
})<{ showScrollBar?: boolean }>(({ showScrollBar }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  ...(showScrollBar ? {} : {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
    scrollbarWidth: 'none', // Firefox
    '-ms-overflow-style': 'none', // IE and Edge
  }),
}));

const TopShadow = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '30px',
  pointerEvents: 'none',
  // DEBUG: Bright red solid background for visibility testing
  background: '#ff0000', // Bright red for debugging
  zIndex: 1000, // Very high z-index to ensure visibility
  transition: 'opacity 0.2s ease',
}));

const BottomShadow = styled(Box)(() => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '30px',
  pointerEvents: 'none',
  // DEBUG: Bright green solid background for visibility testing
  background: '#00ff00', // Bright green for debugging
  zIndex: 1000, // Very high z-index to ensure visibility
  transition: 'opacity 0.2s ease',
}));

/**
 * ScrollShadowContainer - A component that replaces standard scrollbars with elegant shadow indicators
 * 
 * This component wraps content that needs vertical scrolling and displays shadows at the top and/or bottom
 * to indicate when there is more content available to scroll to.
 */
const ScrollShadowContainer: React.FC<ScrollShadowContainerProps> = ({
  children,
  maxHeight = '100%',
  className = '',
  showScrollBar = false,
  sx = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  /**
   * Check if scrolling is possible and update shadow visibility accordingly
   */
  const checkScrollability = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      
      // Show top debug box only when scrolled down from top
      setShowTopShadow(scrollTop > 0);
      
      // Show bottom debug box only when there's more content below to scroll to
      // The -1 accounts for potential rounding errors
      setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 1);
    }
  };

  // Check scrollability on mount and window resize
  useEffect(() => {
    checkScrollability();
    
    const handleResize = () => {
      checkScrollability();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // On mount and when children change, check scrollability
  useEffect(() => {
    // Small delay to ensure content is properly rendered
    const timer = setTimeout(checkScrollability, 50);
    return () => clearTimeout(timer);
  }, [children]);
  
  // Force an initial check for scrollability once component has mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100); // Slightly longer delay for initial load
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Box sx={{ 
      position: 'relative', 
      maxHeight, 
      height: '100%', 
      width: '100%', 
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden', // Prevent shadows from extending outside container
      ...sx 
    }} 
    className={className}>
      {/* Top shadow - only visible when scrolled down */}
      <TopShadow sx={{ opacity: showTopShadow ? 1 : 0, zIndex: 10 }} />
      
      {/* Scrollable container */}
      <ShadowContainer
        ref={containerRef}
        onScroll={checkScrollability}
        showScrollBar={showScrollBar}
        sx={{
          overflowY: 'auto',
          height: '100%',
          width: '100%',
          position: 'relative',
          flexGrow: 1,
        }}
      >
        {children}
      </ShadowContainer>
      
      {/* Bottom shadow - positioned outside the container at the bottom */}
      <BottomShadow 
        sx={{ 
          opacity: showBottomShadow ? 1 : 0, 
          zIndex: 10,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }} 
      />
    </Box>
  );
};

export default ScrollShadowContainer;
