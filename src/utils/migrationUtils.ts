/**
 * Utilities for migrating from CSV-based storage to the Google Sheets API
 */
import type { Vote } from '../types/models';
import { submitVotes, getCsrfToken } from '../services/api';

/**
 * Migrate local storage votes to the backend API
 * @param voterName The name of the voter
 * @param votes The votes to migrate
 * @returns Number of votes successfully migrated
 */
export async function migrateLocalStorageToApi(
  voterName: string, 
  votes: Record<string, Vote>
): Promise<number> {
  // Skip if no votes or no voter name
  if (!voterName || Object.keys(votes).length === 0) {
    return 0;
  }
  
  // Get a CSRF token
  const nonce = await getCsrfToken();
  
  // Convert votes to API format
  const apiVotes = Object.entries(votes)
    .filter(([_, vote]) => vote.appetite && vote.tier) // Filter out incomplete votes
    .map(([pitchId, vote]) => ({
      pitch_id: pitchId,
      appetite: vote.appetite as 'S' | 'M' | 'L', // Type assertion since we filtered undefined
      tier: vote.tier as number // Type assertion since we filtered undefined
    }));
  
  // Submit votes to the API
  const result = await submitVotes({
    nonce,
    voterName,
    votes: apiVotes
  });
  
  return result;
}

/**
 * Check if current votes should be migrated
 * This returns true if there are local votes that haven't been migrated yet
 */
export function shouldMigrateVotes(localVotes: Record<string, Vote>): boolean {
  // If there are local votes and migration hasn't been performed
  const migrationCompleted = localStorage.getItem('polling.migrationCompleted') === 'true';
  const hasLocalVotes = Object.keys(localVotes).length > 0;
  
  return hasLocalVotes && !migrationCompleted;
}

/**
 * Mark migration as completed
 */
export function markMigrationComplete(): void {
  localStorage.setItem('polling.migrationCompleted', 'true');
}
