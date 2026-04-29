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
 * Returns a map of pitchId → pitchTitle from the PITCHES sheet.
 * Returns an empty object if the sheet doesn't exist or has no data.
 */
function getPitchTitleMap() {
  const sh = ss.getSheetByName('PITCHES');
  if (!sh || sh.getLastRow() < 2) return {};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  const map = {};
  for (const [id, title] of rows) {
    if (id) map[String(id)] = title || '';
  }
  return map;
}

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
      case 'save-plan': {
        const assignments = JSON.parse(e.parameter.assignments || '[]');
        return savePlan(assignments);
      }
      case 'save-final-assignments': {
        const assignments = JSON.parse(e.parameter.assignments || '[]');
        return saveFinalAssignments(assignments);
      }
      case 'get-plan':
        return getPlanStatuses();
      case 'get-followups':
        return getFollowups();
      case 'update-followup':
        return updateFollowup(e.parameter);
      case 'feedback': {
        const feedbackResult = recordFeedback({
          voterName: e.parameter.voterName,
          voterRole: e.parameter.voterRole,
          rating: e.parameter.rating ? Number(e.parameter.rating) : null,
          comments: e.parameter.comments || '',
        });
        return feedbackResult;
      }
      // Vote submission via GET+JSONP (POST never crosses GAS's 302 redirect with CORS headers;
      // script-tag JSONP follows redirects freely and bypasses CORS)
      case 'vote': {
        const votes = JSON.parse(e.parameter.votes || '[]');
        const voteResult = recordVotes({ voterName: e.parameter.voterName, voterRole: e.parameter.voterRole, votes });
        return jsonpWrap(e.parameter.callback, voteResult);
      }
      case 'interest-vote': {
        const interests = JSON.parse(e.parameter.interests || '[]');
        const interestResult = recordInterestVote({ voterName: e.parameter.voterName, role: e.parameter.role, interests });
        return jsonpWrap(e.parameter.callback, interestResult);
      }
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
      case 'save-plan':
        return savePlan(payload.assignments || []);
      case 'save-final-assignments':
        return saveFinalAssignments(payload.assignments || []);
      case 'feedback':
        return recordFeedback(payload);
      case 'send-kickoff-email':
        return sendKickoffEmail(JSON.parse(e.postData.contents));
      case 'create-emr-records':
        return createEmcRecords(JSON.parse(e.postData.contents));
      case 'refresh-pitches':
        return refreshPitches(payload);
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
  const {voterName, voterRole, votes} = body;
  if (!voterName || !votes || !Array.isArray(votes)) {
    return badRequest("Invalid request format");
  }

  for (const vote of votes) {
    if (!vote.pitch_id ||
        typeof vote.tier !== 'number' || vote.tier < 0 || vote.tier > 8) {
      return badRequest("Invalid vote format");
    }
  }

  const sh = ss.getSheetByName('VOTES');
  const now = new Date();

  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp', 'voterName', 'voterRole', 'pitch_id', 'pitchTitle', 'tier', 'interestLevel']);
  } else if (sh.getLastColumn() < 7) {
    // Migrate old schema: insert pitchTitle column after pitch_id (col 4)
    sh.insertColumnAfter(4);
    sh.getRange(1, 5).setValue('pitchTitle');
  }

  // Delete all existing rows for this voter so resubmissions overwrite cleanly.
  if (sh.getLastRow() > 1) {
    const nameCol = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat();
    const toDelete = [];
    for (let i = 0; i < nameCol.length; i++) {
      if (nameCol[i] === voterName) toDelete.push(i + 2);
    }
    for (let i = toDelete.length - 1; i >= 0; i--) {
      sh.deleteRow(toDelete[i]);
    }
  }

  if (votes.length > 0) {
    const rows = votes.map(v => [
      now,
      voterName,
      voterRole || '',
      v.pitch_id,
      v.pitchTitle || '',
      v.tier,
      (v.interestLevel != null) ? v.interestLevel : ''
    ]);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }

  return json200({ saved: votes.length });
}

/**
 * Records user feedback (rating + comments) to the FEEDBACK sheet.
 */
