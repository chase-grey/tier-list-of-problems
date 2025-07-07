/**
 * Type definitions for the Problem-Polling App
 */

/**
 * Pitch entity - represents a single problem pitch
 */
export interface Pitch {
  id: string;
  title: string;
  details: {
    problem: string;
    idea?: string;
    characteristics?: string;
    [key: string]: any;
  };
}

/**
 * Appetite options for a pitch
 * S = Small (days/week)
 * M = Medium (weeks/month)
 * L = Large (months/quarter)
 */
export type Appetite = 'S' | 'M' | 'L';

/**
 * Tier ranking (1-8)
 * 1 = highest priority
 * 8 = lowest priority
 */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Vote entity - represents a user's vote on a pitch
 */
export interface Vote {
  pitchId: string;
  appetite: Appetite;
  tier: Tier;
}

/**
 * Application state stored in localStorage
 */
export interface AppState {
  voterName: string;
  votes: Record<string, Vote>;
}

/**
 * User information from authentication (if enabled)
 */
export interface User {
  name: string;
  email?: string;
  isAdmin?: boolean;
}
