import type { Appetite, Tier } from '../types/models';

/**
 * Utility functions for accessibility support
 */

/**
 * Gets the appropriate aria-label for an appetite button
 * @param appetite The appetite value ('S', 'M', 'L')
 * @returns Appropriate aria-label for the button
 */
export const getAppetiteAriaLabel = (appetite: Appetite): string => {
  switch (appetite) {
    case 'S': return 'Mark as Small effort';
    case 'M': return 'Mark as Medium effort';
    case 'L': return 'Mark as Large effort';
    default: return 'Mark appetite';
  }
};

/**
 * Generates an accessible description for a pitch card
 * @param title The pitch title
 * @param appetite Current appetite setting
 * @param tier Current tier setting
 * @returns A string for screen readers
 */
export const getPitchCardDescription = (
  title: string, 
  appetite: Appetite | null, 
  tier: Tier | null
): string => {
  const appetiteText = appetite 
    ? `Appetite: ${appetite === 'S' ? 'Small' : appetite === 'M' ? 'Medium' : 'Large'}` 
    : 'Appetite not set';
  
  const tierText = tier 
    ? `Tier: ${tier}` 
    : 'Not ranked';

  return `${title}. ${appetiteText}. ${tierText}. Click to view details or drag to change tier.`;
};

/**
 * Provides keyboard support for the drag and drop interface
 * @param event Keyboard event
 * @param callback Function to call when space/enter is pressed
 */
export const handleKeyboardEvent = (
  event: React.KeyboardEvent,
  callback: () => void
): void => {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
    event.preventDefault();
    callback();
  }
};