function recordFeedback(body) {
  const { voterName, voterRole, rating, comments } = body;
  if (!voterName) {
    return badRequest("voterName is required");
  }

  const sh = ss.getSheetByName('FEEDBACK') ||
    (() => {
      const newSheet = ss.insertSheet('FEEDBACK');
      newSheet.appendRow(['timestamp', 'voterName', 'voterRole', 'rating', 'comments']);
      return newSheet;
    })();

  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp', 'voterName', 'voterRole', 'rating', 'comments']);
  }

  sh.appendRow([new Date(), voterName, voterRole || '', rating ?? '', comments || '']);
  return json200({ saved: 1 });
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
 *   { [pitchId]: { teamVotes: {name: 0|1|2|3|4}, tlVotes: {name: 0|1|2|3|4},
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

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();

  const pitchVoteMap = {};
  const pitchInterestMap = {};
  for (const row of rows) {
    const voterName    = row[1]; // column B
    const pitchId      = row[3]; // column D
    const tier         = row[5]; // column F (after pitchTitle in col E)
    const interestLevel = row[6]; // column G
    if (!voterName || !pitchId || tier === '' || tier === null || tier === undefined) continue;
    const numTier = Number(tier) === 0 ? 0 : Math.max(1, Math.min(4, Math.round(Number(tier))));
    if (!pitchVoteMap[pitchId]) pitchVoteMap[pitchId] = {};
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
    const allTiers = Object.values(teamVotes).filter(t => t > 0);
    const tlTiers = Object.values(tlVotes).filter(t => t > 0);
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
 * Save the finalized stage 2 plan to the PLAN sheet.
 * Clears and rewrites the sheet on each call so it always reflects the latest plan.
 *
 * Expected assignments: [{ pitchId, status: 'selected'|'next-up'|'cut', assignedDev: string|null }]
 *
 * @param {Array} assignments
 * @return {TextOutput} JSON { saved: number }
 */
function savePlan(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return badRequest('assignments must be a non-empty array');
  }

  let sh = ss.getSheetByName('PLAN');
  if (!sh) sh = ss.insertSheet('PLAN');
  sh.clearContents();

  const now = new Date();
  const pitchTitles = getPitchTitleMap();
  const headers = ['timestamp', 'pitchId', 'pitchTitle', 'status', 'assignedDev'];
  const rows = [headers].concat(
    assignments.map(a => [now, a.pitchId, pitchTitles[String(a.pitchId)] || '', a.status, a.assignedDev || ''])
  );
  sh.getRange(1, 1, rows.length, 5).setValues(rows);

  return json200({ saved: assignments.length });
}

/**
 * Update the PLAN sheet with final stage 4 team assignments.
 * Merges devTL, qm, and pqa1 into the existing rows (matched by pitchId).
 * If a row for a pitchId doesn't exist yet it is appended.
 *
 * Expected assignments: [{ pitchId, status, assignedDev, devTL, qm, pqa1 }]
 *
 * @param {Array} assignments
 * @return {TextOutput} JSON { saved: number }
 */
function saveFinalAssignments(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return badRequest('assignments must be a non-empty array');
  }

  let sh = ss.getSheetByName('PLAN');
  if (!sh) sh = ss.insertSheet('PLAN');

  // Preserve existing follow-up state before clearing.
  // pitchTitle column was added in a schema update: old sheets have 9 cols, new have 10.
  const existingFollowups = {};
  if (sh.getLastRow() > 1) {
    const numCols = sh.getLastColumn();
    const hasTitle = numCols >= 10; // new schema: pitchTitle shifts followup cols right by 1
    const pcIdx = hasTitle ? 8 : 7;
    const keIdx = hasTitle ? 9 : 8;
    const existing = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
    for (const row of existing) {
      const pid = row[1];
      if (pid) existingFollowups[pid] = { projectCreated: row[pcIdx] === true, kickoffEmailSent: row[keIdx] === true };
    }
  }

  sh.clearContents();

  const now = new Date();
  const pitchTitles = getPitchTitleMap();
  const headers = ['timestamp', 'pitchId', 'pitchTitle', 'status', 'assignedDev', 'devTL', 'qm', 'pqa1', 'projectCreated', 'kickoffEmailSent'];
  const rows = [headers].concat(
    assignments.map(a => [
      now,
      a.pitchId,
      pitchTitles[String(a.pitchId)] || '',
      a.status || '',
      a.assignedDev || '',
      a.devTL || '',
      a.qm || '',
      a.pqa1 || '',
      existingFollowups[a.pitchId]?.projectCreated || false,
      existingFollowups[a.pitchId]?.kickoffEmailSent || false,
    ])
  );
  sh.getRange(1, 1, rows.length, 10).setValues(rows);

  return json200({ saved: assignments.length });
}

/**
 * Returns the status of all pitches in the PLAN sheet.
 * @return {TextOutput} JSON { statuses: { [pitchId]: 'selected'|'next-up'|'cut' } }
 */
function getPlanStatuses() {
  const sh = ss.getSheetByName('PLAN');
  if (!sh || sh.getLastRow() <= 1) return json200({ statuses: {} });
  const data = sh.getRange(2, 2, sh.getLastRow() - 1, 3).getValues(); // cols: pitchId, pitchTitle, status
  const statuses = {};
  for (const row of data) {
    const pitchId = String(row[0]);
    if (!pitchId) continue;
    statuses[pitchId] = row[2]; // 'selected' | 'next-up' | 'cut'
  }
  return json200({ statuses });
}

/**
 * Returns follow-up completion state for all pitches in the PLAN sheet.
 * @return {TextOutput} JSON { followups: { [pitchId]: { projectCreated, kickoffEmailSent } } }
 */
function getFollowups() {
  const sh = ss.getSheetByName('PLAN');
  if (!sh || sh.getLastRow() <= 1) return json200({ followups: {} });

  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  const followups = {};
  for (const row of data) {
    const pitchId = row[1];
    if (!pitchId) continue;
    followups[pitchId] = {
      projectCreated: row[8] === true,
      kickoffEmailSent: row[9] === true,
    };
  }
  return json200({ followups });
}

/**
 * Updates a single follow-up field (projectCreated or kickoffEmailSent) for a pitch.
 * @param {Object} params - { pitchId, field, value }
 */
function updateFollowup(params) {
  const { pitchId, field, value } = params;
  if (!pitchId || !field) return badRequest('pitchId and field required');
  if (field !== 'projectCreated' && field !== 'kickoffEmailSent') return badRequest('field must be projectCreated or kickoffEmailSent');

  const sh = ss.getSheetByName('PLAN');
  if (!sh || sh.getLastRow() <= 1) return notFound();

  const ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat();
  const rowIdx = ids.indexOf(pitchId);
  if (rowIdx === -1) return notFound();

  const col = field === 'projectCreated' ? 9 : 10;
  sh.getRange(rowIdx + 2, col).setValue(value === 'true' || value === true);
  return json200({ updated: 1 });
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
      GmailApp.sendEmail(email, subject, '', {
        htmlBody: htmlBody,
        name: senderName || 'TL Allocation Tool',
      });
    });
    return json200({ sent: recipients.length });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * Send per-TL kickoff emails notifying each TL of their assigned projects.
 * TL emails are resolved from the `tlEmails` map in the `allocation_config` Script Property.
 * Also sends a full assignment summary to the testingCaptain from config.
 *
 * Expected body: { assignments: { pitchId, pitchTitle, assignedDev, devTL, qm }[] }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { sent: number, skipped: string[] }
 */
