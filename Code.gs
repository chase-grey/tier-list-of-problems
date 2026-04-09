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
      case 'config':
        return getConfig();
      case 'allocation-data':
        return getAllocationData();
      case 'phase2-interests':
        return getPhase2Interests();
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

    const payload = JSON.parse(e.postData.contents);
    console.log('Payload received:', JSON.stringify(payload));

    switch (e.parameter.route) {
      case 'vote':
        return recordVotes(payload);
      case 'interest-vote':
        return recordInterestVote(payload);
      case 'send-kickoff-email':
        return sendKickoffEmail(JSON.parse(e.postData.contents));
      case 'create-emr-records':
        return createEmcRecords(JSON.parse(e.postData.contents));
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

  // Validate votes (appetite is optional/legacy; tier is still required)
  for (const vote of votes) {
    if (!vote.pitch_id ||
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
    v.appetite != null ? v.appetite : '',
    v.tier,
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      voterName + v.pitch_id + secret,
      Utilities.Charset.UTF_8
    ).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join(''),
    (v.interestLevel != null) ? v.interestLevel : ''
  ]);

  // Remove duplicates before append (still based on column G checksum)
  let checksumRange = [];
  if (sh.getLastRow() > 1) {
    checksumRange = sh.getRange('G2:G' + sh.getLastRow()).getValues().flat();
  }

  const newRows = rows.filter(r => !checksumRange.includes(r[6]));

  if (newRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
  }

  return json200({ saved: newRows.length });
}

/**
 * Return the TL allocation config stored in Script Properties as JSON.
 * Set via: PropertiesService.getScriptProperties().setProperty('allocation_config', JSON.stringify({...}))
 * @return {TextOutput} JSON AllocationConfig or { error: 'NOT_CONFIGURED' }
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const configJson = props.getProperty('allocation_config');
  if (!configJson) {
    return json200({ error: 'NOT_CONFIGURED' });
  }
  return json200(JSON.parse(configJson));
}

/**
 * Return per-pitch, per-voter priority tier data aggregated from the VOTES sheet.
 * Dev TL voters are identified via devTLNames in the allocation_config Script Property.
 *
 * Response shape:
 *   { [pitchId]: { teamVotes: {name: 1|2|3|4}, tlVotes: {name: 1|2|3|4},
 *                  teamPriorityScore: number, tlPriorityScore: number } }
 *
 * @return {TextOutput} JSON vote data keyed by pitch ID
 */
function getAllocationData() {
  // Load devTL names from config so we can split teamVotes / tlVotes
  const props = PropertiesService.getScriptProperties();
  const configJson = props.getProperty('allocation_config') || '{}';
  const config = JSON.parse(configJson);
  const devTLNames = new Set(config.devTLNames || []);

  const sh = ss.getSheetByName('VOTES');
  if (!sh || sh.getLastRow() <= 1) return json200({});

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();

  // Group votes by pitch: { pitchId -> { voterName -> tier } }
  // Also collect interest levels: { pitchId -> { voterName -> 1|2|3|4 } }
  const pitchVoteMap = {};
  const pitchInterestMap = {};
  for (const row of rows) {
    const voterName    = row[1]; // column B
    const pitchId      = row[3]; // column D
    const tier         = row[5]; // column F
    const interestLevel = row[7]; // column H
    if (!voterName || !pitchId || tier === '' || tier === null) continue;
    const numTier = Math.max(1, Math.min(4, Math.round(Number(tier))));
    if (!pitchVoteMap[pitchId]) pitchVoteMap[pitchId] = {};
    // Last write wins; checksum dedup at write-time means at most one row per voter-pitch
    pitchVoteMap[pitchId][voterName] = numTier;
    if (interestLevel !== '' && interestLevel !== null && interestLevel !== undefined) {
      if (!pitchInterestMap[pitchId]) pitchInterestMap[pitchId] = {};
      pitchInterestMap[pitchId][voterName] = Number(interestLevel);
    }
  }

  // Compute aggregates per pitch
  const result = {};
  for (const pitchId of Object.keys(pitchVoteMap)) {
    const voterTiers = pitchVoteMap[pitchId];
    const teamVotes = voterTiers;
    const tlVotes = {};
    for (const name of Object.keys(voterTiers)) {
      if (devTLNames.has(name)) tlVotes[name] = voterTiers[name];
    }
    const allTiers = Object.values(teamVotes);
    const tlTiers = Object.values(tlVotes);
    const teamPriorityScore = allTiers.length > 0
      ? allTiers.reduce((s, t) => s + t, 0) / allTiers.length
      : 0;
    const tlPriorityScore = tlTiers.length > 0
      ? tlTiers.reduce((s, t) => s + t, 0) / tlTiers.length
      : teamPriorityScore;
    const devInterest = pitchInterestMap[pitchId] || {};
    result[pitchId] = { teamVotes, tlVotes, teamPriorityScore, tlPriorityScore, devInterest };
  }

  return json200(result);
}

