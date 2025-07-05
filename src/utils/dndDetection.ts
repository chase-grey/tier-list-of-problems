/**
 * Utility to detect drag and drop support in the browser environment
 */

/**
 * Checks if the browser supports drag and drop functionality
 * @returns Boolean indicating if drag-and-drop is supported
 */
export function isDragAndDropSupported(): boolean {
  if (typeof window === 'undefined') {
    return false; // No window means no drag-and-drop (SSR environment)
  }

  // Check if the browser supports the drag events
  const div = document.createElement('div');
  return (
    ('draggable' in div || ('ondragstart' in div && 'ondrop' in div)) && 
    !('ontouchstart' in window && navigator.maxTouchPoints > 0) // Not a touch-only device
  );
}

/**
 * Checks if React is running in Strict Mode
 * This is a heuristic since there's no direct API to check this
 * @returns Boolean indicating if strict mode is likely enabled
 */
export function isLikelyInStrictMode(): boolean {
  // The easiest check is to see if we're in development mode
  return process.env.NODE_ENV === 'development';
}

/**
 * Detects if the current environment is likely to have issues with react-beautiful-dnd
 * @returns Boolean indicating if there might be compatibility issues
 */
export function mightHaveDndIssues(): boolean {
  // Issues are more likely in strict mode or if drag-and-drop isn't supported
  return isLikelyInStrictMode() || !isDragAndDropSupported();
}
