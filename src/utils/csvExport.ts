/**
 * Utilities for exporting votes as CSV
 */
import type { Vote } from '../types/models';

/**
 * Converts a record of votes into a CSV string
 * @param votes Record of votes by pitch ID
 * @param voterName Name of the voter
 * @returns CSV formatted string
 */
export function generateVotesCSV(votes: Record<string, Vote>, voterName: string): string {
  // Create CSV header row
  const headerRow = ['voter_name', 'pitch_id', 'appetite', 'tier', 'timestamp'].join(',');
  
  // Convert each vote to a CSV row
  const voteRows = Object.values(votes)
    .filter(vote => vote.appetite && vote.tier) // Only include complete votes
    .map(vote => {
      // Format the row with voter name, pitch id, appetite, tier, timestamp
      const row = [
        escapeCsvField(voterName),
        escapeCsvField(vote.pitchId),
        escapeCsvField(vote.appetite),
        vote.tier,
        vote.timestamp || new Date().getTime()
      ];
      return row.join(',');
    });
  
  // Combine header and data rows
  return [headerRow, ...voteRows].join('\n');
}

/**
 * Helper function to escape special characters in CSV fields
 * @param field The field value to escape
 * @returns Properly escaped CSV field
 */
function escapeCsvField(field: any): string {
  // Convert to string first
  const strValue = String(field);
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  // and double any quotes inside it
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    const escapedValue = strValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
  
  return strValue;
}

/**
 * Create and trigger a download of the votes CSV
 * @param votes Record of votes by pitch ID
 * @param voterName Name of the voter
 */
export function downloadVotesAsCSV(votes: Record<string, Vote>, voterName: string): void {
  // Generate CSV content
  const csvContent = generateVotesCSV(votes, voterName);
  
  // Create a Blob with the CSV data
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create an object URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `votes_${voterName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.display = 'none';
  
  // Append the link to the document
  document.body.appendChild(link);
  
  // Trigger the download
  link.click();
  
  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}
