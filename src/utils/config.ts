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
 * Get the current polling stage.
 * 1   = Stage 1: all users rank priorities on all pitches
 * 2   = Stage 2: QM + dev TL rank interest on pitches that passed Stage 1
 * tl-1 = TL Allocation round 1: dev-to-project matching (non-TLs see wait message)
 * tl-2 = TL Allocation round 2: dev TL + QM assignment (non-TLs see wait message)
 */
export type PollingStage = 1 | 2 | 'tl-1' | 'tl-2';

export const getPollingStage = (): PollingStage => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem('polling.debugStage');
      if (override === '1') return 1;
      if (override === '2') return 2;
      if (override === 'tl-1') return 'tl-1';
      if (override === 'tl-2') return 'tl-2';
    } catch {
      // ignore
    }
  }

  const stage = import.meta.env.VITE_POLLING_STAGE;
  if (stage === '2') return 2;
  if (stage === 'tl-1') return 'tl-1';
  if (stage === 'tl-2') return 'tl-2';
  return 1; // Default to stage 1
};

/**
 * Check if the app is in Stage 2 mode (interest ranking only)
 */
export const isStage2 = (): boolean => {
  return getPollingStage() === 2;
};

/**
 * Check if the app is in a TL allocation stage (tl-1 or tl-2).
 * Non-TLs see a waiting message; dev TLs see the TL allocation view.
 */
export const isTLAllocationStage = (): boolean => {
  const stage = getPollingStage();
  return stage === 'tl-1' || stage === 'tl-2';
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
