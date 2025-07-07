import { unparse } from 'papaparse';
import type { Vote } from '../types/models';

/**
 * Interface for feedback data
 */
export interface FeedbackData {
  rating: number | null;
  comments: string;
}

/**
 * Exports the current votes to a CSV file and triggers download
 * 
 * @param voterName The name of the current voter
 * @param voterRole The role of the current voter
 * @param votes Object containing all votes keyed by pitchId
 * @param feedback Optional feedback data to include in the export
 */
export const exportVotes = (voterName: string, voterRole: string, votes: Record<string, Vote>, feedback?: FeedbackData) => {
  // First, create a summary row with metadata
  const metadataRows = [
    {
      voterName,
      voterRole,
      type: 'metadata',
      feedbackRating: feedback?.rating || '',
      feedbackComments: feedback?.comments || '',
      exportDate: new Date().toISOString(),
      totalVotes: Object.keys(votes).length,
      pitchId: '',  // Keeping these columns to maintain CSV structure
      appetite: '',
      tier: '',
      interestLevel: '',
    }
  ];
  
  // Then create vote rows
  const voteRows = Object.values(votes).map(v => ({
    voterName,
    voterRole,
    type: 'vote',
    feedbackRating: '',
    feedbackComments: '',
    exportDate: '',
    totalVotes: '',
    pitchId: v.pitchId,
    appetite: v.appetite || '',
    tier: v.tier || '',
    interestLevel: v.interestLevel || '',
  }));
  
  // Combine rows
  const rows = [...metadataRows, ...voteRows];
  
  const csv = unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const name = `${voterName.replace(/\s+/g, '_')}.csv`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};
