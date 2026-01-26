import type { InterestLevel, Tier } from '../types/models';

/**
 * Helper functions for vote-related actions
 * This centralizes the mapping logic that was previously duplicated across components
 */

/**
 * Maps a tier level (1-4) to interest level (1-4)
 * This was duplicated across App.tsx and InterestRanking.tsx
 */
export const mapTierToInterestLevel = (tier: Tier): InterestLevel => {
  if (tier === null) return null;  // Null tier → Null interest (unsorted)
  else if (tier === 1) return 1;
  else if (tier === 2) return 2;
  else if (tier === 3) return 3;
  else return 4;
};

/**
 * Converts an interest level to a human-readable label
 */
export const getInterestLevelLabel = (interestLevel: InterestLevel): string => {
  // Handle null case
  if (interestLevel === null) return 'Unsorted';
  
  const interestLabels = [
    'Very Interested',
    'Interested',
    'Somewhat Interested',
    'Not Interested'
  ];

  return interestLabels[interestLevel - 1];
};

