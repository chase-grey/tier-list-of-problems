import type { Tier } from '../types/models';

/**
 * Utility functions for accessibility support
 */

/**
 * Generates an accessible description for a pitch card
 * @param title The pitch title
 * @param tier Current tier setting
 * @returns A string for screen readers
 */
export const getPitchCardDescription = (
  title: string, 
  tier: Tier | null
): string => {
  const tierText = tier 
    ? `Tier: ${tier}` 
    : 'Not ranked';

  return `${title}. ${tierText}. Click to view details or drag to change tier.`;
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
