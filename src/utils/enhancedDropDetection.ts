/**
 * Enhanced drop detection functionality to improve edge-case handling in react-beautiful-dnd
 * Specifically helps with dropping items on columns near viewport edges
 */

// No need to import types from the dnd library here

// Store active droppable areas
interface DroppableData {
  id: string;
  rect: DOMRect;
}

// Global state to track active droppables
let activeDroppables: DroppableData[] = [];

/**
 * Initialize enhanced drop detection
 * This should be called when the drag-and-drop interface is mounted
 */
export const initEnhancedDropDetection = () => {
  // Reset state
  activeDroppables = [];
  
  // Add event listener for dragover to track cursor position
  document.addEventListener('dragover', handleDragOver);
};

/**
 * Clean up enhanced drop detection
 * This should be called when the drag-and-drop interface is unmounted
 */
export const cleanupEnhancedDropDetection = () => {
  document.removeEventListener('dragover', handleDragOver);
  activeDroppables = [];
};

/**
 * Register a droppable area with enhanced detection
 * Call this for each droppable area in your interface
 * 
 * @param id - The ID of the droppable area
 * @param element - The DOM element representing the droppable area
 */
export const registerDroppable = (id: string, element: HTMLElement | null) => {
  if (!element) return;
  
  // Get the bounding rect
  const rect = element.getBoundingClientRect();
  
  // Store in our registry
  const existingIndex = activeDroppables.findIndex(d => d.id === id);
  if (existingIndex >= 0) {
    activeDroppables[existingIndex] = { id, rect };
  } else {
    activeDroppables.push({ id, rect });
  }
};

/**
 * Find the best drop target based on cursor position
 * This helps especially with edge columns that might not be fully visible
 * 
 * @param x - Cursor X position
 * @param y - Cursor Y position
 * @returns The best drop target ID or null if none found
 */
export const findBestDropTarget = (x: number, y: number): string | null => {
  // No droppables registered
  if (activeDroppables.length === 0) return null;
  
  // First try exact matching - is the cursor directly over a droppable?
  for (const droppable of activeDroppables) {
    const { rect } = droppable;
    if (
      x >= rect.left && 
      x <= rect.right && 
      y >= rect.top && 
      y <= rect.bottom
    ) {
      return droppable.id;
    }
  }
  
  // If we're near the right edge of the window, check for droppables that extend beyond
  const windowWidth = window.innerWidth;
  if (x > windowWidth - 100) {
    // Find rightmost droppable
    let rightmostDroppable = activeDroppables[0];
    
    for (const droppable of activeDroppables) {
      if (droppable.rect.right > rightmostDroppable.rect.right) {
        rightmostDroppable = droppable;
      }
    }
    
    // If cursor is vertically aligned with this droppable
    if (y >= rightmostDroppable.rect.top && y <= rightmostDroppable.rect.bottom) {
      return rightmostDroppable.id;
    }
  }
  
  return null;
};

/**
 * Handle dragover events to improve drop detection
 */
const handleDragOver = (event: DragEvent) => {
  const { clientX, clientY } = event;
  const targetId = findBestDropTarget(clientX, clientY);
  
  if (targetId) {
    // Find the element and highlight it
    const element = document.querySelector(`[data-rbd-droppable-id="${targetId}"]`);
    if (element) {
      // Add a subtle highlight to indicate it's a valid drop target
      (element as HTMLElement).style.backgroundColor = 'rgba(25, 118, 210, 0.05)';
      
      // Remove highlight after a short delay
      setTimeout(() => {
        (element as HTMLElement).style.backgroundColor = '';
      }, 300);
    }
  }
};
