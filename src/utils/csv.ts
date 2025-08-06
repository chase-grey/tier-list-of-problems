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
 * Exports all votes to a CSV file and triggers download
 * 
 * @param voterName The name of the current voter
 * @param voterRole The role of the current voter
 * @param votes Object containing problem votes keyed by pitchId
 * @param projectVotes Object containing project votes
 * @param projectInterestVotes Object containing project interest votes
 * @param feedback Optional feedback data to include in the export
 */
export const exportVotes = (
  voterName: string, 
  voterRole: string, 
  votes: Record<string, Vote>, 
  projectVotes: Record<string, any> = {}, 
  projectInterestVotes: Record<string, any> = {},
  feedback?: FeedbackData
) => {
  // First, create a summary row with metadata
  const metadataRows = [
    {
      voterName,
      voterRole,
      type: 'metadata',
      feedbackRating: feedback?.rating || '',
      feedbackComments: feedback?.comments || '',
      exportDate: new Date().toISOString(),
      totalVotes: Object.keys(votes).length + Object.keys(projectVotes).length + Object.keys(projectInterestVotes).length,
      section: '',
      itemId: '',  // Keeping these columns to maintain CSV structure
      appetite: '',
      tier: '',
      interestLevel: '',
      priority: '',
    }
  ];
  
  // Then create problem vote rows
  const problemVoteRows = Object.values(votes).map(v => ({
    voterName,
    voterRole,
    type: 'vote',
    feedbackRating: '',
    feedbackComments: '',
    exportDate: '',
    totalVotes: '',
    section: 'problems',
    itemId: v.pitchId,
    appetite: v.appetite || '',
    tier: v.tier || '',
    interestLevel: v.interestLevel || '',
    priority: '',
  }));
  
  // Create project vote rows
  const projectVoteRows = Object.entries(projectVotes).map(([id, vote]) => ({
    voterName,
    voterRole,
    type: 'project-vote',
    feedbackRating: '',
    feedbackComments: '',
    exportDate: '',
    totalVotes: '',
    section: 'projects',
    itemId: id,
    appetite: '',
    tier: '',
    interestLevel: '',
    priority: vote.priority || '',
  }));
  
  // Create project interest vote rows
  const projectInterestVoteRows = Object.entries(projectInterestVotes).map(([id, vote]) => ({
    voterName,
    voterRole,
    type: 'project-interest-vote',
    feedbackRating: '',
    feedbackComments: '',
    exportDate: '',
    totalVotes: '',
    section: 'project-interest',
    itemId: id,
    appetite: '',
    tier: '',
    interestLevel: vote.interestLevel || '',
    priority: '',
  }));
  
  // Combine all rows
  const rows = [
    ...metadataRows, 
    ...problemVoteRows, 
    ...projectVoteRows, 
    ...projectInterestVoteRows
  ];
  
  const csv = unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const name = `${voterName.replace(/\s+/g, '_')}.csv`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};
