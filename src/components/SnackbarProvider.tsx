import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertProps } from '@mui/material';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertProps['severity']) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

/**
 * Hook to use the snackbar functionality
 */
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

/**
 * Provides snackbar notifications throughout the application
 */
export const SnackbarProvider = ({ children }: SnackbarProviderProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertProps['severity']>('info');

  const showSnackbar = (message: string, severity: AlertProps['severity'] = 'info') => {
    setMessage(message);
    setSeverity(severity);
    setOpen(true);
  };

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar 
        open={open} 
        autoHideDuration={5000} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleClose} 
          severity={severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export default SnackbarProvider;