function createEmcRecords(body) {
  const assignments = body.assignments || [];
  const props = PropertiesService.getScriptProperties();
  const config = JSON.parse(props.getProperty('allocation_config') || '{}');
  const tlEmails = config.tlEmails || {};
  const quarterLabel = config.quarterLabel || 'Next Quarter';
  const testingCaptain = config.testingCaptain || '';

  const byTL = {};
  for (const a of assignments) {
    if (!byTL[a.devTL]) byTL[a.devTL] = [];
    byTL[a.devTL].push(a);
  }

  function buildTableRows(rows) {
    return rows.map(a => {
      const qanLink = '<a href="https://emc2summary/GetSummaryReport.ashx/TRACK/ZQN/' + a.pitchId + '">' + a.pitchId + '</a>';
      return '<tr><td>' + a.pitchTitle + '</td><td>' + qanLink + '</td><td>' + (a.assignedDev || '') + '</td><td>' + (a.qm || '') + '</td><td>' + (a.pqa1 || '') + '</td></tr>';
    }).join('');
  }

  const tableHeader = '<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>Project Title</th><th>QAN Link</th><th>Lead Dev</th><th>QM</th><th>PQA1 Reviewer</th></tr></thead><tbody>';
  const tableFooter = '</tbody></table>';

  let sent = 0;
  const skipped = [];

  for (const tlName of Object.keys(byTL)) {
    const email = tlEmails[tlName];
    if (!email) {
      console.warn('No email found for TL: ' + tlName + ' — skipping.');
      skipped.push(tlName);
      continue;
    }
    const tlRows = byTL[tlName];
    const htmlBody =
      '<p>Hi ' + tlName + ', the quarterly allocation has been finalized. Please create a PRJ record for each project below in EMC2, link the source QAN on the Associated Records tab, and add the team members listed.</p>' +
      tableHeader + buildTableRows(tlRows) + tableFooter +
      '<p>Reply with questions. — SmartTools Allocation Tool</p>';
    GmailApp.sendEmail(email, 'SmartTools Allocation — Your Q' + quarterLabel + ' Projects', '', {
      htmlBody: htmlBody,
      name: 'SmartTools Allocation Tool',
    });
    sent++;
  }

  if (testingCaptain) {
    const summaryHtml =
      '<p>Full assignment summary for Q' + quarterLabel + ':</p>' +
      tableHeader + buildTableRows(assignments) + tableFooter;
    GmailApp.sendEmail(testingCaptain, 'SmartTools Allocation — Full Assignment Summary', '', {
      htmlBody: summaryHtml,
      name: 'SmartTools Allocation Tool',
    });
  }

  return json200({ sent: sent, skipped: skipped });
}

