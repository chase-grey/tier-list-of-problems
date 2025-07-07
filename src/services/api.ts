/**
 * API Service for Problem-Polling App
 * Handles communication with the Google Apps Script backend
 */
import type { Pitch, Vote } from '../types/models';
import { getMockCsrfToken, submitMockVotes, shouldUseMockApi } from './mockApi';

// Get the API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Check if the API URL is properly configured
if (!API_BASE_URL) {
  console.error('API_BASE_URL is not configured. Please check your .env file.');
}

// Use mock API by default for development until the backend is fixed
const USE_MOCK_API = true;

// Log the API mode on startup
console.log('Using MOCK API for local development (backend integration pending)');
console.log('Configured API URL:', API_BASE_URL);

/**
 * Format the URL for Google Apps Script with the proper handling for JSONP
 * to avoid CORS issues. Google Apps Script web apps support JSONP which
 * allows us to bypass CORS restrictions.
 * @param route The API route to call
 * @param jsonp Whether to use JSONP (default: true)
 * @returns The formatted URL
 */
function getApiUrl(route: string, jsonp = true): string {
  // Using Google Apps Script's support for JSONP via callback parameter
  if (jsonp) {
    // The callback parameter name is expected to be "callback"
    return `${API_BASE_URL}?route=${route}&callback=_cb_${Date.now()}`;
  }
  
  // Regular API URL without JSONP
  return `${API_BASE_URL}?route=${route}`;
}

/**
 * Error class for API responses
 */
export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Response format for votes submission
 */
interface VoteResponse {
  saved: number;
}

/**
 * Response format for CSRF token
 */
interface TokenResponse {
  nonce: string;
}

/**
 * Response format for results
 */
export interface ResultItem {
  pitch_id: string;
  small: number;
  medium: number;
  large: number;
  mean_tier: number;
}

/**
 * Format for submitting votes
 */
export interface SubmitVotesPayload {
  nonce: string;
  voterName: string;
  votes: Array<{
    pitch_id: string;
    appetite: 'S' | 'M' | 'L';
    tier: number;
  }>;
}

/**
 * Fetches all available pitches from the backend
 */
export async function fetchPitches(): Promise<Pitch[]> {
  try {
    const url = getApiUrl('pitches');
    console.log('Fetching pitches from URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error || 'Failed to fetch pitches',
        response.status,
        error.detail
      );
    }
    
    const data = await response.json();
    
    // Log the received data for debugging
    console.log('Received pitches data:', data);
    
    // Map backend format to frontend format
    return data.map((pitch: any) => ({
      id: pitch.pitch_id,
      title: pitch.title,
      details: {
        problem: pitch.problem,
        idea: pitch.idea,
        characteristics: pitch.characteristics,
      }
    }));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error while fetching pitches', 0);
  }
}

/**
 * Gets a CSRF token from the server
 */
export async function getCsrfToken(): Promise<string> {
  // Use mock API in development
  if (USE_MOCK_API) {
    try {
      console.log('Getting mock CSRF token');
      const token = await getMockCsrfToken();
      console.log('Mock CSRF token received:', token);
      return token;
    } catch (error) {
      console.error('Mock CSRF token error:', error);
      throw new ApiError('Error getting mock CSRF token', 0);
    }
  }
  
  // Use real API in production with CORS workaround
  try {
    // For Google Apps Script, we need a CORS workaround
    // Using JSONP-like approach with <script> tag
    console.log('Fetching CSRF token using JSONP approach for Google Apps Script');
    
    // Create a unique callback name
    const callbackName = `jsonpCallback_${Date.now()}`;
    const tokenUrl = `${API_BASE_URL}?route=token&callback=${callbackName}`;
    console.log('Token URL with callback:', tokenUrl);
    
    // Create a promise that will be resolved by the JSONP callback
    const tokenPromise = new Promise<string>((resolve, reject) => {
      // Set up the global callback function
      (window as any)[callbackName] = (data: any) => {
        // Clean up the script tag and callback
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any)[callbackName];
        
        // Check if the response has the expected data
        if (data && data.nonce) {
          console.log('JSONP token received:', data.nonce);
          resolve(data.nonce);
        } else {
          reject(new Error('Invalid token response'));
        }
      };
      
      // Set up error handling
      const handleError = () => {
        // Clean up
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as any)[callbackName];
        
        reject(new Error('Failed to load token script'));
      };
      
      // Create and append the script tag
      const script = document.createElement('script');
      script.src = tokenUrl;
      script.async = true;
      script.onerror = handleError;
      
      // Add a timeout for safety
      const timeoutId = setTimeout(() => {
        handleError();
      }, 10000); // 10 seconds timeout
      
      // Add onload to clear the timeout
      script.onload = () => {
        clearTimeout(timeoutId);
        // The callback will handle the rest
      };
      
      document.head.appendChild(script);
    });
    
    // Wait for the token
    return await tokenPromise;
  } catch (error) {
    console.error('CSRF token fetch failed:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Network error while getting CSRF token: ${error}`, 0);
  }
}

/**
 * Submits votes to the backend
 * 
 * Simplified version that doesn't require CSRF tokens
 */
export async function submitVotes(payload: SubmitVotesPayload): Promise<number> {
  // Use mock API in development
  if (USE_MOCK_API) {
    try {
      console.log('Submitting votes to mock API');
      console.log('Vote payload:', JSON.stringify(payload, null, 2));
      const savedCount = await submitMockVotes(payload);
      console.log('Mock votes submitted successfully, saved count:', savedCount);
      return savedCount;
    } catch (error) {
      console.error('Mock vote submission error:', error);
      throw new ApiError('Error submitting votes to mock API', 0);
    }
  }
  
  // Use real API with simplified approach
  try {
    // For simplicity, we're using direct fetch with JSON
    console.log('Submitting votes directly to API');
    console.log('Vote payload:', JSON.stringify(payload, null, 2));
    
    // Create simplified payload without CSRF token
    const simplifiedPayload = {
      voterName: payload.voterName,
      votes: payload.votes
    };
    
    // Direct POST to the API
    const response = await fetch(`${API_BASE_URL}?route=vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simplifiedPayload)
    });
    
    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new ApiError(errorJson.error || 'Vote submission failed', response.status);
      } catch (parseError) {
        throw new ApiError(`Vote submission failed: ${errorText}`, response.status);
      }
    }
    
    const data = await response.json();
    console.log('Vote submission response:', data);
    
    if (data.saved !== undefined) {
      return data.saved;
    } else {
      throw new ApiError('Invalid response format', 0);
    }
  } catch (error) {
    console.error('Vote submission failed:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Network error while submitting votes: ${error}`, 0);
  }
}

/**
 * Fetches aggregated results (admin only)
 */
export async function fetchResults(): Promise<ResultItem[]> {
  try {
    const url = getApiUrl('results');
    console.log('Fetching results from URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        error.error || 'Failed to fetch results',
        response.status,
        error.detail
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error while fetching results', 0);
  }
}

/**
 * Convert frontend votes to backend format
 */
export function convertVotesToApiFormat(votes: Record<string, Vote>): Array<{pitch_id: string; appetite: 'S' | 'M' | 'L'; tier: number}> {
  return Object.entries(votes).map(([pitchId, vote]) => ({
    pitch_id: pitchId,
    appetite: vote.appetite,
    tier: vote.tier
  }));
}
