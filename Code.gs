/**
 * Problem-Polling App Backend
 * Using Google Apps Script + Google Sheets
 * 
 * This script implements a REST API for the problem-polling application
 * Version 1.0 (2025-07-06)
 */

// Global reference to the spreadsheet
const ss = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Router for GET requests
 */
function doGet(e) {
  try {
    // Log the incoming request for debugging
    console.log('GET request received with params:', JSON.stringify(e.parameter));
    
    switch (e.parameter.route) {
      case 'pitches':
        return getPitches();
      case 'results':
        return getResults();
      case 'token':
        return getCsrfToken();
      default:
        return notFound();
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return serverError(error);
  }
}

/**
 * Router for POST requests
 */
function doPost(e) {
  try {
    // Log the incoming request for debugging
    console.log('POST request received with route:', e.parameter.route);
    
    switch (e.parameter.route) {
      case 'vote':
        const payload = JSON.parse(e.postData.contents);
        console.log('Vote payload received:', JSON.stringify(payload));
        return recordVotes(payload);
      default:
        return notFound();
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return serverError(error);
  }
}

/**
 * Get all pitches from PITCHES sheet
 * @return {TextOutput} JSON response with all pitches
 */
function getPitches() {
  const sh = ss.getSheetByName('PITCHES');
  const rows = sh.getDataRange().getValues().slice(1); // skip header
  const data = rows.map(r => ({
    pitch_id: r[0],
    title: r[1],
    problem: r[2],
    idea: r[3],
    characteristics: r[4],
    // Add other fields as needed
  }));
  return json200(data);
}

/**
 * Get aggregated results from RESULTS_VIEW sheet
 * @return {TextOutput} JSON response with aggregated results
 */
function getResults() {
  const sh = ss.getSheetByName('RESULTS_VIEW');
  const rows = sh.getDataRange().getValues().slice(1); // skip header
  const data = rows.map(r => ({
    pitch_id: r[0],
    small: r[1],
    medium: r[2],
    large: r[3],
    mean_tier: r[4]
  }));
  return json200(data);
}

/**
 * Generate and return a CSRF token
 * @return {TextOutput} JSON response with nonce
 */
function getCsrfToken() {
  const nonce = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put(nonce, "1", 600); // Store for 10 minutes (600 seconds)
  return json200({ nonce: nonce });
}

/**
 * Validate a CSRF token
 * @param {string} nonce - The nonce to validate
 * @throws {Error} If nonce is invalid or missing
 */
function validateNonce(nonce) {
  if (!nonce) {
    throw new Error("Missing CSRF token");
  }
  
  const cache = CacheService.getScriptCache();
  const token = cache.get(nonce);
  
  if (!token) {
    throw new Error("Invalid or expired CSRF token");
  }
  
  // Remove the token to prevent reuse
  cache.remove(nonce);
}

/**
 * Record votes in the VOTES sheet
 * @param {Object} body - Request body with votes
 * @return {TextOutput} JSON response indicating success
 */
function recordVotes(body) {
  validateNonce(body.nonce);
  
  const {voterName, votes} = body;
  if (!voterName || !votes || !Array.isArray(votes) || votes.length === 0) {
    return badRequest("Invalid request format");
  }
  
  // Validate votes
  for (const vote of votes) {
    if (!vote.pitch_id || !['S', 'M', 'L'].includes(vote.appetite) || 
        typeof vote.tier !== 'number' || vote.tier < 1 || vote.tier > 8) {
      return badRequest("Invalid vote format");
    }
  }
  
  const email = Session.getActiveUser().getEmail() || '';
  const sh = ss.getSheetByName('VOTES');
  const now = new Date();
  const secret = PropertiesService.getScriptProperties().getProperty('pepper') || 'default-secret';
  
  const rows = votes.map(v => [
    now,
    voterName,
    email,
    v.pitch_id,
    v.appetite,
    v.tier,
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      voterName + v.pitch_id + secret,
      Utilities.Charset.UTF_8
    ).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('')
  ]);
  
  // Remove duplicates before append
  let checksumRange = [];
  if (sh.getLastRow() > 1) {
    checksumRange = sh.getRange('G2:G' + sh.getLastRow()).getValues().flat();
  }
  
  const newRows = rows.filter(r => !checksumRange.includes(r[6]));
  
  if (newRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, 7).setValues(newRows);
  }
  
  return json200({ saved: newRows.length });
}

/**
 * Generate a 200 JSON response with CORS headers
 * @param {Object} obj - Response data
 * @return {TextOutput} ContentService output
 */
function json200(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('X-Content-Type-Options', 'nosniff');
}

/**
 * Generate a 400 Bad Request response
 * @param {string} message - Error message
 * @param {string} detail - Optional error detail
 * @return {TextOutput} ContentService output
 */
function badRequest(message, detail) {
  const response = {
    error: message || "BAD_REQUEST"
  };
  
  if (detail) {
    response.detail = detail;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setResponseCode(400);
}

/**
 * Generate a 404 Not Found response
 * @return {TextOutput} ContentService output
 */
function notFound() {
  return ContentService.createTextOutput(JSON.stringify({
    error: "NOT_FOUND",
    detail: "The requested endpoint does not exist"
  }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setResponseCode(404);
}

/**
 * Generate a 403 Forbidden response
 * @return {TextOutput} ContentService output
 */
function forbidden() {
  return ContentService.createTextOutput(JSON.stringify({
    error: "FORBIDDEN"
  }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setResponseCode(403);
}

/**
 * Generate a 500 Server Error response
 * @param {Error} error - The error object
 * @return {TextOutput} ContentService output
 */
function serverError(error) {
  return ContentService.createTextOutput(JSON.stringify({
    error: "SERVER_ERROR",
    detail: error.message || "An unexpected error occurred"
  }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setResponseCode(500);
}

/**
 * Handle OPTIONS requests (required for CORS preflight)
 * @param {Object} e - The request object
 * @return {TextOutput} Empty response with CORS headers
 */
function doOptions(e) {
  console.log('OPTIONS request received');
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}
