/**
 * Auto-scroll functionality for drag and drop operations
 * Helps users scroll when dragging items near the edge of the screen
 */

// Constants for auto-scrolling behavior
const SCROLL_SPEED = 25;           // Increased base scrolling speed in pixels per frame
const EDGE_THRESHOLD = 150;        // Increased distance from edge to trigger scrolling (in px)
const SCROLL_INTERVAL = 10;        // Milliseconds between scroll frames
const MAX_EXTRA_SCROLL = 50;      // Extra scrolling amount to ensure access to rightmost elements
let scrollInterval: number | null = null;

/**
 * Sets up auto-scroll functionality during drag operations
 * @param container - The scrollable container element
 */
export const setupAutoScroll = (container: HTMLElement | null) => {
  if (!container) return;
  
  // Clean up any existing interval
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  
  // Track mouse position relative to the container
  let mouseX = 0;
  let isScrolling = false;
  
  const handleMouseMove = (e: MouseEvent) => {
    const containerRect = container.getBoundingClientRect();
    mouseX = e.clientX - containerRect.left;
  };

  const handleDragStart = () => {
    isScrolling = true;
    
    // Start scrolling interval
    scrollInterval = window.setInterval(() => {
      if (!isScrolling) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const scrollWidth = container.scrollWidth;
      const scrollLeft = container.scrollLeft;
      
      // Calculate distance from edges
      const distanceFromLeftEdge = mouseX;
      const distanceFromRightEdge = containerWidth - mouseX;
      
      // Check if we're at the rightmost edge of the container
      const isAtRightEdge = scrollLeft + containerWidth >= scrollWidth;
      const isAtLeftEdge = scrollLeft === 0;
      
      // Determine scroll direction and speed
      if (distanceFromLeftEdge < EDGE_THRESHOLD && !isAtLeftEdge) {
        // Scroll left - faster as you get closer to the edge
        const scrollAmount = Math.round((1 - distanceFromLeftEdge / EDGE_THRESHOLD) * SCROLL_SPEED);
        container.scrollLeft -= scrollAmount;
      } else if (distanceFromRightEdge < EDGE_THRESHOLD && !isAtRightEdge) {
        // Scroll right - faster as you get closer to the edge
        const scrollAmount = Math.round((1 - distanceFromRightEdge / EDGE_THRESHOLD) * SCROLL_SPEED);
        
        // Add extra scroll amount to ensure we can reach the last column
        const extraScroll = isAtRightEdge ? 0 : Math.min(MAX_EXTRA_SCROLL, scrollWidth - scrollLeft - containerWidth);
        container.scrollLeft += scrollAmount + extraScroll;
      } else if (distanceFromRightEdge < EDGE_THRESHOLD * 1.5) {
        // If we're close to the right edge but not inside the threshold, give one final push
        // This helps ensure the rightmost column is reachable
        const remainingScroll = scrollWidth - scrollLeft - containerWidth;
        if (remainingScroll > 0) {
          container.scrollLeft += Math.min(remainingScroll, 5);
        }
      }
    }, SCROLL_INTERVAL);
  };

  const handleDragEnd = () => {
    isScrolling = false;
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  };
  
  // Add event listeners
  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mousedown', handleDragStart);
  container.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('mouseup', handleDragEnd);  // In case mouse is released outside the container
  
  // Return cleanup function
  return () => {
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('mousedown', handleDragStart);
    container.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('mouseup', handleDragEnd);
    
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  };
};
