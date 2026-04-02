import { unparse } from 'papaparse';
import type { Pitch, Vote } from '../types/models';
import { getPollingStage, getPollingCycleId } from './config';

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
export const exportVotes = (voterName: string, voterRole: string, votes: Record<string, Vote>, pitches?: Pitch[], feedback?: FeedbackData) => {
  const categoryByPitchId = new Map((pitches || []).map(p => [p.id, p.category]));

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
      pitchId: '',
      tier: '',
      interestLevel: '',
      category: '',
    }
  ];

  // Then create vote rows
  const voteRows = Object.entries(votes).map(([pitchId, v]) => ({
    voterName,
    voterRole,
    type: 'vote',
    feedbackRating: '',
    feedbackComments: '',
    exportDate: '',
    totalVotes: '',
    pitchId,
    tier: v.tier || '',
    interestLevel: v.interestLevel || '',
    category: categoryByPitchId.get(pitchId) || '',
  }));
  
  // Combine rows
  const rows = [...metadataRows, ...voteRows];
  
  const csv = unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Build filename with quarter and stage info
  // Format: FirstName_LastName_Aug26_Stage1.csv
  const cycleId = getPollingCycleId();
  const stage = getPollingStage();
  const quarterPart = cycleId.replace(/\s+/g, '').replace("'", ''); // Clean up any spaces/apostrophes
  const name = `${voterName.replace(/\s+/g, '_')}_${quarterPart}_Stage${stage}.csv`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};
