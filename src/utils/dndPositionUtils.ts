/**
 * DnD Position Utilities
 * 
 * Enhanced position utilities for working with dnd-kit drag and drop operations
 * with improved accuracy and smoother transitions.
 */

import { calculatePositionBetween, DEFAULT_POSITION_STEP } from './positionUtils';

/**
 * Calculate insert position using enhanced algorithm 
 * Takes advantage of more accurate mouse positioning data from dnd-kit
 * 
 * @param items Array of items with positions
 * @param insertIndex Index where the item is being inserted
 * @param mouseY Mouse Y position relative to container (optional)
 * @returns Calculated position for the dropped item
 */
export function calculateInsertPosition<T extends { position: number }>(
  items: T[],
  insertIndex: number,
  mouseY?: number
): number {
  // If the list is empty, return a default position
  if (items.length === 0) {
    return DEFAULT_POSITION_STEP;
  }
  
  // Sort the items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);
  
  // If dropping at the beginning
  if (insertIndex === 0) {
    return sortedItems.length > 0 
      ? Math.max(0, sortedItems[0].position / 2) // Ensure position is never negative
      : DEFAULT_POSITION_STEP;
  }
  
  // If dropping at the end
  if (insertIndex >= sortedItems.length) {
    const lastPosition = sortedItems[sortedItems.length - 1].position;
    return lastPosition + DEFAULT_POSITION_STEP;
  }
  
  // Dropping between items - calculate weighted position based on mouse position
  const prevItem = sortedItems[insertIndex - 1];
  const nextItem = sortedItems[insertIndex];
  const prevPosition = prevItem.position;
  const nextPosition = nextItem.position;
  
  if (mouseY !== undefined && 'element' in prevItem && 'element' in nextItem) {
    // If we have mouse Y position and elements, we can calculate a weighted position
    // based on where between the two items the mouse is
    const prevElement = (prevItem as any).element;
    const nextElement = (nextItem as any).element;
    
    if (prevElement && nextElement) {
      const prevRect = prevElement.getBoundingClientRect();
      const nextRect = nextElement.getBoundingClientRect();
      
      const prevCenter = prevRect.top + prevRect.height / 2;
      const nextCenter = nextRect.top + nextRect.height / 2;
      const totalDistance = nextCenter - prevCenter;
      
      if (totalDistance > 0) {
        // Calculate how far between the two items the mouse is (0-1)
        const relativePosition = Math.max(0, Math.min(1, (mouseY - prevCenter) / totalDistance));
        
        // Use this to weight the position calculation
        return prevPosition + (nextPosition - prevPosition) * relativePosition;
      }
    }
  }
  
  // Default to simple midpoint if we don't have mouse position data
  return calculatePositionBetween(prevPosition, nextPosition);
}

/**
 * Check if two positions are too close together, requiring rebalancing
 * 
 * @param pos1 First position
 * @param pos2 Second position
 * @param threshold Threshold to consider positions too close (default: 0.001)
 * @returns True if positions are too close
 */
export function arePositionsTooClose(
  pos1: number, 
  pos2: number,
  threshold: number = 0.001
): boolean {
  return Math.abs(pos1 - pos2) < threshold;
}

/**
 * Smooth animation curve for position transitions
 * Uses exponential ease-out for natural movement
 * 
 * @param t Progress (0-1)
 * @returns Eased value (0-1)
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Calculate the closest insertion index based on mouse position
 * with improved precision and better handling of edge cases
 * 
 * @param containerRect DOMRect of the container
 * @param itemRects Array of DOMRects for items in the container
 * @param mouseY Mouse Y position
 * @returns Index to insert at
 */
export function calculatePreciseInsertIndex(
  containerRect: DOMRect,
  itemRects: DOMRect[],
  mouseY: number
): number {
  // If no items, insert at beginning
  if (itemRects.length === 0) {
    return 0;
  }
  
  // Get relative mouse position within container
  const relativeMouseY = mouseY - containerRect.top;
  
  // Handle case where mouse is above first item
  if (relativeMouseY < itemRects[0].top - containerRect.top + (itemRects[0].height * 0.3)) {
    return 0;
  }
  
  // Check each consecutive pair of items
  for (let i = 0; i < itemRects.length - 1; i++) {
    const currentRect = itemRects[i];
    const nextRect = itemRects[i + 1];
    
    const currentBottom = currentRect.top + currentRect.height - containerRect.top;
    const nextTop = nextRect.top - containerRect.top;
    const gap = nextTop - currentBottom;
    
    // If in the gap between items, determine which item to place it after
    if (relativeMouseY >= currentBottom && relativeMouseY <= nextTop) {
      const gapMiddle = currentBottom + gap / 2;
      return relativeMouseY < gapMiddle ? i + 1 : i + 2;
    }
  }
  
  // Check if mouse is over the last item
  const lastRect = itemRects[itemRects.length - 1];
  const lastCenter = lastRect.top + lastRect.height / 2 - containerRect.top;
  
  // If mouse is below center of last item, insert at end
  return relativeMouseY > lastCenter ? itemRects.length : itemRects.length - 1;
}
