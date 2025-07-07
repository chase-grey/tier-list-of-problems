/**
 * Simplified Backend for Problem-Polling App
 * This version removes CSRF requirements and simplifies the API
 * for easier integration from the frontend
 */

// Global reference to the spreadsheet
const ss = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    console.log('GET request received:', e.parameter);
    
    switch (e.parameter.route) {
      case 'pitches':
        return getPitches();
      case 'results':
        return getResults();
      default:
        return contentResponse({error: 'Unknown route'}, 404);
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return contentResponse({error: error.message || 'Server error'}, 500);
  }
}

/**
 * Handle POST requests - simplified to remove CSRF requirement
 */
function doPost(e) {
  try {
    console.log('POST request received');
    
    // Handle vote submission - parse data from either POST body or form parameters
    let data;
    if (e.postData && e.postData.contents) {
      // Standard JSON POST
      console.log('Parsing POST data from request body');
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter.voterName && e.parameter.votes) {
      // Form submission format
      console.log('Parsing POST data from form parameters');
      data = {
        voterName: e.parameter.voterName,
        votes: JSON.parse(e.parameter.votes)
      };
    } else {
      console.error('No valid data found in request');
      return contentResponse({error: 'Invalid data format'}, 400);
    }
    
    return recordVotes(data);
  } catch (error) {
    console.error('Error in doPost:', error);
    return contentResponse({error: error.message || 'Server error'}, 500);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions() {
  return contentResponse({}, 200);
}

/**
 * Get all pitches from PITCHES sheet
 */
function getPitches() {
  const sh = ss.getSheetByName('PITCHES');
  if (!sh) {
    return contentResponse({error: 'PITCHES sheet not found'}, 500);
  }
  
  const rows = sh.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pitch = {
      pitch_id: row[0],
      title: row[1],
    };
    
    // Add any additional columns as details
    for (let j = 2; j < headers.length; j++) {
      if (!pitch.details) {
        pitch.details = {};
      }
      pitch.details[headers[j]] = row[j];
    }
    
    data.push(pitch);
  }
  
  return contentResponse(data);
}

/**
 * Get aggregated results
 */
function getResults() {
  const sh = ss.getSheetByName('RESULTS_VIEW');
  if (!sh) {
    return contentResponse({error: 'RESULTS_VIEW sheet not found'}, 500);
  }
  
  const rows = sh.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const result = {};
    
    for (let j = 0; j < headers.length; j++) {
      result[headers[j]] = row[j];
    }
    
    data.push(result);
  }
  
  return contentResponse(data);
}

/**
 * Record votes in the VOTES sheet - simplified to remove CSRF requirement
 */
function recordVotes(data) {
  console.log('Recording votes:', JSON.stringify(data));
  
  // Validate input
  const {voterName, voterRole, votes} = data;
  if (!voterName || !votes || !Array.isArray(votes) || votes.length === 0) {
    return contentResponse({error: 'Invalid request format'}, 400);
  }
  
  // Validate votes
  for (const vote of votes) {
    if (!vote.pitch_id || !['S', 'M', 'L'].includes(vote.appetite) || 
        typeof vote.tier !== 'number' || vote.tier < 1 || vote.tier > 8) {
      return contentResponse({error: 'Invalid vote format'}, 400);
    }
  }
  
  // Get spreadsheet and prepare data
  const sh = ss.getSheetByName('VOTES');
  if (!sh) {
    return contentResponse({error: 'VOTES sheet not found'}, 500);
  }
  
  const now = new Date();
  const email = Session.getActiveUser().getEmail() || '';
  const secret = PropertiesService.getScriptProperties().getProperty('pepper') || 'default-secret';
  
  // Create rows to append
  const rows = votes.map(v => [
    now,
    voterName,
    email,
    voterRole || '', // Add role, default to empty string if not provided
    v.pitch_id,
    v.appetite,
    v.tier,
    // Simple checksum to prevent duplicates
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      voterName + v.pitch_id + (voterRole || '') + secret,
      Utilities.Charset.UTF_8
    ).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('')
  ]);
  
  // Check for duplicates
  let checksumRange = [];
  if (sh.getLastRow() > 1) {
    checksumRange = sh.getRange('H2:H' + sh.getLastRow()).getValues().flat();
  }
  
  const newRows = rows.filter(r => !checksumRange.includes(r[7]));
  
  // Append new rows if any
  if (newRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
  }
  
  return contentResponse({saved: newRows.length});
}

/**
 * Create a standardized content response with CORS headers
 */
function contentResponse(data, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  // Add CORS headers to all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600'
  };
  
  // Add each header
  for (const key in headers) {
    response.setHeader(key, headers[key]);
  }
  
  return response;
}
