/**
 * Utilities for testing and development purposes
 */
import type { Vote, Appetite, Tier } from '../types/models';

/**
 * Generate random votes for all pitches
 * @param pitchIds Array of pitch IDs to generate votes for
 * @returns Object containing random votes for each pitch
 */
export function generateRandomVotes(pitchIds: string[]): Record<string, Vote> {
  const appetites: Appetite[] = ['S', 'M', 'L'];
  const tiers: Tier[] = [1, 2, 3, 4, 5, 6, 7, 8] as Tier[];
  
  return pitchIds.reduce((votes, pitchId) => {
    // Random appetite: S, M, or L
    const appetite = appetites[Math.floor(Math.random() * appetites.length)];
    
    // Random tier from 1-8
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    
    // Current timestamp for consistent ordering
    const timestamp = Date.now() - Math.floor(Math.random() * 1000); // Small random offset for variety
    
    votes[pitchId] = {
      pitchId,
      appetite,
      tier,
      timestamp
    };
    
    return votes;
  }, {} as Record<string, Vote>);
}

/**
 * Check if the app is running in development mode
 * @returns boolean True if in development mode
 */
export function isDevelopmentMode(): boolean {
  // Check if running on GitHub Pages (chase-grey.github.io)
  if (window.location.hostname.includes('github.io')) {
    return false; // Always false on GitHub Pages
  }
  
  // Check if running on localhost
  const isLocalhost = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  
  // For localhost, also verify it's a development environment
  if (isLocalhost) {
    // Check if running in development mode
    // Note: import.meta.env.DEV might not be reliable in all environments
    try {
      return import.meta.env.DEV === true;
    } catch (e) {
      // If env check fails, default to a safer option - hide dev tools
      console.warn('Failed to check development environment:', e);
      return false;
    }
  }
  
  // For all other environments, default to false
  return false;
}
