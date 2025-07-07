/**
 * Tests for the API service
 */
import { fetchPitches, getCsrfToken, submitVotes, fetchResults, ApiError } from '../services/api';
import type { Appetite } from '../types';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

// Mock the fetch function
global.fetch = jest.fn() as jest.Mock;

describe('API Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('fetchPitches', () => {
    it('should fetch and transform pitches correctly', async () => {
      // Mock successful response
      const mockPitches = [
        {
          pitch_id: 'pitch-1',
          title: 'Test Pitch 1',
          problem: 'Problem description',
          idea: 'Idea description',
          characteristics: 'Some characteristics'
        }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPitches
      });
      
      const result = await fetchPitches();
      
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?route=pitches'));
      expect(result).toEqual([{
        id: 'pitch-1',
        title: 'Test Pitch 1',
        details: {
          problem: 'Problem description',
          idea: 'Idea description',
          characteristics: 'Some characteristics'
        }
      }]);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'BAD_REQUEST', detail: 'Invalid request' })
      });
      
      await expect(fetchPitches()).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(fetchPitches()).rejects.toThrow('Network error while fetching pitches');
    });
  });

  describe('getCsrfToken', () => {
    it('should fetch and return a CSRF token', async () => {
      const mockToken = { nonce: 'test-token-123' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockToken
      });
      
      const result = await getCsrfToken();
      
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?route=token'));
      expect(result).toBe('test-token-123');
    });
  });

  describe('submitVotes', () => {
    it('should submit votes correctly', async () => {
      const mockPayload = {
        nonce: 'test-token-123',
        voterName: 'Test User',
        votes: [
          { pitch_id: 'pitch-1', appetite: 'S' as Appetite, tier: 2 }
        ]
      };
      
      const mockResponse = { saved: 1 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const result = await submitVotes(mockPayload);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?route=vote'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockPayload)
        })
      );
      expect(result).toBe(1);
    });
  });

  describe('fetchResults', () => {
    it('should fetch results correctly', async () => {
      const mockResults = [
        { 
          pitch_id: 'pitch-1',
          small: 5,
          medium: 3,
          large: 2,
          mean_tier: 3.5
        }
      ];
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });
      
      const result = await fetchResults();
      
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?route=results'));
      expect(result).toEqual(mockResults);
    });
  });
});