/**
 * Return Phase 2 interest votes (dev TL / QM interest in selected projects).
 * Reads from the INTEREST_VOTES sheet; returns [] if the sheet doesn't exist yet.
 *
 * Response shape: Phase2Interest[]
 *   [{ personName, role, interestByPitchId: { [pitchId]: 1|2|3|4|null } }]
 *
 * @return {TextOutput} JSON Phase2Interest array
 */
function getPhase2Interests() {
  const sh = ss.getSheetByName('INTEREST_VOTES');
  if (!sh || sh.getLastRow() <= 1) return json200([]);

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const byPerson = {};

  for (const row of rows) {
    const voterName = row[1]; // column B
    const role      = row[3]; // column D
    const pitchId   = row[4]; // column E
    const level     = row[5]; // column F (1-4 or '' for null/skipped)
    if (!voterName || !pitchId) continue;
    if (!byPerson[voterName]) {
      byPerson[voterName] = { personName: voterName, role, interestByPitchId: {} };
    }
    byPerson[voterName].interestByPitchId[pitchId] =
      (level === '' || level === null || level === undefined) ? null : Number(level);
  }

  return json200(Object.values(byPerson));
}

/**
 * Record Phase 2 interest votes for a dev TL or QM.
 * Creates the INTEREST_VOTES sheet if it doesn't exist yet.
 *
 * Expected body: { voterName: string, role: 'dev TL'|'QM',
 *                  interests: [{ pitch_id: string, level: 1|2|3|4|null }] }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { saved: number }
 */
function recordInterestVote(body) {
  const { voterName, role, interests } = body;
  if (!voterName || !role || !Array.isArray(interests) || interests.length === 0) {
    return badRequest('Invalid request format');
  }
  if (!['dev TL', 'QM'].includes(role)) {
    return badRequest('role must be "dev TL" or "QM"');
  }

  let sh = ss.getSheetByName('INTEREST_VOTES');
  if (!sh) {
    sh = ss.insertSheet('INTEREST_VOTES');
    sh.appendRow(['timestamp', 'voterName', 'email', 'role', 'pitch_id', 'interest_level']);
  }

  const email = Session.getActiveUser().getEmail() || '';
  const now = new Date();
  const rows = interests.map(i => [now, voterName, email, role, i.pitch_id, i.level ?? '']);

  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }

  return json200({ saved: rows.length });
}

/**
 * Send kickoff emails to a list of recipients.
 *
 * Expected body: { subject: string, recipients: string[], htmlBody: string, senderName?: string }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { sent: number }
 */
function sendKickoffEmail(body) {
  const { subject, recipients, htmlBody, senderName } = body;
  if (!subject || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !htmlBody) {
    return badRequest('Missing required fields: subject, recipients, htmlBody');
  }
  try {
    recipients.forEach(email => {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: senderName || 'TL Allocation Tool'
      });
    });
    return json200({ sent: recipients.length });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Stub for creating EMC2 project kickoff records.
 * Replace with real Epic EMC2 API calls once integration credentials are available.
 *
 * Expected body: { assignments: Object[] }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON stub response
 */
function createEmcRecords(body) {
  // TODO: Replace with Epic EMC2 API calls when integration credentials are available.
  // Each assignment represents one project kickoff record to create.
  const assignments = body.assignments || [];
  console.log('EMC2 records to create (' + assignments.length + '):', JSON.stringify(assignments));
  return json200({
    status: 'stub',
    message: 'EMC2 record creation is not yet implemented. See console log for intended records.',
    count: assignments.length
  });
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
