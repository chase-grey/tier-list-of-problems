/**
 * Utilities for consistent card sorting and positioning across all components.
 * This provides common functions for ProjectBoard, InterestRanking, and other card-based views.
 */
import type { ProjectVote } from '../types/project-models';
import type { Vote } from '../types/models';

/**
 * Calculates a new order value for a card being inserted at a specific position.
 * Works with both priority columns and unsorted columns.
 * 
 * @param itemsBefore - Array of items (votes or other items) that come before the insertion point
 * @param itemsAfter - Array of items (votes or other items) that come after the insertion point
 * @param getOrderValue - Function to extract the order value from an item
 * @returns The new order value positioned between the surrounding items
 */
/**
 * Maximum allowed order value to prevent integer overflow issues
 * This is much smaller than MAX_SAFE_INTEGER but still allows plenty of room for ordering
 */
const MAX_ORDER_VALUE = 1000000000; // 1 billion

/**
 * Minimum allowed order value to prevent integer underflow issues
 */
const MIN_ORDER_VALUE = -1000000000; // -1 billion

/**
 * Default step size for when items are added at the beginning or end
 */
const DEFAULT_STEP = 1000;

export function calculateCardOrder<T>(
  itemsBefore: T[],
  itemsAfter: T[],
  getOrderValue: (item: T) => number
): number {
  // Log input data for debugging
  console.log('Calculating card order:', {
    beforeItems: itemsBefore.length,
    afterItems: itemsAfter.length
  });

  // Case: Inserting at the beginning
  if (itemsBefore.length === 0) {
    if (itemsAfter.length === 0) {
      // No items, use a small value based on current time
      // Use modulo to keep it reasonably small
      return Date.now() % 100000;
    }
    // Get first item's order and place before it
    const firstOrder = getOrderValue(itemsAfter[0]);
    const newOrder = Math.max(MIN_ORDER_VALUE, firstOrder - DEFAULT_STEP);
    console.log(`Inserting at beginning: ${newOrder} (before ${firstOrder})`);
    return newOrder;
  }
  
  // Case: Inserting at the end
  if (itemsAfter.length === 0) {
    const lastOrder = getOrderValue(itemsBefore[itemsBefore.length - 1]);
    const newOrder = Math.min(MAX_ORDER_VALUE, lastOrder + DEFAULT_STEP);
    console.log(`Inserting at end: ${newOrder} (after ${lastOrder})`);
    return newOrder;
  }
  
  // Case: Inserting between items
  const beforeOrder = getOrderValue(itemsBefore[itemsBefore.length - 1]);
  const afterOrder = getOrderValue(itemsAfter[0]);
  
  // Detect if the order values are too close together or if they might cause overflow
  const orderDiff = afterOrder - beforeOrder;
  
  if (Math.abs(orderDiff) < 2) {
    // Orders are too close, regenerate orders for this section with more space
    console.log(`Orders too close: ${beforeOrder} and ${afterOrder}, regenerating`);
    // Calculate a midpoint in a safer range
    return (beforeOrder + afterOrder) / 2;
  }
  
  // Normal case - calculate midpoint with bounds checking
  const rawMidpoint = beforeOrder + (orderDiff / 2);
  const boundedMidpoint = Math.max(MIN_ORDER_VALUE, Math.min(MAX_ORDER_VALUE, rawMidpoint));
  
  console.log(`Inserting between: ${boundedMidpoint} (between ${beforeOrder} and ${afterOrder})`);
  return boundedMidpoint;
}

/**
 * Sorts items based on their order property (with fallbacks).
 * Works with both ProjectVotes and regular Votes.
 * 
 * @param items - Array of items to sort
 * @param getOrderValue - Function to extract the order value from an item (with fallbacks)
 * @returns Sorted array of items
 */
export function sortByOrder<T>(
  items: T[],
  getOrderValue: (item: T) => number
): T[] {
  return [...items].sort((a, b) => getOrderValue(a) - getOrderValue(b));
}

/**
 * Gets the order value from a ProjectVote with appropriate fallbacks.
 * 
 * @param vote - The vote object
 * @param useUnsortedOrder - Whether to use unsortedOrder (for unsorted column)
 * @param defaultValue - Default value if no order is found
 * @returns The order value to use for sorting
 */
export function getProjectVoteOrder(
  vote: ProjectVote | undefined, 
  useUnsortedOrder: boolean = false,
  defaultValue: number = 0
): number {
  if (!vote) return defaultValue;
  
  if (useUnsortedOrder) {
    return vote.unsortedOrder ?? vote.timestamp ?? defaultValue;
  } else {
    return vote.order ?? vote.timestamp ?? defaultValue;
  }
}

/**
 * Gets the order value from a regular Vote with appropriate fallbacks.
 * 
 * @param vote - The vote object for interest ranking
 * @param defaultValue - Default value if no order is found
 * @returns The order value to use for sorting
 */
export function getInterestVoteOrder(
  vote: Vote | undefined,
  defaultValue: number = 0
): number {
  if (!vote) return defaultValue;
  return vote.order ?? vote.timestamp ?? defaultValue;
}

/**
 * Prepares arrays needed for calculating card order during reordering.
 * Handles the common pattern of separating items before and after the insertion point.
 * 
 * @param allItems - All items in the column (excluding the one being moved)
 * @param destinationIndex - The index where the item is being dropped
 * @returns Object containing arrays of items before and after the drop point
 */
export function prepareItemsForOrdering<T>(
  allItems: T[],
  destinationIndex: number
): { itemsBefore: T[], itemsAfter: T[] } {
  // Items that come before the drop point
  const itemsBefore = allItems.slice(0, destinationIndex);
  
  // Items that come after the drop point
  const itemsAfter = allItems.slice(destinationIndex);
  
  return { itemsBefore, itemsAfter };
}
