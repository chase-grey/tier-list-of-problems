import { unparse } from 'papaparse';
import type { Vote } from '../types/models';

/**
 * Exports the current votes to a CSV file and triggers download
 * 
 * @param voterName The name of the current voter
 * @param votes Object containing all votes keyed by pitchId
 */
export const exportVotes = (voterName: string, votes: Record<string, Vote>) => {
  const rows = Object.values(votes).map(v => ({
    voterName,
    pitchId:   v.pitchId,
    appetite:  v.appetite,
    tier:      v.tier,
  }));
  
  const csv = unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const name = `poll-votes_${voterName.replace(/\s+/g, '_')}_${
    new Date().toISOString().slice(0, 10)
  }.csv`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};
