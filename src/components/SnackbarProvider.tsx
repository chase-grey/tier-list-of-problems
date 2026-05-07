import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertProps } from '@mui/material';
import { SnackbarContext } from '../context/SnackbarContext';

interface SnackbarProviderProps {
  children: ReactNode;
}

const AUTO_HIDE_MS = 5000;

/**
 * Provides snackbar notifications throughout the application.
 *
 * We run our own setTimeout instead of relying on MUI's autoHideDuration —
 * that built-in timer pauses on hover/focus/window-blur and can get stuck
 * paused if focus shifts to dev tools or another window before the user
 * comes back. Our timer always closes after the duration; clickaway is
 * still ignored so the snackbar isn't dismissed by random outside clicks.
 */
export const SnackbarProvider = ({ children }: SnackbarProviderProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertProps['severity']>('info');
  const [snackbarKey, setSnackbarKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const showSnackbar = (message: string, severity: AlertProps['severity'] = 'info') => {
    setMessage(message);
    setSeverity(severity);
    setSnackbarKey(k => k + 1);
    setOpen(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOpen(false);
    }, AUTO_HIDE_MS);
  };

  useEffect(() => () => clearTimer(), []);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    clearTimer();
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        key={snackbarKey}
        open={open}
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