/**
 * Refresh the PITCHES sheet with a full replacement dataset from the caller.
 * Creates the sheet if it does not exist. Clears all existing data before writing.
 *
 * Expected body: { pitches: { pitch_id, title, problem, ideaForSolution, whyNow,
 *   smartToolsFit, epicFit, maintenance, internCandidate, characteristics, success }[] }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { updated: number }
 */
function refreshPitches(body) {
  const pitches = body.pitches || [];
  const sh = ss.getSheetByName('PITCHES') || ss.insertSheet('PITCHES');
  sh.clearContents();

  const headers = ['pitch_id', 'title', 'problem', 'ideaForSolution', 'whyNow', 'smartToolsFit', 'epicFit', 'maintenance', 'internCandidate', 'characteristics', 'success'];
  const rows = [headers].concat(pitches.map(p => headers.map(k => p[k] != null ? p[k] : '')));
  sh.getRange(1, 1, rows.length, headers.length).setValues(rows);

  return json200({ updated: pitches.length });
}

/**
 * Wrap a TextOutput response in a JSONP callback for cross-origin script-tag requests.
 * If no callback name is provided, returns the original response unchanged.
 * Callback name is sanitized to prevent XSS.
 */
function jsonpWrap(callbackParam, textOutput) {
  if (!callbackParam) return textOutput;
  const cb = String(callbackParam).replace(/[^a-zA-Z0-9_$]/g, '');
  if (!cb) return textOutput;
  return ContentService.createTextOutput(cb + '(' + textOutput.getContent() + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Generate a 200 JSON response with CORS headers
 * @param {Object} obj - Response data
 * @return {TextOutput} ContentService output
 */
function json200(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
    .setMimeType(ContentService.MimeType.JSON);
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
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generate a 403 Forbidden response
 * @return {TextOutput} ContentService output
 */
function forbidden() {
  return ContentService.createTextOutput(JSON.stringify({
    error: "FORBIDDEN"
  }))
    .setMimeType(ContentService.MimeType.JSON);
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
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle OPTIONS requests (required for CORS preflight)
 * @param {Object} e - The request object
 * @return {TextOutput} Empty response with CORS headers
 */
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
