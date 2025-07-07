/**
 * Mock API Service for Problem-Polling App
 * Used for local development and testing when the Google Apps Script backend is not accessible
 */

/**
 * Mock data storage for votes
 */
const mockVotes: Record<string, any[]> = {
  submissions: []
};

/**
 * Generate a mock CSRF token
 * @returns Promise resolving to a random token
 */
export async function getMockCsrfToken(): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate random token
  return `mock-token-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Submit votes to the mock backend
 * @param payload The vote payload
 * @returns Promise resolving to the number of saved votes
 */
export async function submitMockVotes(payload: any): Promise<number> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Store the submission
  mockVotes.submissions.push({
    timestamp: new Date(),
    voterName: payload.voterName,
    votes: payload.votes
  });
  
  // Log the submission for debugging
  console.log('Mock API - Vote submitted successfully:', {
    voterName: payload.voterName,
    voteCount: payload.votes.length,
    allSubmissions: mockVotes.submissions
  });
  
  return payload.votes.length;
}

/**
 * Mock data persistence for reloads
 */
const STORAGE_KEY = 'mock-api-votes';

/**
 * Load previous mock votes from localStorage
 */
export function loadMockVotes(): Record<string, any[]> {
  try {
    const storedVotes = localStorage.getItem(STORAGE_KEY);
    if (storedVotes) {
      return JSON.parse(storedVotes);
    }
  } catch (e) {
    console.error('Error loading mock votes:', e);
  }
  return { submissions: [] };
}

/**
 * Save mock votes to localStorage
 */
export function saveMockVotes(votes: Record<string, any[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch (e) {
    console.error('Error saving mock votes:', e);
  }
}

/**
 * Check if we should use the mock API
 * This helps us bypass the Google Apps Script during development
 */
export function shouldUseMockApi(): boolean {
  // Check if mock API is explicitly enabled/disabled via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const mockParam = urlParams.get('mock');
  
  // URL param explicitly sets the mode if present
  if (mockParam === 'true') return true;
  if (mockParam === 'false') return false;
  
  // Use REAL API by default now that we've fixed the backend connection issues
  return false;
}
