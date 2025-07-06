import { createContext } from 'react';
import type { AlertProps } from '@mui/material';

export interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertProps['severity']) => void;
}

// Create the context with undefined as default value
export const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);
