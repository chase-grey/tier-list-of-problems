import { useContext } from 'react';
import { SnackbarContext, type SnackbarContextType } from '../context/SnackbarContext';

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
