/**
 * Utility for monitoring drag-and-drop performance
 * 
 * Provides tools for tracking frame rates and performance during drag operations
 * to help optimize rendering and improve user experience during interactions.
 */

/**
 * Performance metrics tracked during drag operations
 */
interface PerformanceMetrics {
  /** Current calculated frame rate (frames per second) */
  frameRate: number;
  /** Timestamp when the drag operation started */
  dragStartTime: number | null;
  /** Timestamp of the last animation frame */
  lastFrameTime: number | null;
  /** Total number of frames processed in the current drag */
  frameCount: number;
  /** Whether a drag operation is currently active */
  isDragging: boolean;
  /** ID of the item being dragged */
  activeItemId: string | null;
  /** ID of the current animation frame request */
  requestId: number | null;
}

/**
 * Create a new performance metrics tracker for drag operations
 * 
 * @returns An object containing metrics and methods for monitoring drag performance
 */
export const createPerformanceMonitor = () => {
  const metrics: PerformanceMetrics = {
    frameRate: 0,
    dragStartTime: null,
    lastFrameTime: null,
    frameCount: 0,
    isDragging: false,
    activeItemId: null,
    requestId: null
  };

  /**
   * Monitor frame performance during dragging
   */
  const monitorFrame = (time: number) => {
    if (!metrics.isDragging) return;

    // Calculate frame rate on every frame
    if (metrics.lastFrameTime !== null) {
      const delta = time - metrics.lastFrameTime;
      const fps = 1000 / delta;
      
      // Update rolling average frame rate (with higher weight for recent frames)
      metrics.frameRate = metrics.frameRate * 0.9 + fps * 0.1;
      metrics.frameCount++;
    }
    
    // Save last frame time for next calculation
    metrics.lastFrameTime = time;
    
    // Continue monitoring frames while dragging
    metrics.requestId = requestAnimationFrame(monitorFrame);
  };

  /**
   * Start monitoring performance when drag begins
   */
  const startMonitoring = () => {
    metrics.dragStartTime = performance.now();
    metrics.lastFrameTime = null;
    metrics.frameCount = 0;
    metrics.isDragging = true;
    metrics.frameRate = 60; // Start with an ideal assumption
    
    if (metrics.requestId === null) {
      metrics.requestId = requestAnimationFrame(monitorFrame);
    }
  };

  /**
   * Stop monitoring performance when drag ends
   */
  const stopMonitoring = () => {
    metrics.isDragging = false;
    metrics.activeItemId = null;
    
    if (metrics.requestId !== null) {
      cancelAnimationFrame(metrics.requestId);
      metrics.requestId = null;
    }
  };

  /**
   * Set the currently active item being dragged
   */
  const setActiveItem = (itemId: string | null) => {
    metrics.activeItemId = itemId;
  };

  return {
    metrics,
    monitorFrame,
    startMonitoring,
    stopMonitoring,
    setActiveItem
  };
};
