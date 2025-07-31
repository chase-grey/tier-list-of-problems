import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface DragErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  fallbackUI?: React.ReactNode;
}

interface DragErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specific for drag and drop operations
 * Catches errors during drag and drop and provides recovery options
 */
class DragErrorBoundary extends Component<DragErrorBoundaryProps, DragErrorBoundaryState> {
  constructor(props: DragErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): DragErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error('Drag and drop error caught by boundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
    
    // Clear drag state from document body
    document.body.classList.remove('dragging');
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallbackUI) {
        return this.props.fallbackUI;
      }
      
      // Otherwise render default error UI
      return (
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            m: 2, 
            maxWidth: 600, 
            mx: 'auto',
            borderLeft: '4px solid #f44336',
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong with drag and drop
          </Typography>
          
          <Box sx={{ my: 2 }}>
            <Typography variant="body1" gutterBottom>
              An error occurred while dragging items. You can try to:
            </Typography>
            
            <Typography component="ul" sx={{ pl: 2 }}>
              <li>Reset the drag and drop state and try again</li>
              <li>Refresh the page if the problem persists</li>
            </Typography>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained"
              color="primary"
              onClick={this.handleReset}
            >
              Reset Drag and Drop
            </Button>
            
            <Button 
              variant="outlined"
              color="secondary"
              onClick={() => window.location.reload()}
              sx={{ ml: 2 }}
            >
              Refresh Page
            </Button>
          </Box>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, overflowX: 'auto' }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {this.state.error?.toString()}
              </Typography>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo?.componentStack}
              </Typography>
            </Box>
          )}
        </Paper>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default DragErrorBoundary;
