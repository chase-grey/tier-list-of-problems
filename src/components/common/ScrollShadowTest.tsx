import React from 'react';
import { Box, Typography, Paper, Button, Container, Grid } from '@mui/material';
import ScrollShadowContainer from './ScrollShadowContainer';

/**
 * Test component for ScrollShadowContainer to verify it works across different browsers and screen sizes
 */
const ScrollShadowTest: React.FC = () => {
  // Generate dummy content to force scrolling
  const generateDummyContent = (count: number) => {
    return Array.from({ length: count }, (_, i) => (
      <Paper key={i} sx={{ p: 2, mb: 1 }}>
        <Typography variant="body1">
          Item {i + 1} - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Etiam at purus rhoncus, iaculis eros vel, molestie justo.
        </Typography>
      </Paper>
    ));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Scroll Shadow Test Page
      </Typography>
      <Typography variant="body1" paragraph>
        This page tests the ScrollShadowContainer component in different configurations to ensure
        it works properly across browsers and screen sizes. Resize the window to test responsiveness.
      </Typography>

      <Grid container spacing={3}>
        {/* Short content (should not show shadows) */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Short Content (No Shadows)
          </Typography>
          <Box sx={{ height: '200px', border: '1px solid #ddd' }}>
            <ScrollShadowContainer maxHeight="100%">
              <Box sx={{ p: 2 }}>
                {generateDummyContent(2)}
              </Box>
            </ScrollShadowContainer>
          </Box>
        </Grid>

        {/* Medium content (should show bottom shadow only initially) */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Medium Content (Bottom Shadow)
          </Typography>
          <Box sx={{ height: '200px', border: '1px solid #ddd' }}>
            <ScrollShadowContainer maxHeight="100%">
              <Box sx={{ p: 2 }}>
                {generateDummyContent(5)}
              </Box>
            </ScrollShadowContainer>
          </Box>
        </Grid>

        {/* Long content (should show bottom shadow initially) */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Long Content (Both Shadows When Scrolled)
          </Typography>
          <Box sx={{ height: '200px', border: '1px solid #ddd' }}>
            <ScrollShadowContainer maxHeight="100%">
              <Box sx={{ p: 2 }}>
                {generateDummyContent(15)}
              </Box>
            </ScrollShadowContainer>
          </Box>
        </Grid>

        {/* Different background color test */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Custom Background Color
          </Typography>
          <Box sx={{ height: '200px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
            <ScrollShadowContainer maxHeight="100%">
              <Box sx={{ p: 2 }}>
                {generateDummyContent(10)}
              </Box>
            </ScrollShadowContainer>
          </Box>
        </Grid>

        {/* Show scrollbar option test */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            With Scrollbar Visible
          </Typography>
          <Box sx={{ height: '200px', border: '1px solid #ddd' }}>
            <ScrollShadowContainer maxHeight="100%" showScrollBar={true}>
              <Box sx={{ p: 2 }}>
                {generateDummyContent(10)}
              </Box>
            </ScrollShadowContainer>
          </Box>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6">Browser Information:</Typography>
        <Typography variant="body2" component="pre" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          {`window.navigator.userAgent: ${window.navigator.userAgent}`}
        </Typography>
      </Box>
    </Container>
  );
};

export default ScrollShadowTest;
