import { useContext } from 'react';
import { SnackbarContext } from '../components/SnackbarProvider';
import type { SnackbarContextType } from '../components/SnackbarProvider';

/**
 * Hook to use the snackbar functionality
 */
export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
