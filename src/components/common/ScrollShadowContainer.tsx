import React, { useRef, useState, useEffect } from 'react';
import { Box, styled } from '@mui/material';

// Define types for the component props
interface ScrollShadowContainerProps {
  children: React.ReactNode;
  maxHeight?: string | number;
  className?: string;
  showScrollBar?: boolean;
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

const TopShadow = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '30px', // Increased from 20px to 30px for more dramatic effect
  pointerEvents: 'none',
  background: `linear-gradient(to bottom, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper}90 40%, rgba(255,255,255,0) 100%)`, // Darker shadow with improved fade effect
  zIndex: 2,
  transition: 'opacity 0.2s ease',
}));

const BottomShadow = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '30px', // Increased from 20px to 30px for more dramatic effect
  pointerEvents: 'none',
  background: `linear-gradient(to top, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper}90 40%, rgba(255,255,255,0) 100%)`, // Darker shadow with improved fade effect
  zIndex: 2,
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
      
      // Show top shadow if scrolled down
      setShowTopShadow(scrollTop > 0);
      
      // Show bottom shadow if there's more content below
      setShowBottomShadow(scrollTop < scrollHeight - clientHeight - 1); // -1 for rounding errors
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

  return (
    <Box sx={{ position: 'relative', maxHeight, height: '100%' }} className={className}>
      {/* Top shadow - only visible when scrolled down */}
      <TopShadow sx={{ opacity: showTopShadow ? 1 : 0 }} />
      
      {/* Scrollable container */}
      <ShadowContainer
        ref={containerRef}
        onScroll={checkScrollability}
        showScrollBar={showScrollBar}
        sx={{
          overflowY: 'auto',
          height: '100%',
        }}
      >
        {children}
      </ShadowContainer>
      
      {/* Bottom shadow - only visible when there's more content to scroll to */}
      <BottomShadow sx={{ opacity: showBottomShadow ? 1 : 0 }} />
    </Box>
  );
};

export default ScrollShadowContainer;
