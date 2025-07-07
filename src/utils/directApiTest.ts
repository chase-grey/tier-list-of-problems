/**
 * Direct API Testing Utility
 * 
 * This module provides low-level testing functions for directly accessing
 * the Google Apps Script backend without any of the wrapper code.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Test the token endpoint directly using fetch with detailed error handling
 */
export async function testTokenEndpoint() {
  console.log('DIRECT TEST: Testing token endpoint');
  console.log('Using URL:', API_URL);
  
  try {
    // Make sure any old errors are cleared
    console.log('Starting direct test to:', `${API_URL}?route=token`);
    
    // First try a direct no-frills fetch
    const rawResponse = await fetch(`${API_URL}?route=token`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
    });
    
    console.log('Raw response status:', rawResponse.status);
    console.log('Raw response headers:', [...rawResponse.headers.entries()]);
    
    // Try to get response text regardless of content type
    const responseText = await rawResponse.text();
    console.log('Raw response text:', responseText);
    
    // Try parsing as JSON if possible
    try {
      const jsonData = JSON.parse(responseText);
      console.log('Response parsed as JSON:', jsonData);
      return {
        success: true,
        data: jsonData,
        status: rawResponse.status,
        responseText
      };
    } catch (parseError) {
      console.log('Response is not valid JSON');
      return {
        success: false,
        error: 'Not JSON',
        status: rawResponse.status,
        responseText
      };
    }
  } catch (networkError: any) {
    // Get detailed network error information
    console.error('Network error details:', networkError);
    
    // Check if there's a message property
    const errorMessage = networkError.message || 'Unknown network error';
    console.error('Network error message:', errorMessage);
    
    // Try to extract more info from the error
    const errorInfo = {
      name: networkError.name,
      message: errorMessage,
      stack: networkError.stack,
      cause: networkError.cause,
      code: networkError.code || 'unknown',
    };
    
    console.error('Detailed error info:', errorInfo);
    
    return {
      success: false,
      error: 'Network Error',
      errorInfo,
      message: errorMessage
    };
  }
}

/**
 * Verify the backend is accessible by testing the HTTP OPTIONS method
 * This should always work regardless of CORS settings
 */
export async function testOptionsRequest() {
  console.log('DIRECT TEST: Testing OPTIONS request');
  console.log('Using URL:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    console.log('OPTIONS response status:', response.status);
    console.log('OPTIONS response headers:', [...response.headers.entries()]);
    
    return {
      success: true,
      status: response.status,
      headers: [...response.headers.entries()]
    };
  } catch (error: any) {
    console.error('OPTIONS request failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
