import type { Appetite, InterestLevel, Tier } from '../types/models';

/**
 * Helper functions for vote-related actions
 * This centralizes the mapping logic that was previously duplicated across components
 */

/**
 * Maps a tier level (1-4) to interest level (1-4)
 * This was duplicated across App.tsx and InterestRanking.tsx
 */
export const mapTierToInterestLevel = (tier: Tier): InterestLevel => {
  if (tier === 1) return 4;      // Tier 1 → Very Interested
  else if (tier === 2) return 3; // Tier 2 → Interested
  else if (tier === 3) return 2; // Tier 3 → Somewhat Interested
  else return 1;                 // Tier 4 → Not Interested
};

/**
 * Converts an interest level to a human-readable label
 */
export const getInterestLevelLabel = (interestLevel: InterestLevel): string => {
  const interestLabels = [
    'Very Interested',      // Level 4
    'Interested',           // Level 3
    'Somewhat Interested',  // Level 2
    'Not Interested'        // Level 1
  ];
  
  const levelIndex = 4 - interestLevel; // Convert from level (4-1) to index (0-3)
  return interestLabels[levelIndex];
};

/**
 * Converts an appetite value to a human-readable label
 */
export const getAppetiteLabel = (appetite: Appetite): string => {
  switch (appetite) {
    case 'S': return 'Small';
    case 'M': return 'Medium';
    case 'L': return 'Large';
    default: return '';
  }
};
