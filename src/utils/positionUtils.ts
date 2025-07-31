/**
 * Position Utilities
 * 
 * Provides utility functions for calculating and managing positions
 * for drag-and-drop operations across the application.
 */

// The default spacing between positions
export const DEFAULT_POSITION_STEP = 1.0;
// Threshold to determine when positions are too close and need rebalancing
const POSITION_THRESHOLD = 0.001;

/**
 * Calculate a new position value for an item being dragged and dropped
 * 
 * @param prevPosition Position of the item before the drop target (null if dropping at the beginning)
 * @param nextPosition Position of the item after the drop target (null if dropping at the end)
 * @returns Calculated position between the two items
 */
export function calculatePositionBetween(
  prevPosition: number | null,
  nextPosition: number | null
): number {
  // If both positions are null (empty column), return a default position
  if (prevPosition === null && nextPosition === null) {
    return DEFAULT_POSITION_STEP;
  }
  
  // If dropping at the beginning of the list
  if (prevPosition === null && nextPosition !== null) {
    return nextPosition / 2;
  }
  
  // If dropping at the end of the list
  if (prevPosition !== null && nextPosition === null) {
    return prevPosition + DEFAULT_POSITION_STEP;
  }
  
  // Dropping between items - calculate midpoint
  return ((prevPosition as number) + (nextPosition as number)) / 2;
}

/**
 * Calculate a new position value based on the drop index
 * 
 * @param items Array of items with positions
 * @param dropIndex Index where the item is being dropped
 * @returns Calculated position for the dropped item
 */
export function calculatePositionByIndex<T extends { position: number }>(
  items: T[],
  dropIndex: number
): number {
  // If the list is empty, return a default position
  if (items.length === 0) {
    return DEFAULT_POSITION_STEP;
  }
  
  // Sort the items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);
  
  // If dropping at the beginning
  if (dropIndex === 0) {
    return sortedItems.length > 0 
      ? sortedItems[0].position / 2 
      : DEFAULT_POSITION_STEP;
  }
  
  // If dropping at the end
  if (dropIndex >= sortedItems.length) {
    return sortedItems[sortedItems.length - 1].position + DEFAULT_POSITION_STEP;
  }
  
  // Dropping between items - calculate midpoint
  const prevPosition = sortedItems[dropIndex - 1].position;
  const nextPosition = sortedItems[dropIndex].position;
  
  return (prevPosition + nextPosition) / 2;
}

/**
 * Calculate the closest insertion index based on mouse position
 * 
 * @param containerRect DOMRect of the droppable container
 * @param itemRects Array of DOMRects for the items in the container
 * @param mouseY The Y position of the mouse
 * @returns The closest index to insert at
 */
export function calculateClosestIndex(
  containerRect: DOMRect,
  itemRects: DOMRect[],
  mouseY: number
): number {
  // If no items, insert at the beginning
  if (itemRects.length === 0) {
    return 0;
  }
  
  // Get the relative mouse position within the container
  const relativeMouseY = mouseY - containerRect.top;
  
  // Find the closest item based on the center point of each item
  for (let i = 0; i < itemRects.length; i++) {
    const rect = itemRects[i];
    const itemCenterY = rect.top + rect.height / 2 - containerRect.top;
    
    // If the mouse is above the center of this item, insert before it
    if (relativeMouseY < itemCenterY) {
      return i;
    }
  }
  
  // If we got here, insert at the end
  return itemRects.length;
}

/**
 * Check if positions need to be rebalanced
 * 
 * @param items Array of items with positions
 * @returns True if positions should be rebalanced
 */
export function shouldRebalancePositions<T extends { position: number }>(
  items: T[]
): boolean {
  if (items.length <= 1) {
    return false;
  }
  
  // Sort the items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);
  
  // Check if any consecutive positions are too close
  for (let i = 1; i < sortedItems.length; i++) {
    const diff = sortedItems[i].position - sortedItems[i - 1].position;
    if (diff < POSITION_THRESHOLD) {
      return true;
    }
  }
  
  return false;
}

/**
 * Rebalance positions to be evenly spaced
 * 
 * @param items Array of items with positions
 * @returns New array of items with rebalanced positions
 */
export function rebalancePositions<T extends { position: number }>(
  items: T[]
): T[] {
  if (items.length <= 1) {
    return items;
  }
  
  // Sort the items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);
  
  // Assign new evenly spaced positions
  return sortedItems.map((item, index) => ({
    ...item,
    position: (index + 1) * DEFAULT_POSITION_STEP
  }));
}
