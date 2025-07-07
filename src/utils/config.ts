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

/**
 * Configuration object
 */
const config = {
  apiUrl: getApiUrl(),
  adminEnabled: isAdminEnabled(),
  apiConfigured: isApiConfigured(),
};

export default config;
