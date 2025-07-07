import React, { useState, useEffect } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { submitVotes, convertVotesToApiFormat } from '../services/api';
import type { Vote } from '../types/models';

interface VoteSubmissionProps {
  votes: Record<string, Vote>;
  voterName: string;
  voterRole?: string;
  onSuccess?: () => void;
  autoSubmit?: boolean; // If true, just handles submission without showing button
  visible?: boolean;     // Controls if the button should be visible
}

/**
 * Component for submitting votes to the backend
 * 
 * For now, this uses the mock API implementation to demonstrate the flow
 * until the Google Sheets backend integration is fixed
 */
const VoteSubmission: React.FC<VoteSubmissionProps> = ({ 
  votes, 
  voterName, 
  voterRole,
  onSuccess,
  autoSubmit = false,
  visible = true 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Convert votes to the required format for API submission
  const apiVotes = convertVotesToApiFormat(votes);
  
  // Check if votes exist and are complete (have both appetite and tier)
  const hasCompleteVotes = Object.values(votes).every(vote => vote.appetite && vote.tier);
  
  // Handle submission of votes to the backend
  const handleSubmit = async () => {
    // Reset states
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    
    console.log('Submitting mock votes for voter:', voterName);
    
    try {
      // With mock API enabled, this will use the mock implementation
      const result = await submitVotes({
        nonce: 'mock-token',
        voterName,
        voterRole,
        votes: apiVotes,
      });
      
      console.log('Mock vote submission result:', result);
      
      // Set success state
      setSuccess(true);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Vote submission error:', error);
      setError(error.message || 'Failed to submit votes');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If autoSubmit is true, submit votes automatically when the component mounts
  useEffect(() => {
    if (autoSubmit && hasCompleteVotes && voterName && !isSubmitting && !success) {
      handleSubmit();
    }
  }, [autoSubmit, hasCompleteVotes, voterName, isSubmitting, success]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the component should be invisible, just return the snackbars
  if (!visible) {
    return (
      <>
        {/* Success message */}
        <Snackbar 
          open={success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(false)}
        >
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Your votes have been successfully submitted!
          </Alert>
        </Snackbar>
        
        {/* Error message */}
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </>
    );
  }
  
  // Otherwise return the full component with button
  return (
    <>
      <Button 
        variant="contained" 
        color="primary"
        disabled={isSubmitting || !hasCompleteVotes || !voterName}
        onClick={handleSubmit}
        startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
      >
        {isSubmitting ? 'Submitting votes...' : 'Submit Votes'}
      </Button>
      
      {/* Success message */}
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Your votes have been successfully submitted!
        </Alert>
      </Snackbar>
      
      {/* Error message */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default VoteSubmission;
