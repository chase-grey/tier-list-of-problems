/**
 * Configuration utilities for the Problem-Polling App
 * Handles environment variables and feature flags
 */

/**
 * Get the base URL for API requests
 */
export const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || '';
};

/**
 * Check if admin features are enabled
 */
export const isAdminEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_ADMIN === 'true';
};

/**
 * Check if the API is configured
 */
export const isApiConfigured = (): boolean => {
  return !!import.meta.env.VITE_API_URL;
};

export const getPollingCycleId = (): string => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem('polling.debugCycleId');
      if (override) return override;
    } catch {
      // ignore
    }
  }

  return import.meta.env.VITE_POLLING_CYCLE_ID || '';
};

/**
 * Get the current polling stage (1 = priority ranking, 2 = interest ranking)
 * Stage 1: All users rank priorities on all pitches
 * Stage 2: Only QM and dev TL roles rank interest on pitches that passed Stage 1
 */
export const getPollingStage = (): 1 | 2 => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem('polling.debugStage');
      if (override === '1' || override === '2') return parseInt(override) as 1 | 2;
    } catch {
      // ignore
    }
  }

  const stage = import.meta.env.VITE_POLLING_STAGE;
  if (stage === '2') return 2;
  return 1; // Default to stage 1
};

/**
 * Check if the app is in Stage 2 mode (interest ranking only)
 */
export const isStage2 = (): boolean => {
  return getPollingStage() === 2;
};

/**
 * Get the PRJ ID for the current quarter's pitch project
 */
export const getPitchPrjId = (): string => {
  return import.meta.env.VITE_PITCH_PRJ_ID || '';
};

/**
 * Configuration object
 */
const config = {
  apiUrl: getApiUrl(),
  adminEnabled: isAdminEnabled(),
  apiConfigured: isApiConfigured(),
};

export default config;
