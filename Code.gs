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
 * Runs fn() inside a document-scoped lock, serialising all concurrent writes.
 * Returns a 503 response if the lock cannot be acquired within 30 seconds.
 * All sheet-mutating functions should call this.
 */
function withLock(fn) {
  const lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000);
  } catch (_) {
    return json200({ error: 'Server busy — please try again in a moment.' });
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Returns a map of pitchId → pitchTitle.
 * Reads from PITCHES sheet first; falls back to VOTES sheet (which stores pitchTitle
 * as submitted by the frontend) if PITCHES is absent or empty.
 */
function getPitchTitleMap() {
  const sh = ss.getSheetByName('PITCHES');
  if (sh && sh.getLastRow() >= 2) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    const map = {};
    for (const [id, title] of rows) {
      if (id) map[String(id)] = title || '';
    }
    if (Object.keys(map).length > 0) return map;
  }

  // Fall back to VOTES sheet — each vote row includes pitchTitle in col E (index 4)
  const vsh = ss.getSheetByName('VOTES');
  if (!vsh || vsh.getLastRow() <= 1) return {};
  const vrows = vsh.getRange(2, 1, vsh.getLastRow() - 1, 5).getValues();
  const map = {};
  for (const row of vrows) {
    const id = String(row[3]);
    const title = row[4];
    if (id && title && !map[id]) map[id] = title;
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
      case 'adhoc-pitches':
        return getAdhocPitches();
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
      // Capacity-override submission via GET+JSONP for the same reason as 'vote'.
      case 'set-capacity-override': {
        const overrideResult = recordCapacityOverride({
          name: e.parameter.name,
          devCapacity: e.parameter.devCapacity,
          pqa1Capacity: e.parameter.pqa1Capacity,
          capacity: e.parameter.capacity,
          comment: e.parameter.comment,
          setBy: e.parameter.setBy,
        });
        return jsonpWrap(e.parameter.callback, overrideResult);
      }
      // Pre-check before the AvailabilityDialog: returns the stored
      // availability + capacity values for this voter (voter answer overlaid
      // with TL override). The frontend uses this to skip the dialog when
      // we already have an answer.
      case 'get-voter-availability': {
        const name = e.parameter.voterName || e.parameter.name || '';
        return getVoterAvailability(String(name));
      }
      // Polling state (stage + cycle id). Frontend uses these to override the
      // VITE_POLLING_STAGE / VITE_POLLING_CYCLE_ID env vars baked at build
      // time, so an admin can advance the stage/quarter without redeploying.
      case 'get-polling-state':
        return getPollingState();
      // Edit-lock state for Stage 2 / Stage 4 coordination. Frontend polls
      // this so a TL knows whether to show editor or view-only UI.
      case 'get-edit-lock':
        return getEditLock(e.parameter.stage);
      // Per-stage pitch/person locks (auto-assign skip flags) — shared so
      // every TL sees the same lock state.
      case 'get-allocation-locks':
        return getAllocationLocks();
      case 'set-polling-state': {
        const result = setPollingState({
          stage: e.parameter.stage,
          cycleId: e.parameter.cycleId,
          setBy: e.parameter.setBy,
        });
        return jsonpWrap(e.parameter.callback, result);
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
        return savePlan(payload.assignments || [], payload.submittedBy || '', payload.sessionId || '');
      case 'save-final-assignments':
        return saveFinalAssignments(payload.assignments || [], payload.submittedBy || '', payload.sessionId || '');
      case 'feedback':
        return recordFeedback(payload);
      case 'send-kickoff-email':
        return sendKickoffEmail(JSON.parse(e.postData.contents));
      case 'create-emr-records':
        return createEmcRecords(JSON.parse(e.postData.contents));
      case 'refresh-pitches':
        return refreshPitches(payload);
      case 'save-adhoc-pitch':
        return saveAdhocPitch(payload);
      case 'delete-adhoc-pitch':
        return deleteAdhocPitch(payload);
      case 'set-capacity-override':
        return recordCapacityOverride(payload);
      case 'set-polling-state':
        return setPollingState(payload);
      case 'acquire-edit-lock':
        return acquireEditLock(payload);
      case 'release-edit-lock':
        return releaseEditLock(payload);
      case 'heartbeat-edit-lock':
        return heartbeatEditLock(payload);
      case 'set-allocation-locks':
        return setAllocationLocks(payload);
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
  if (!sh) return json200([]);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return json200([]);
  const rows = sh.getRange(2, 1, lastRow - 1, PITCH_HEADERS.length).getValues();
  // Column order is defined by PITCH_HEADERS — see top of refreshPitches.
  const adhocIdx = PITCH_HEADERS.indexOf('adhoc');
  const committedIdx = PITCH_HEADERS.indexOf('committed');
  const categoryIdx = PITCH_HEADERS.indexOf('category');
  const prjIdIdx = PITCH_HEADERS.indexOf('prjId');
  const data = rows.map(r => ({
    pitch_id: r[0],
    title: r[1],
    problem: r[2],
    idea: r[3],
    characteristics: r[9],
    committed: isAdhocCellTrue(r[committedIdx]),
    category: r[categoryIdx],
    adhoc: isAdhocCellTrue(r[adhocIdx]),
    prjId: prjIdIdx >= 0 && r[prjIdIdx] != null && r[prjIdIdx] !== '' ? String(r[prjIdIdx]) : '',
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
 * Coerce a capacity-tier value from the payload to one of the four allowed
 * strings or '' (the convention this file uses for "not provided").
 */
function coerceCapacityTier(value) {
  if (value === 'above-avg' || value === 'avg' || value === 'fewer' || value === 'none') {
    return value;
  }
  return '';
}

/**
 * Record votes in the VOTES sheet
 * @param {Object} body - Request body with votes
 * @return {TextOutput} JSON response indicating success
 */
function recordVotes(body) {
  const {
    voterName,
    voterRole,
    votes,
    available,
    availableForPQA1,
    devCapacity,
    pqa1Capacity,
    capacity,
    availabilityComment,
  } = body;
  if (!voterName || !votes || !Array.isArray(votes)) {
    return badRequest("Invalid request format");
  }

  for (const vote of votes) {
    if (!vote.pitch_id ||
        typeof vote.tier !== 'number' || vote.tier < 0 || vote.tier > 8) {
      return badRequest("Invalid vote format");
    }
  }

  // available: true = available, false = not available, undefined = not provided.
  // Non-contributor roles (UXD, TLTL, etc.) never see the dialog and so submit
  // with `available` undefined — store '' so we don't mis-classify them as
  // available. Devs / QM / dev TL who explicitly answered get true / false.
  const availableValue =
    available === true ? true :
    available === false ? false :
    '';
  // availableForPQA1: dev-only flag. Non-devs don't answer this — store '' so
  // it's distinguishable from an explicit false. Devs answer both yes/no.
  const availableForPQA1Value =
    availableForPQA1 === true ? true :
    availableForPQA1 === false ? false :
    '';
  // Capacity tier values are 'above-avg' | 'avg' | 'fewer' | 'none' or '' (unset).
  const devCapacityValue = coerceCapacityTier(devCapacity);
  const pqa1CapacityValue = coerceCapacityTier(pqa1Capacity);
  const capacityValue = coerceCapacityTier(capacity);
  const availabilityCommentValue = (availabilityComment != null) ? String(availabilityComment) : '';

  return withLock(() => {
    const sh = ss.getSheetByName('VOTES');
    const now = new Date();

    if (sh.getLastRow() === 0) {
      sh.appendRow([
        'timestamp', 'voterName', 'voterRole', 'pitch_id', 'pitchTitle',
        'tier', 'interestLevel', 'available', 'availableForPQA1',
        'devCapacity', 'pqa1Capacity', 'capacity', 'availabilityComment',
      ]);
    } else if (sh.getLastColumn() < 7) {
      // Migrate old schema: insert pitchTitle column after pitch_id (col 4)
      sh.insertColumnAfter(4);
      sh.getRange(1, 5).setValue('pitchTitle');
    } else if (sh.getLastColumn() < 8) {
      // Migrate: add available column (col 8)
      sh.getRange(1, 8).setValue('available');
    } else if (sh.getLastColumn() < 9) {
      // Migrate: add availableForPQA1 column (col 9). Only devs answer it; older
      // rows leave it blank, which getAllocationData treats as "unset".
      sh.getRange(1, 9).setValue('availableForPQA1');
    } else if (sh.getLastColumn() < 13) {
      // Migrate: add the four capacity columns (J–M). Older rows leave them
      // blank, which getAllocationData treats as "unset".
      sh.getRange(1, 10).setValue('devCapacity');
      sh.getRange(1, 11).setValue('pqa1Capacity');
      sh.getRange(1, 12).setValue('capacity');
      sh.getRange(1, 13).setValue('availabilityComment');
    }

    // Per-pitch upsert (NOT bulk delete-and-reinsert). Stage 3's frontend
    // pitches list is filtered to pitches that made the plan, so a Stage 3
    // submission carries only those — wiping all the voter's rows would
    // discard the Stage 1 priority data for cut/next-up pitches. Instead:
    //   - For each pitch in the payload: update the existing row if present,
    //     otherwise append a new row.
    //   - For the voter's other rows (pitches not in this submission):
    //     refresh the availability + capacity columns (H-M) only where the
    //     payload provided a non-empty value. Stage 3 dev TLs/QMs who already
    //     have availability data on file may resubmit interest without going
    //     through the dialog (since we suppress it for known-voted users); we
    //     don't want that to wipe their stored availability.
    //
    // "Provided" means the payload sent a real value, not undefined/blank.
    // For booleans: explicit true/false. For capacity tiers: a valid string.
    // For comment: a non-empty string. (Blank comment intentionally is
    // treated as "no change" — there's no UI to clear a comment standalone.)
    const provideAvailable = (available === true || available === false);
    const provideAvailableForPQA1 = (availableForPQA1 === true || availableForPQA1 === false);
    const provideDevCapacity = !!devCapacityValue;
    const providePqa1Capacity = !!pqa1CapacityValue;
    const provideCapacity = !!capacityValue;
    const provideComment = availabilityCommentValue !== '';

    const mergeAvail = (existingRow) => [
      provideAvailable           ? availableValue           : (existingRow ? existingRow[7]  : ''),
      provideAvailableForPQA1    ? availableForPQA1Value    : (existingRow ? existingRow[8]  : ''),
      provideDevCapacity         ? devCapacityValue         : (existingRow ? existingRow[9]  : ''),
      providePqa1Capacity        ? pqa1CapacityValue        : (existingRow ? existingRow[10] : ''),
      provideCapacity            ? capacityValue            : (existingRow ? existingRow[11] : ''),
      provideComment             ? availabilityCommentValue : (existingRow ? existingRow[12] : ''),
    ];

    const buildRow = (v, existingRow) => {
      const avail = mergeAvail(existingRow);
      return [
        now,
        voterName,
        voterRole || (existingRow ? existingRow[2] : '') || '',
        v.pitch_id,
        v.pitchTitle || (existingRow ? existingRow[4] : '') || '',
        v.tier,
        (v.interestLevel != null) ? v.interestLevel : '',
        avail[0], avail[1], avail[2], avail[3], avail[4], avail[5],
      ];
    };

    if (sh.getLastRow() <= 1) {
      // First submission for this voter (or empty sheet). Just append.
      if (votes.length > 0) {
        sh.getRange(sh.getLastRow() + 1, 1, votes.length, 13)
          .setValues(votes.map(v => buildRow(v, null)));
      }
      return json200({ saved: votes.length });
    }

    const existing = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
    const payloadById = {};
    for (const v of votes) payloadById[String(v.pitch_id)] = v;
    const matchedPitchIds = {};

    // Pass 1: walk existing rows, in-place update each one belonging to this
    // voter. Rows in the payload get a full row write (merging avail/cap with
    // existing values where the payload didn't provide them); rows not in the
    // payload only get the provided avail/cap columns refreshed.
    for (let i = 0; i < existing.length; i++) {
      if (existing[i][1] !== voterName) continue;
      const sheetRow = i + 2;
      const pitchId = String(existing[i][3]);
      if (payloadById[pitchId]) {
        sh.getRange(sheetRow, 1, 1, 13).setValues([buildRow(payloadById[pitchId], existing[i])]);
        matchedPitchIds[pitchId] = true;
      } else {
        // Only update cols where the payload provided a value. Leave existing
        // values for the rest. setValue is per-cell here — it's a few extra
        // API calls but keeps the merge logic simple and avoids a full row read.
        if (provideAvailable)         sh.getRange(sheetRow, 8).setValue(availableValue);
        if (provideAvailableForPQA1)  sh.getRange(sheetRow, 9).setValue(availableForPQA1Value);
        if (provideDevCapacity)       sh.getRange(sheetRow, 10).setValue(devCapacityValue);
        if (providePqa1Capacity)      sh.getRange(sheetRow, 11).setValue(pqa1CapacityValue);
        if (provideCapacity)          sh.getRange(sheetRow, 12).setValue(capacityValue);
        if (provideComment)           sh.getRange(sheetRow, 13).setValue(availabilityCommentValue);
      }
    }

    // Pass 2: append rows for any payload pitches that didn't match an existing row.
    const toAppend = [];
    for (const v of votes) {
      if (!matchedPitchIds[String(v.pitch_id)]) toAppend.push(buildRow(v, null));
    }
    if (toAppend.length > 0) {
      sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, 13).setValues(toAppend);
    }

    return json200({ saved: votes.length });
  });
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
 *   { pitchData: { [pitchId]: { teamVotes, tlVotes, teamPriorityScore, tlPriorityScore, devInterest } },
 *     unavailableNames: string[],
 *     unavailableForDevNames: string[],
 *     unavailableForPqa1Names: string[],
 *     capacityByName: { [name]: { devCapacity?, pqa1Capacity?, capacity?, comment?, source } } }
 *
 * @return {TextOutput} JSON vote data keyed by pitch ID
 */
function getAllocationData() {
  // Load devTL names from config so we can split teamVotes / tlVotes
  const props = PropertiesService.getScriptProperties();
  const configJson = props.getProperty('allocation_config') || '{}';
  const config = JSON.parse(configJson);
  const devTLNames = new Set(config.devTLNames || []);
  // Roles that count as TL voters regardless of whether they're in devTLNames
  const TL_ROLES = new Set(['dev TL', 'TLTL', 'TCap']);

  const sh = ss.getSheetByName('VOTES');
  if (!sh || sh.getLastRow() <= 1) {
    // Even when VOTES is empty we still want to surface any TL-set overrides.
    const overridesOnly = readCapacityOverrides();
    const merged = {};
    Object.keys(overridesOnly).forEach(name => {
      merged[name] = Object.assign({}, overridesOnly[name], { source: 'tl-override' });
    });
    const lists = classifyCapacityLists(merged);
    return json200({
      pitchData: {},
      unavailableNames: lists.unavailableNames,
      unavailableForDevNames: lists.unavailableForDevNames,
      unavailableForPqa1Names: lists.unavailableForPqa1Names,
      capacityByName: merged,
    });
  }

  // Read at least 13 cols so columns I (availableForPQA1) and J–M (capacity
  // tiers + comment) are included. Older sheets without those columns yield
  // undefined for those positions, which we treat the same as "unset".
  const numCols = Math.max(sh.getLastColumn(), 13);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();

  const pitchVoteMap = {};
  const pitchInterestMap = {};
  const voterRoles = {}; // track each voter's role from their most recent vote row
  // Track per-voter availability flags + capacity tiers across rows. All rows
  // for the same voter should agree (they're submitted together) but we just
  // keep the latest non-empty value seen so partial migrations don't lose data.
  const voterAvail = {};       // name -> true | false | undefined
  const voterAvailPqa1 = {};   // name -> true | false | undefined
  const voterCapacity = {};    // name -> PersonCapacity (without source)
  for (const row of rows) {
    const voterName        = row[1];  // column B
    const voterRole        = row[2];  // column C
    const pitchId          = row[3];  // column D
    const tier             = row[5];  // column F (after pitchTitle in col E)
    const interestLevel    = row[6];  // column G
    const available        = row[7];  // column H
    const availableForPqa1 = row[8];  // column I (devs only)
    const devCapacity      = row[9];  // column J
    const pqa1Capacity     = row[10]; // column K
    const capacity         = row[11]; // column L
    const availabilityCmt  = row[12]; // column M
    if (!voterName) continue;
    if (voterRole) voterRoles[voterName] = voterRole;
    // Capture availability flags from any row, even if this row has no tier.
    if (available === true || available === false) voterAvail[voterName] = available;
    if (availableForPqa1 === true || availableForPqa1 === false) voterAvailPqa1[voterName] = availableForPqa1;
    // Capture capacity-tier values; latest non-empty wins.
    if (!voterCapacity[voterName]) voterCapacity[voterName] = {};
    const capRec = voterCapacity[voterName];
    if (devCapacity !== '' && devCapacity !== null && devCapacity !== undefined) capRec.devCapacity = devCapacity;
    if (pqa1Capacity !== '' && pqa1Capacity !== null && pqa1Capacity !== undefined) capRec.pqa1Capacity = pqa1Capacity;
    if (capacity !== '' && capacity !== null && capacity !== undefined) capRec.capacity = capacity;
    if (availabilityCmt !== '' && availabilityCmt !== null && availabilityCmt !== undefined) capRec.comment = String(availabilityCmt);
    if (!pitchId || tier === '' || tier === null || tier === undefined) continue;
    const numTier = Number(tier) === 0 ? 0 : Math.max(1, Math.min(4, Math.round(Number(tier))));
    if (!pitchVoteMap[pitchId]) pitchVoteMap[pitchId] = {};
    pitchVoteMap[pitchId][voterName] = numTier;
    if (interestLevel !== '' && interestLevel !== null && interestLevel !== undefined) {
      if (!pitchInterestMap[pitchId]) pitchInterestMap[pitchId] = {};
      pitchInterestMap[pitchId][voterName] = Number(interestLevel);
    }
  }

  // Build voter-derived capacity map and prune voters with no captured fields.
  const voterCapacityByName = {};
  Object.keys(voterCapacity).forEach(name => {
    const rec = voterCapacity[name];
    if (rec.devCapacity || rec.pqa1Capacity || rec.capacity || rec.comment) {
      voterCapacityByName[name] = Object.assign({}, rec, { source: 'voter' });
    }
  });

  // Overlay TL overrides on top of the voter-derived map. Override wins,
  // and the source field flips to 'tl-override' for any name with a row
  // in the override sheet.
  const overrides = readCapacityOverrides();
  const capacityByName = Object.assign({}, voterCapacityByName);
  Object.keys(overrides).forEach(name => {
    capacityByName[name] = Object.assign({}, overrides[name], { source: 'tl-override' });
  });

  // Derive the legacy boolean lists from the merged effective capacities so
  // old callers keep working after a TL override flips someone. The semantics
  // mirror the previous boolean-flag classification:
  //   none on everything   → unavailableNames
  //   devCapacity=none and pqa1Capacity is anything but 'none' (incl. unset) → unavailableForDevNames
  //   pqa1Capacity=none and devCapacity is anything but 'none' (incl. unset) → unavailableForPqa1Names
  //
  // We also fall back to the old availability-flag classification for voters
  // that have flag data but no capacity-tier data, so legacy submissions keep
  // surfacing on the unavailability lists until they re-submit under the new
  // schema.
  const unavailableSet = new Set();
  const unavailableForDevSet = new Set();
  const unavailableForPqa1Set = new Set();

  const capacityClassified = classifyCapacityLists(capacityByName);
  capacityClassified.unavailableNames.forEach(n => unavailableSet.add(n));
  capacityClassified.unavailableForDevNames.forEach(n => unavailableForDevSet.add(n));
  capacityClassified.unavailableForPqa1Names.forEach(n => unavailableForPqa1Set.add(n));

  // Legacy boolean fallback for voters who never set capacity tiers. Skip
  // anyone already classified via capacity tiers so an override can override
  // a stale flag-only classification.
  const allFlagVoters = new Set([...Object.keys(voterAvail), ...Object.keys(voterAvailPqa1)]);
  allFlagVoters.forEach(name => {
    if (capacityByName[name]) return; // capacity tiers (voter or override) already speak for this person
    const avail = voterAvail[name];
    const pqa1 = voterAvailPqa1[name];
    if (avail === false && pqa1 !== true) {
      unavailableSet.add(name);
    } else if (avail === false && pqa1 === true) {
      unavailableForDevSet.add(name);
    } else if (avail === true && pqa1 === false) {
      unavailableForPqa1Set.add(name);
    }
  });

  // Compute aggregates per pitch
  const pitchData = {};
  for (const pitchId of Object.keys(pitchVoteMap)) {
    const voterTiers = pitchVoteMap[pitchId];
    const teamVotes = voterTiers;
    const tlVotes = {};
    for (const name of Object.keys(voterTiers)) {
      if (devTLNames.has(name) || TL_ROLES.has(voterRoles[name])) tlVotes[name] = voterTiers[name];
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
    pitchData[pitchId] = { teamVotes, tlVotes, teamPriorityScore, tlPriorityScore, devInterest };
  }

  return json200({
    pitchData,
    unavailableNames: [...unavailableSet],
    unavailableForDevNames: [...unavailableForDevSet],
    unavailableForPqa1Names: [...unavailableForPqa1Set],
    capacityByName,
  });
}

/**
 * Classify a merged capacityByName map into the three legacy unavailability
 * lists. Treats `none`-on-everything as fully unavailable, `none` for one
 * pool only as unavailable for that pool. People with no `none` markers are
 * not surfaced on any list — they're just at reduced/normal capacity.
 *
 * @param {Object<string, {devCapacity?, pqa1Capacity?, capacity?}>} capacityByName
 * @return {{unavailableNames: string[], unavailableForDevNames: string[], unavailableForPqa1Names: string[]}}
 */
function classifyCapacityLists(capacityByName) {
  const unavailableNames = [];
  const unavailableForDevNames = [];
  const unavailableForPqa1Names = [];
  Object.keys(capacityByName).forEach(name => {
    const cap = capacityByName[name] || {};
    const dev = cap.devCapacity;
    const pqa = cap.pqa1Capacity;
    const overall = cap.capacity;
    // Fully unavailable: explicit overall=none, or both dev and pqa1 = none.
    if (overall === 'none' || (dev === 'none' && pqa === 'none')) {
      unavailableNames.push(name);
      return;
    }
    if (dev === 'none' && pqa !== 'none') {
      unavailableForDevNames.push(name);
      return;
    }
    if (pqa === 'none' && dev !== 'none') {
      unavailableForPqa1Names.push(name);
      return;
    }
  });
  return { unavailableNames, unavailableForDevNames, unavailableForPqa1Names };
}

/**
 * Read the CAPACITY_OVERRIDES sheet into a map keyed by name.
 * Returns {} if the sheet doesn't exist or has only a header row.
 *
 * @return {Object<string, {devCapacity?, pqa1Capacity?, capacity?, comment?, setBy?, timestamp?}>}
 */
function readCapacityOverrides() {
  const sh = ss.getSheetByName('CAPACITY_OVERRIDES');
  if (!sh || sh.getLastRow() <= 1) return {};
  const numCols = Math.max(sh.getLastColumn(), 7);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
  const out = {};
  for (const row of rows) {
    const name = row[0];
    if (!name) continue;
    const rec = {};
    if (row[1] !== '' && row[1] !== null && row[1] !== undefined) rec.devCapacity = String(row[1]);
    if (row[2] !== '' && row[2] !== null && row[2] !== undefined) rec.pqa1Capacity = String(row[2]);
    if (row[3] !== '' && row[3] !== null && row[3] !== undefined) rec.capacity = String(row[3]);
    if (row[4] !== '' && row[4] !== null && row[4] !== undefined) rec.comment = String(row[4]);
    if (row[5] !== '' && row[5] !== null && row[5] !== undefined) rec.setBy = String(row[5]);
    if (row[6] instanceof Date) rec.timestamp = row[6].toISOString();
    out[String(name)] = rec;
  }
  return out;
}

/**
 * Record (or replace) a TL-set capacity override for a single person.
 * Creates the CAPACITY_OVERRIDES sheet on first use.
 *
 * @param {Object} body - { name, devCapacity?, pqa1Capacity?, capacity?, comment?, setBy }
 * @return {TextOutput} JSON { saved: 1 }
 */
function recordCapacityOverride(body) {
  const { name, setBy } = body || {};
  if (!name || !setBy) {
    return badRequest('name and setBy are required');
  }

  // Pass capacity fields through — empty/undefined ⇒ stored as ''. We don't
  // restrict to the four canonical tier strings here so a TL can clear a
  // field by sending '' explicitly.
  const devCapacity = (body.devCapacity != null) ? String(body.devCapacity) : '';
  const pqa1Capacity = (body.pqa1Capacity != null) ? String(body.pqa1Capacity) : '';
  const capacity = (body.capacity != null) ? String(body.capacity) : '';
  const comment = (body.comment != null) ? String(body.comment) : '';

  return withLock(() => {
    let sh = ss.getSheetByName('CAPACITY_OVERRIDES');
    if (!sh) {
      sh = ss.insertSheet('CAPACITY_OVERRIDES');
      sh.appendRow(['name', 'devCapacity', 'pqa1Capacity', 'capacity', 'comment', 'setBy', 'timestamp']);
    } else if (sh.getLastRow() === 0) {
      sh.appendRow(['name', 'devCapacity', 'pqa1Capacity', 'capacity', 'comment', 'setBy', 'timestamp']);
    }

    const now = new Date();
    const newRow = [name, devCapacity, pqa1Capacity, capacity, comment, setBy, now];

    // Find existing row for this name and overwrite, else append.
    if (sh.getLastRow() > 1) {
      const names = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat();
      const idx = names.indexOf(name);
      if (idx !== -1) {
        sh.getRange(idx + 2, 1, 1, 7).setValues([newRow]);
        return json200({ saved: 1 });
      }
    }

    sh.getRange(sh.getLastRow() + 1, 1, 1, 7).setValues([newRow]);
    return json200({ saved: 1 });
  });
}

/**
 * Lookup one voter's persisted availability + capacity values, merging their
 * own answer (from VOTES col H..M) with any TL override (from CAPACITY_OVERRIDES;
 * override wins). Used by the frontend to pre-check before showing the
 * AvailabilityDialog — if we already have an answer, skip the popup.
 *
 * Response shape:
 *   { found: false }                                    — voter has no row + no override
 *   { found: true, available, availableForPQA1,         — at least one field present
 *                  devCapacity, pqa1Capacity,
 *                  capacity, availabilityComment }
 *
 * Empty / missing fields come back as null/'' so the frontend can treat
 * "voter exists but no availability data" as "still need to prompt".
 */
function getVoterAvailability(name) {
  if (!name) return json200({ found: false });

  let voterFields = null;
  let hasInterestVotes = false;
  const sh = ss.getSheetByName('VOTES');
  if (sh && sh.getLastRow() > 1) {
    const numCols = Math.max(sh.getLastColumn(), 13);
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
    // Latest non-empty value wins (rows for the same voter should agree, but
    // we tolerate partial migrations the same way getAllocationData does).
    for (const row of rows) {
      if (row[1] !== name) continue;
      if (!voterFields) voterFields = {
        available: null, availableForPQA1: null,
        devCapacity: null, pqa1Capacity: null, capacity: null,
        availabilityComment: '',
      };
      if (row[7] === true || row[7] === false) voterFields.available = row[7];
      if (row[8] === true || row[8] === false) voterFields.availableForPQA1 = row[8];
      if (row[9] !== '' && row[9] != null) voterFields.devCapacity = String(row[9]);
      if (row[10] !== '' && row[10] != null) voterFields.pqa1Capacity = String(row[10]);
      if (row[11] !== '' && row[11] != null) voterFields.capacity = String(row[11]);
      if (row[12] !== '' && row[12] != null) voterFields.availabilityComment = String(row[12]);
      // interestLevel lives in column G (index 6). Any non-empty value means
      // this voter has already submitted interest data for this pitch.
      if (row[6] !== '' && row[6] !== null && row[6] !== undefined) hasInterestVotes = true;
    }
  }

  // TL override wins over voter answer where present.
  const overrides = readCapacityOverrides();
  const o = overrides[name];
  if (o) {
    if (!voterFields) voterFields = {
      available: null, availableForPQA1: null,
      devCapacity: null, pqa1Capacity: null, capacity: null,
      availabilityComment: '',
    };
    if (o.devCapacity) {
      voterFields.devCapacity = o.devCapacity;
      voterFields.available = o.devCapacity !== 'none';
    }
    if (o.pqa1Capacity) {
      voterFields.pqa1Capacity = o.pqa1Capacity;
      voterFields.availableForPQA1 = o.pqa1Capacity !== 'none';
    }
    if (o.capacity) {
      voterFields.capacity = o.capacity;
      voterFields.available = o.capacity !== 'none';
    }
    if (o.comment) voterFields.availabilityComment = o.comment;
  }

  if (!voterFields) return json200({ found: false, hasInterestVotes: hasInterestVotes });
  voterFields.found = true;
  voterFields.hasInterestVotes = hasInterestVotes;
  return json200(voterFields);
}

/**
 * Polling state — current stage + cycle id. Stored as Script Properties so
 * an admin can advance the quarter or move to the next stage from the UI
 * without rebuilding. Frontend caches these in localStorage and overrides
 * the build-time VITE_POLLING_* env vars.
 *
 * Valid stage values: '1' | 'tl-1' | '2' | 'tl-2'.
 * Returns empty strings when the property hasn't been set; the frontend
 * then falls back to the env var.
 */
function getPollingState() {
  const props = PropertiesService.getScriptProperties();
  return json200({
    stage: props.getProperty('polling_stage') || '',
    cycleId: props.getProperty('polling_cycle_id') || '',
  });
}

// ─── Edit lock (Stage 2 / Stage 4 single-editor coordination) ─────────────
//
// Stage 2 (dev assignment) and Stage 4 (TL/QM/PQA1 staffing) each have their
// own edit lock so only one TL writes to a stage at a time. Storage: Script
// Properties — `editLock_stage2` and `editLock_stage4` keys, JSON-encoded
// `{holder, acquiredAt, lastHeartbeat}` records. Lock is considered stale and
// up-for-grabs if lastHeartbeat is more than EDIT_LOCK_TTL_MS old.

const EDIT_LOCK_TTL_MS = 5 * 60 * 1000;

function editLockKey(stage) {
  if (stage === '2' || stage === 2) return 'editLock_stage2';
  if (stage === '4' || stage === 4) return 'editLock_stage4';
  return null;
}

function readEditLock(stage) {
  const key = editLockKey(stage);
  if (!key) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      holder: parsed.holder || null,
      // holderSession was added when the lock became per-tab. Older records
      // without it fall back to null; the caller will treat any session it
      // owns as not-matching and trigger a force-take dialog, which is the
      // correct upgrade path.
      holderSession: parsed.holderSession || null,
      acquiredAt: parsed.acquiredAt || 0,
      lastHeartbeat: parsed.lastHeartbeat || 0,
    };
  } catch (e) {
    return { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 };
  }
}

function writeEditLock(stage, holder, holderSession) {
  const key = editLockKey(stage);
  if (!key) return null;
  if (holder == null || holder === '') {
    PropertiesService.getScriptProperties().deleteProperty(key);
    return { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 };
  }
  const now = Date.now();
  const record = { holder: holder, holderSession: holderSession || null, acquiredAt: now, lastHeartbeat: now };
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(record));
  return record;
}

function bumpEditLockHeartbeat(stage, holder, holderSession) {
  const key = editLockKey(stage);
  if (!key) return null;
  const existing = readEditLock(stage);
  // Heartbeat only refreshes when BOTH name and session match — otherwise the
  // caller is a different tab from the same user and doesn't actually hold
  // the lock, so we leave the existing record alone.
  if (!existing || existing.holder !== holder || existing.holderSession !== (holderSession || null)) return existing;
  const record = { holder: holder, holderSession: holderSession || null, acquiredAt: existing.acquiredAt || Date.now(), lastHeartbeat: Date.now() };
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(record));
  return record;
}

function isEditLockStale(lock) {
  if (!lock || !lock.holder) return true;
  return Date.now() - (lock.lastHeartbeat || 0) > EDIT_LOCK_TTL_MS;
}

/**
 * GET handler — returns the current edit-lock state for one or both stages.
 * Query params: `stage=2`, `stage=4`, or omit for both.
 */
function getEditLock(stage) {
  if (stage === '2' || stage === '4') {
    return json200({ stage: stage, lock: readEditLock(stage) });
  }
  return json200({
    stage2: readEditLock('2'),
    stage4: readEditLock('4'),
  });
}

/**
 * Acquire the lock for a stage. Body: { stage, voterName, force? }.
 *
 *   - No current holder OR holder is stale → granted.
 *   - Caller is current holder → granted (no-op, refreshes heartbeat).
 *   - Different fresh holder + force !== true → returns 200 with
 *     { acquired: false, lock: <current> } so the frontend can show the
 *     "X has the lock" dialog and offer to force.
 *   - Different fresh holder + force === true → granted, previous holder's
 *     unsaved work is at risk (frontend disclaims this in the UI).
 */
function acquireEditLock(body) {
  const stage = String(body.stage || '');
  const voterName = String(body.voterName || '').trim();
  const sessionId = String(body.sessionId || '').trim() || null;
  const force = body.force === true;
  if (!editLockKey(stage)) return badRequest('Invalid stage');
  if (!voterName) return badRequest('Missing voterName');

  const current = readEditLock(stage);
  // Grant when: no holder, the same (user, tab session) is re-acquiring,
  // the lock is stale, or force=true. Same user from a different tab is
  // explicitly NOT auto-granted — that path returns acquired=false so the
  // UI can prompt with the force-take dialog ("You're editing in another
  // tab. Take the lock here?").
  const sameClient = current.holder === voterName && current.holderSession === sessionId;
  const canGrant = !current.holder || sameClient || isEditLockStale(current) || force;
  if (!canGrant) {
    return json200({ acquired: false, lock: current });
  }
  const updated = writeEditLock(stage, voterName, sessionId);
  return json200({ acquired: true, lock: updated, force: force && current.holder && !sameClient });
}

/** Release the lock if caller currently holds it (matched by name + session). */
function releaseEditLock(body) {
  const stage = String(body.stage || '');
  const voterName = String(body.voterName || '').trim();
  const sessionId = String(body.sessionId || '').trim() || null;
  if (!editLockKey(stage)) return badRequest('Invalid stage');
  const current = readEditLock(stage);
  // Release is gated on session too — another tab from the same user
  // shouldn't be able to drop a lock it doesn't actually hold.
  if (current.holder && (current.holder !== voterName || current.holderSession !== sessionId)) {
    return json200({ released: false, lock: current });
  }
  writeEditLock(stage, null);
  return json200({ released: true, lock: { holder: null, holderSession: null, acquiredAt: 0, lastHeartbeat: 0 } });
}

/**
 * Bump the heartbeat. Returns the current lock state so the frontend can
 * detect when it's been force-grabbed by someone else (holder or session
 * no longer matches the caller).
 */
function heartbeatEditLock(body) {
  const stage = String(body.stage || '');
  const voterName = String(body.voterName || '').trim();
  const sessionId = String(body.sessionId || '').trim() || null;
  if (!editLockKey(stage)) return badRequest('Invalid stage');
  bumpEditLockHeartbeat(stage, voterName, sessionId);
  return json200({ lock: readEditLock(stage) });
}

/** Check that a caller holds (or could claim) the lock for a save. The save
 *  path matches on session too — a second tab from the same user can't sneak
 *  a save through while the first tab holds the lock. */
function callerHoldsEditLock(stage, voterName, sessionId) {
  const key = editLockKey(stage);
  if (!key) return true;
  const current = readEditLock(stage);
  if (!current.holder) return true;            // unowned — accept the save
  if (isEditLockStale(current)) return true;   // stale — accept
  return current.holder === voterName && current.holderSession === (sessionId || null);
}

// ─── Allocation locks (per-stage pitch/person locks for auto-assign) ──────
//
// Locks tell the auto-assign algorithm to leave a pitch row or person's
// pitches as-is. Persisted in a single Script Property so all TLs see the
// same lock state. Shape:
//   { "2": { pitchIds: string[], personNames: string[] },
//     "4": { pitchIds: string[], personNames: string[] } }
// Only the holder of the corresponding stage's edit lock can write; reads
// are public (viewers see the same locks the editor set).

const ALLOCATION_LOCKS_KEY = 'allocation_locks';

function emptyAllocationLocks() {
  return {
    '2': { pitchIds: [], personNames: [] },
    '4': { pitchIds: [], personNames: [] },
  };
}

function readAllocationLocks() {
  const raw = PropertiesService.getScriptProperties().getProperty(ALLOCATION_LOCKS_KEY);
  if (!raw) return emptyAllocationLocks();
  try {
    const parsed = JSON.parse(raw) || {};
    const normalize = (obj) => ({
      pitchIds: Array.isArray(obj && obj.pitchIds) ? obj.pitchIds.map(String) : [],
      personNames: Array.isArray(obj && obj.personNames) ? obj.personNames.map(String) : [],
    });
    return {
      '2': normalize(parsed['2']),
      '4': normalize(parsed['4']),
    };
  } catch (e) {
    return emptyAllocationLocks();
  }
}

function getAllocationLocks() {
  return json200(readAllocationLocks());
}

function setAllocationLocks(body) {
  const stage = String((body && body.stage) || '');
  if (stage !== '2' && stage !== '4') return badRequest('Invalid stage');
  const submittedBy = String((body && body.submittedBy) || '').trim();
  if (!submittedBy) return badRequest('Missing submittedBy');
  const sessionId = String((body && body.sessionId) || '').trim() || null;

  // Edit-lock check — only the stage's current editor (same name AND tab
  // session) can write. Older clients without sessionId fall back to the
  // pre-session "any tab from this user" semantics.
  if (!callerHoldsEditLock(stage, submittedBy, sessionId)) {
    return json200({ error: 'edit-lock-conflict', stage: stage, lock: readEditLock(stage) });
  }

  const incoming = (body && body.locks) || {};
  const pitchIds = Array.isArray(incoming.pitchIds)
    ? Array.from(new Set(incoming.pitchIds.map(String)))
    : [];
  const personNames = Array.isArray(incoming.personNames)
    ? Array.from(new Set(incoming.personNames.map(String)))
    : [];

  const all = readAllocationLocks();
  all[stage] = { pitchIds: pitchIds, personNames: personNames };
  PropertiesService.getScriptProperties().setProperty(ALLOCATION_LOCKS_KEY, JSON.stringify(all));
  return json200({ saved: true, locks: all });
}

/**
 * Update the polling state. Gated to setBy='Chase Grey' so a stray POST
 * can't roll the stage on everyone. Pass either or both fields. Empty
 * string is treated as "leave unchanged" (use a non-empty value to clear,
 * or delete the Script Property manually).
 *
 * @param {{stage?: string, cycleId?: string, setBy: string}} body
 */
function setPollingState(body) {
  const { stage, cycleId, setBy } = body || {};
  if (!setBy || setBy !== 'Chase Grey') {
    return badRequest('Only Chase Grey may update polling state');
  }
  const props = PropertiesService.getScriptProperties();
  if (typeof stage === 'string' && stage.length > 0) {
    if (!['1', 'tl-1', '2', 'tl-2'].includes(stage)) {
      return badRequest("Invalid stage — must be '1', 'tl-1', '2', or 'tl-2'");
    }
    props.setProperty('polling_stage', stage);
  }
  if (typeof cycleId === 'string' && cycleId.length > 0) {
    props.setProperty('polling_cycle_id', cycleId);
  }
  return json200({
    stage: props.getProperty('polling_stage') || '',
    cycleId: props.getProperty('polling_cycle_id') || '',
  });
}

// Unified PLAN sheet schema. Every plan write uses this exact column order;
// callers (savePlan/saveFinalAssignments) only set the subset of fields they
// know about and the rest are preserved from whatever was already on the row.
// prjId is appended at the end so the fixed column offsets in getPlanStatuses
// (statusIdx = pidIdx + 2, devIdx = pidIdx + 3, etc.) stay valid. Adhoc pitches
// carry a project tracker ID through their PITCHES row; this column surfaces
// that ID on the PLAN sheet so downstream consumers don't have to join.
// categoryOverride: empty string when the pitch should use its source category
// (the spreadsheet's value for voting-imported pitches, or the saved category
// on adhoc pitches). Non-empty when a TL has remapped the pitch to a different
// category from the Stage 4 edit dialog. Appended at the end so the fixed
// column offsets in getPlanStatuses stay valid.
const PLAN_HEADERS = ['timestamp', 'submittedBy', 'pitchId', 'pitchTitle', 'status', 'assignedDev', 'devTL', 'qm', 'pqa1', 'projectCreated', 'kickoffEmailSent', 'prjId', 'stretch', 'categoryOverride', 'fullBandwidth'];

/**
 * Upsert PLAN rows by pitchId.
 *
 * `updates` is an array of partial plan rows. For each update:
 *   - Fields present in the update overwrite the existing row's fields.
 *   - Fields not present are preserved from the existing row.
 *   - A pitchId with no existing row gets appended.
 * Rows in the sheet whose pitchId is NOT in `updates` are left untouched.
 *
 * This replaces the older "clearContents + rewrite" approach, which wiped any
 * pitch the current caller's local state didn't know about — a Stage 4 partial
 * save (e.g. Lauren saving QMs for a subset) would drop the rest of the plan.
 *
 * @param {Array<Object>} updates
 * @param {string} submittedBy
 * @return {Object} { saved: number, preserved: number }
 */
function upsertPlanRows(updates, submittedBy) {
  let sh = ss.getSheetByName('PLAN');
  if (!sh) sh = ss.insertSheet('PLAN');

  // Read existing rows into a map keyed by pitchId. Handle older schemas
  // (5/6/7/10/11 cols) by mapping by header name when possible.
  const existingByPitch = {};
  const numCols = sh.getLastColumn();
  if (sh.getLastRow() > 1 && numCols > 0) {
    const headerRow = sh.getRange(1, 1, 1, numCols).getValues()[0];
    const pidIdx = headerRow.indexOf('pitchId');
    if (pidIdx >= 0) {
      const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
      for (const row of rows) {
        const pid = row[pidIdx];
        if (!pid) continue;
        const obj = {};
        for (let i = 0; i < headerRow.length && i < row.length; i++) {
          obj[headerRow[i]] = row[i];
        }
        existingByPitch[String(pid)] = obj;
      }
    }
  }
  const preservedCount = Object.keys(existingByPitch).length;

  const now = new Date();
  const pitchTitles = getPitchTitleMap();

  // Convert null → '' but treat undefined as "not provided" (preserve existing).
  // hasOwnProperty distinguishes "the caller wrote null to clear this" from
  // "the caller didn't touch this field".
  const pick = (update, field, existing, fallback) => {
    if (Object.prototype.hasOwnProperty.call(update, field)) {
      const v = update[field];
      return v == null ? '' : v;
    }
    return existing[field] != null ? existing[field] : (fallback != null ? fallback : '');
  };

  for (const u of updates) {
    const pid = String(u.pitchId);
    if (!pid) continue;
    const existing = existingByPitch[pid] || {};
    // Stretch / fullBandwidth are booleans — write TRUE/FALSE (Apps Script
    // renders these as sheet booleans), preserving existing value when the
    // caller didn't touch the field.
    const stretchValue = Object.prototype.hasOwnProperty.call(u, 'stretch')
      ? u.stretch === true
      : existing.stretch === true;
    const fullBandwidthValue = Object.prototype.hasOwnProperty.call(u, 'fullBandwidth')
      ? u.fullBandwidth === true
      : existing.fullBandwidth === true;
    existingByPitch[pid] = {
      timestamp: now,
      submittedBy: submittedBy || existing.submittedBy || '',
      pitchId: pid,
      pitchTitle: u.pitchTitle || existing.pitchTitle || pitchTitles[pid] || '',
      status: pick(u, 'status', existing, ''),
      assignedDev: pick(u, 'assignedDev', existing, ''),
      devTL: pick(u, 'devTL', existing, ''),
      qm: pick(u, 'qm', existing, ''),
      pqa1: pick(u, 'pqa1', existing, ''),
      projectCreated: existing.projectCreated === true,
      kickoffEmailSent: existing.kickoffEmailSent === true,
      prjId: pick(u, 'prjId', existing, ''),
      stretch: stretchValue,
      categoryOverride: pick(u, 'categoryOverride', existing, ''),
      fullBandwidth: fullBandwidthValue,
    };
  }

  // Write back the full set (existing + updated + new).
  const orderedPids = Object.keys(existingByPitch);
  const rows = [PLAN_HEADERS].concat(
    orderedPids.map(pid => {
      const r = existingByPitch[pid];
      return PLAN_HEADERS.map(h => (r[h] != null ? r[h] : ''));
    })
  );
  sh.clearContents();
  sh.getRange(1, 1, rows.length, PLAN_HEADERS.length).setValues(rows);

  return { saved: updates.length, preserved: preservedCount };
}

/**
 * Save the stage 2 plan to the PLAN sheet. Each call upserts only the fields
 * it knows about (status + assignedDev), preserving any TL/QM/PQA1/follow-up
 * state already on the row.
 *
 * Expected assignments: [{ pitchId, status: 'selected'|'next-up'|'cut', assignedDev: string|null }]
 *
 * @param {Array} assignments
 * @return {TextOutput} JSON { saved: number, preserved: number }
 */
function savePlan(assignments, submittedBy, sessionId) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return badRequest('assignments must be a non-empty array');
  }
  if (!callerHoldsEditLock('2', submittedBy, sessionId || null)) {
    return json200({ error: 'edit-lock-conflict', stage: '2', lock: readEditLock('2') });
  }
  return withLock(() => json200(upsertPlanRows(assignments, submittedBy)));
}

/**
 * Save stage 4 final assignments. Upserts status + assignedDev + devTL + qm +
 * pqa1 by pitchId. Rows not in the payload (e.g. pitches another TL hasn't
 * gotten to yet) are preserved untouched — partial saves no longer wipe the
 * rest of the plan.
 *
 * Expected assignments: [{ pitchId, status, assignedDev, devTL, qm, pqa1 }]
 *
 * @param {Array} assignments
 * @return {TextOutput} JSON { saved: number, preserved: number }
 */
function saveFinalAssignments(assignments, submittedBy, sessionId) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return badRequest('assignments must be a non-empty array');
  }
  if (!callerHoldsEditLock('4', submittedBy, sessionId || null)) {
    return json200({ error: 'edit-lock-conflict', stage: '4', lock: readEditLock('4') });
  }
  return withLock(() => json200(upsertPlanRows(assignments, submittedBy)));
}

/**
 * Returns the status of all pitches in the PLAN sheet.
 * @return {TextOutput} JSON { statuses: { [pitchId]: 'selected'|'next-up'|'cut' } }
 */
function getPlanStatuses() {
  const sh = ss.getSheetByName('PLAN');
  if (!sh || sh.getLastRow() <= 1) return json200({ statuses: {}, assignments: {} });
  // Schema history: 5 cols (no title) → 6 cols (added pitchTitle) → 7+ cols
  // (added submittedBy after savePlan), with saveFinalAssignments later
  // appending devTL/qm/pqa1/projectCreated/kickoffEmailSent.
  const numCols = sh.getLastColumn();
  const hasSubmittedBy = sh.getRange(1, 2).getValue() === 'submittedBy';
  const pidIdx     = hasSubmittedBy ? 2 : 1;
  const statusIdx  = pidIdx + 2;
  const devIdx     = pidIdx + 3;
  const tlIdx      = pidIdx + 4;
  const qmIdx      = pidIdx + 5;
  const pqa1Idx    = pidIdx + 6;
  // Stretch lives at PLAN_HEADERS index 12 ('timestamp' .. 'stretch'); when
  // hasSubmittedBy=true that maps to col offset (pidIdx + 10) = 12. Older
  // sheets without submittedBy don't have a stretch col — safe() returns
  // null when the index is past numCols, so the field just won't appear.
  const stretchIdx = pidIdx + 10;
  // categoryOverride sits one column past stretch. Same fallback semantics:
  // older sheets without the column return null and the frontend treats
  // missing as "no override → use source category".
  const catOverrideIdx = pidIdx + 11;
  // fullBandwidth sits one column past categoryOverride.
  const fullBandwidthIdx = pidIdx + 12;

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
  const statuses = {};
  const assignments = {};
  const safe = (idx, row) => (idx < numCols && row[idx] !== '' && row[idx] != null) ? String(row[idx]) : null;
  for (const row of rows) {
    const pitchId = String(row[pidIdx] || '');
    if (!pitchId) continue;
    const status = safe(statusIdx, row) || '';
    if (status) statuses[pitchId] = status;
    assignments[pitchId] = {
      status: status,
      assignedDev: safe(devIdx, row),
      devTL: safe(tlIdx, row),
      qm: safe(qmIdx, row),
      pqa1: safe(pqa1Idx, row),
      stretch: stretchIdx < numCols && row[stretchIdx] === true,
      categoryOverride: safe(catOverrideIdx, row),
      fullBandwidth: fullBandwidthIdx < numCols && row[fullBandwidthIdx] === true,
    };
  }
  return json200({ statuses, assignments });
}

/**
 * Returns follow-up completion state for all pitches in the PLAN sheet.
 * @return {TextOutput} JSON { followups: { [pitchId]: { projectCreated, kickoffEmailSent } } }
 */
function getFollowups() {
  const sh = ss.getSheetByName('PLAN');
  if (!sh || sh.getLastRow() <= 1) return json200({ followups: {} });

  const numCols = sh.getLastColumn();
  const hasSubmittedBy = sh.getRange(1, 2).getValue() === 'submittedBy';
  const hasTitle = hasSubmittedBy || numCols >= 10;
  const pidIdx = hasSubmittedBy ? 2 : 1;
  const pcIdx  = hasSubmittedBy ? 9 : (hasTitle ? 8 : 7);
  const keIdx  = hasSubmittedBy ? 10 : (hasTitle ? 9 : 8);

  const data = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
  const followups = {};
  for (const row of data) {
    const pitchId = row[pidIdx];
    if (!pitchId) continue;
    followups[pitchId] = {
      projectCreated: row[pcIdx] === true,
      kickoffEmailSent: row[keIdx] === true,
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

  return withLock(() => {
    const sh = ss.getSheetByName('PLAN');
    if (!sh || sh.getLastRow() <= 1) return notFound();

    const hasSubmittedBy = sh.getRange(1, 2).getValue() === 'submittedBy';
    const pitchIdCol = hasSubmittedBy ? 3 : 2;
    const ids = sh.getRange(2, pitchIdCol, sh.getLastRow() - 1, 1).getValues().flat();
    const rowIdx = ids.indexOf(pitchId);
    if (rowIdx === -1) return notFound();

    const col = field === 'projectCreated' ? (hasSubmittedBy ? 10 : 9) : (hasSubmittedBy ? 11 : 10);
    sh.getRange(rowIdx + 2, col).setValue(value === 'true' || value === true);
    return json200({ updated: 1 });
  });
}

/**
 * Return Phase 2 interest votes (dev TL / QM interest in selected projects).
 * Reads interestLevel from the VOTES sheet (col G) for voters whose role is
 * 'dev TL' or 'QM'. Returns [] if VOTES has no data.
 *
 * Response shape: Phase2Interest[]
 *   [{ personName, role, interestByPitchId: { [pitchId]: 1|2|3|4|null } }]
 *
 * @return {TextOutput} JSON Phase2Interest array
 */
function getPhase2Interests() {
  const sh = ss.getSheetByName('VOTES');
  if (!sh || sh.getLastRow() <= 1) return json200([]);

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  const byPerson = {};

  for (const row of rows) {
    const voterName    = row[1]; // column B
    const voterRole    = row[2]; // column C
    const pitchId      = row[3]; // column D
    const interestLevel = row[6]; // column G
    if (!voterName || !pitchId) continue;
    if (voterRole !== 'dev TL' && voterRole !== 'QM') continue;
    if (interestLevel === '' || interestLevel === null || interestLevel === undefined) continue;
    if (!byPerson[voterName]) {
      byPerson[voterName] = { personName: voterName, role: voterRole, interestByPitchId: {} };
    }
    byPerson[voterName].interestByPitchId[String(pitchId)] = Number(interestLevel);
  }

  return json200(Object.values(byPerson));
}

/**
 * Record Phase 2 interest votes for a dev TL or QM into the VOTES sheet.
 * Updates the interestLevel column (G) on existing rows for this voter/pitch pair.
 * Inserts new rows for pitches that have no existing vote row.
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

  return withLock(() => {
    let sh = ss.getSheetByName('VOTES');
    if (!sh) {
      sh = ss.insertSheet('VOTES');
      sh.appendRow(['timestamp', 'voterName', 'voterRole', 'pitch_id', 'pitchTitle', 'tier', 'interestLevel']);
    } else if (sh.getLastColumn() < 7) {
      sh.insertColumnAfter(4);
      sh.getRange(1, 5).setValue('pitchTitle');
    }

    const now = new Date();
    const existingRows = sh.getLastRow() > 1
      ? sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues()
      : [];

    // Map pitch_id → sheet row index (1-based) for this voter's existing rows
    const rowByPitchId = {};
    for (let i = 0; i < existingRows.length; i++) {
      if (existingRows[i][1] === voterName) {
        rowByPitchId[String(existingRows[i][3])] = i + 2;
      }
    }

    const toInsert = [];
    for (const interest of interests) {
      const pitchId = String(interest.pitch_id);
      const level = (interest.level !== null && interest.level !== undefined) ? interest.level : '';
      if (rowByPitchId[pitchId] !== undefined) {
        sh.getRange(rowByPitchId[pitchId], 7).setValue(level); // update interestLevel col
      } else {
        toInsert.push([now, voterName, role, pitchId, '', '', level]);
      }
    }

    if (toInsert.length > 0) {
      sh.getRange(sh.getLastRow() + 1, 1, toInsert.length, 7).setValues(toInsert);
    }

    return json200({ saved: interests.length });
  });
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

// PITCHES sheet schema. Column order is load-bearing for getPitches /
// refreshPitches / saveAdhocPitch — keep in sync.
const PITCH_HEADERS = ['pitch_id', 'title', 'problem', 'ideaForSolution', 'whyNow', 'smartToolsFit', 'epicFit', 'maintenance', 'internCandidate', 'characteristics', 'success', 'committed', 'category', 'adhoc', 'prjId'];

function isAdhocCellTrue(value) {
  return value === true || value === 'true' || value === 'TRUE';
}

/**
 * Refresh the PITCHES sheet with a full replacement dataset from the caller.
 * Creates the sheet if it does not exist. Adhoc rows (adhoc=true) are preserved
 * across the rewrite so locally-added projects survive the next page load that
 * pushes the static JSON.
 *
 * Expected body: { pitches: { pitch_id, title, problem, ideaForSolution, whyNow,
 *   smartToolsFit, epicFit, maintenance, internCandidate, characteristics, success,
 *   committed, category }[] }
 *
 * The `committed` column flags pitches that are pre-allocated for next quarter —
 * they skip priority/interest voting and surface as locked rows in TL allocation.
 * Admins can flip a pitch to/from committed by editing this column directly. The
 * `adhoc` column flags rows that were added through the TL allocation UI rather
 * than the pitch process; those are excluded from the static replacement so this
 * function never wipes them.
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { updated: number, preserved: number }
 */
function refreshPitches(body) {
  const pitches = body.pitches || [];
  const sh = ss.getSheetByName('PITCHES') || ss.insertSheet('PITCHES');

  // Capture existing adhoc rows before clearing — they're not in the incoming
  // payload (caller is the static-JSON pusher) and should survive the rewrite.
  let preservedAdhoc = [];
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const existing = sh.getRange(2, 1, lastRow - 1, PITCH_HEADERS.length).getValues();
    const adhocColIdx = PITCH_HEADERS.indexOf('adhoc');
    preservedAdhoc = existing.filter(r => isAdhocCellTrue(r[adhocColIdx]));
  }

  sh.clearContents();

  const staticRows = pitches.map(p => PITCH_HEADERS.map(k => {
    if (k === 'adhoc') return false;
    return p[k] != null ? p[k] : '';
  }));
  const rows = [PITCH_HEADERS, ...staticRows, ...preservedAdhoc];
  sh.getRange(1, 1, rows.length, PITCH_HEADERS.length).setValues(rows);

  return json200({ updated: pitches.length, preserved: preservedAdhoc.length });
}

/**
 * Upsert a single adhoc pitch in the PITCHES sheet. Matches by pitch_id; if a
 * row with that id exists it's overwritten, otherwise a new row is appended.
 * Always sets adhoc=true so the row survives the next refreshPitches.
 *
 * Expected body: { pitch: { pitch_id, title, category, committed } }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { saved: 1, action: 'inserted' | 'updated' }
 */
function saveAdhocPitch(body) {
  const p = body.pitch || {};
  if (!p.pitch_id) return badRequest('Missing pitch_id');

  const sh = ss.getSheetByName('PITCHES') || ss.insertSheet('PITCHES');
  // Ensure header row exists.
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, PITCH_HEADERS.length).setValues([PITCH_HEADERS]);
  }

  const row = PITCH_HEADERS.map(k => {
    if (k === 'adhoc') return true;
    return p[k] != null ? p[k] : '';
  });

  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === p.pitch_id) {
        sh.getRange(i + 2, 1, 1, PITCH_HEADERS.length).setValues([row]);
        return json200({ saved: 1, action: 'updated' });
      }
    }
  }
  sh.appendRow(row);
  return json200({ saved: 1, action: 'inserted' });
}

/**
 * Delete an adhoc pitch from the PITCHES sheet. Refuses to delete non-adhoc
 * rows so the static dataset can't be removed through this route.
 *
 * Expected body: { pitch_id: string }
 *
 * @param {Object} body - Parsed request body
 * @return {TextOutput} JSON { deleted: 0 | 1 }
 */
function deleteAdhocPitch(body) {
  const id = body.pitch_id;
  if (!id) return badRequest('Missing pitch_id');

  const sh = ss.getSheetByName('PITCHES');
  if (!sh) return json200({ deleted: 0 });

  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return json200({ deleted: 0 });

  const adhocColIdx = PITCH_HEADERS.indexOf('adhoc');
  const data = sh.getRange(2, 1, lastRow - 1, PITCH_HEADERS.length).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === id && isAdhocCellTrue(data[i][adhocColIdx])) {
      sh.deleteRow(i + 2);
      return json200({ deleted: 1 });
    }
  }
  return json200({ deleted: 0 });
}

/**
 * Return only the adhoc rows from the PITCHES sheet. Used by the frontend on
 * page load to merge backend-persisted adhoc projects with the static JSON.
 *
 * @return {TextOutput} JSON [{ pitch_id, title, category, committed, adhoc:true }]
 */
function getAdhocPitches() {
  const sh = ss.getSheetByName('PITCHES');
  if (!sh) return json200([]);
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return json200([]);

  const adhocColIdx = PITCH_HEADERS.indexOf('adhoc');
  const titleIdx = PITCH_HEADERS.indexOf('title');
  const categoryIdx = PITCH_HEADERS.indexOf('category');
  const committedIdx = PITCH_HEADERS.indexOf('committed');
  const prjIdIdx = PITCH_HEADERS.indexOf('prjId');

  const rows = sh.getRange(2, 1, lastRow - 1, PITCH_HEADERS.length).getValues();
  const data = rows
    .filter(r => isAdhocCellTrue(r[adhocColIdx]))
    .map(r => ({
      pitch_id: r[0],
      title: r[titleIdx],
      category: r[categoryIdx],
      committed: isAdhocCellTrue(r[committedIdx]),
      adhoc: true,
      prjId: prjIdIdx >= 0 && r[prjIdIdx] != null && r[prjIdIdx] !== '' ? String(r[prjIdIdx]) : '',
    }));
  return json200(data);
}

/**
 * One-shot migration utility for the new dev-vs-PQA1 availability split.
 *
 * Run from the Apps Script editor (Run > migrateVotesSchemaForPQA1) any time —
 * idempotent. It will:
 *   1. Add the column-I header `availableForPQA1` if it's missing.
 *   2. Report how many rows there are, how many devs voted under the old
 *      single-question schema, and how many already have a PQA1 answer.
 *
 * It deliberately does NOT backfill values — leaving column I blank for
 * legacy rows is the correct behavior. The new getAllocationData() reader
 * treats blank as "unset", so a legacy `available=false` voter still ends
 * up in `unavailableNames` (fully unavailable), and a legacy `available=true`
 * voter ends up in no list (fully available). When those voters re-submit
 * via the new two-question dialog, their column-I value gets populated.
 *
 * Returns an object so the run log shows the stats.
 */
function migrateVotesSchemaForPQA1() {
  const sh = ss.getSheetByName('VOTES');
  if (!sh) {
    Logger.log('No VOTES sheet — nothing to migrate.');
    return { migrated: false, reason: 'no VOTES sheet' };
  }

  let columnAdded = false;
  if (sh.getLastColumn() < 9) {
    sh.getRange(1, 9).setValue('availableForPQA1');
    columnAdded = true;
  } else {
    // Make sure header is correct even if column already existed.
    const existing = sh.getRange(1, 9).getValue();
    if (existing !== 'availableForPQA1') {
      sh.getRange(1, 9).setValue('availableForPQA1');
      columnAdded = true;
    }
  }

  // Stats for the run log.
  let totalRows = 0;
  let devVoters = 0;
  let devVotersWithPqa1 = 0;
  let devVotersWithoutPqa1 = 0;
  let nonDevVoters = 0;

  if (sh.getLastRow() > 1) {
    const numCols = Math.max(sh.getLastColumn(), 9);
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
    totalRows = rows.length;

    // Per-voter aggregation: take the role + flags from any row for that voter.
    const perVoter = {};
    rows.forEach(row => {
      const name = row[1];
      const role = row[2];
      const pqa1 = row[8];
      if (!name) return;
      if (!perVoter[name]) perVoter[name] = { role: '', hasPqa1: false };
      if (role) perVoter[name].role = role;
      if (pqa1 === true || pqa1 === false) perVoter[name].hasPqa1 = true;
    });

    Object.values(perVoter).forEach(({ role, hasPqa1 }) => {
      if (String(role).toLowerCase() === 'dev') {
        devVoters++;
        if (hasPqa1) devVotersWithPqa1++;
        else devVotersWithoutPqa1++;
      } else if (role) {
        nonDevVoters++;
      }
    });
  }

  const result = {
    migrated: columnAdded,
    headerColumn: 'I (availableForPQA1)',
    totalRows: totalRows,
    devVoters: devVoters,
    devVotersWithPqa1Answer: devVotersWithPqa1,
    devVotersNeedingResubmit: devVotersWithoutPqa1,
    nonDevVoters: nonDevVoters,
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * One-shot backfill of known availability answers — writes the legacy
 * boolean flags (cols H, I) AND the capacity tiers + comment (cols J–M)
 * so both the old and new code paths see the same data.
 *
 * Run from the Apps Script editor (Run > backfillKnownDevAvailability) any
 * time — idempotent. Update the `KNOWN_AVAILABILITY` map below as people
 * submit.
 *
 * Per-person record fields:
 *   available, availableForPQA1: boolean | ''  (booleans for col H, I; '' = leave blank)
 *   devCapacity, pqa1Capacity, capacity:       'above-avg' | 'avg' | 'fewer' | 'none' | ''
 *   comment:                                   string (col M); only meaningful when any tier is non-'avg'
 *
 * For people who said "standard" we fill `'avg'` explicitly so the merged
 * capacityByName view is uniformly populated.
 */
function backfillKnownDevAvailability() {
  const KNOWN_AVAILABILITY = {
    // Devs — standard capacity (both pools, normal load)
    'Tim Paukovits': {
      available: true, availableForPQA1: true,
      devCapacity: 'avg', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    'Peter Paulson': {
      available: true, availableForPQA1: true,
      devCapacity: 'avg', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    'Dan Demp': {
      available: true, availableForPQA1: true,
      devCapacity: 'avg', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    'Brandon Campos Botello': {
      available: true, availableForPQA1: true,
      devCapacity: 'avg', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    'Gauresh Walia': {
      available: true, availableForPQA1: true,
      devCapacity: 'avg', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    // Devs — committed elsewhere; PQA1-only
    'Ke Li': {
      available: false, availableForPQA1: true,
      devCapacity: 'none', pqa1Capacity: 'avg', capacity: '', comment: '',
    },
    'Josh Lapicola': {
      available: false, availableForPQA1: true,
      devCapacity: 'none', pqa1Capacity: 'fewer', capacity: '',
      comment: "With the development I'm doing to support Notes on mobile (which is committed for Nov 26), I don't think I'll have time for another project. I think I could probably do PQA1 on a Nov 26 project though. I think PQA on 1 project is probably better. Thanks!",
    },
    // Dev TL — single capacity field
    'Nicholas Rose': {
      available: true, availableForPQA1: '',
      devCapacity: '', pqa1Capacity: '', capacity: 'avg', comment: '',
    },
  };

  const sh = ss.getSheetByName('VOTES');
  if (!sh || sh.getLastRow() <= 1) {
    const msg = 'VOTES sheet missing or empty — nothing to backfill.';
    Logger.log(msg);
    return { updatedRows: 0, note: msg };
  }

  // Ensure cols I and J–M exist before we write to them.
  if (sh.getLastColumn() < 9) sh.getRange(1, 9).setValue('availableForPQA1');
  if (sh.getLastColumn() < 13) {
    sh.getRange(1, 10).setValue('devCapacity');
    sh.getRange(1, 11).setValue('pqa1Capacity');
    sh.getRange(1, 12).setValue('capacity');
    sh.getRange(1, 13).setValue('availabilityComment');
  }

  const numRows = sh.getLastRow() - 1;
  const names = sh.getRange(2, 2, numRows, 1).getValues();        // col B
  // Read the 6-column block H..M so we can patch in place.
  const block = sh.getRange(2, 8, numRows, 6).getValues();        // cols H–M

  const perPersonRowCount = {};
  let updatedRows = 0;
  for (let i = 0; i < numRows; i++) {
    const name = names[i][0];
    const target = KNOWN_AVAILABILITY[name];
    if (!target) continue;
    block[i] = [
      target.available,
      target.availableForPQA1,
      target.devCapacity || '',
      target.pqa1Capacity || '',
      target.capacity || '',
      target.comment || '',
    ];
    perPersonRowCount[name] = (perPersonRowCount[name] || 0) + 1;
    updatedRows++;
  }

  if (updatedRows > 0) {
    sh.getRange(2, 8, numRows, 6).setValues(block);
  }

  const known = Object.keys(KNOWN_AVAILABILITY);
  const result = {
    updatedRows: updatedRows,
    perPersonRowCount: perPersonRowCount,
    knownButNotFoundInSheet: known.filter(n => !perPersonRowCount[n]),
    note: 'Anyone not in this map is left untouched and will be re-prompted on their next session.',
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * One-shot migration utility for the new capacity-tier model.
 *
 * Run from the Apps Script editor (Run > migrateVotesSchemaForCapacity) any
 * time — idempotent. It will:
 *   1. Add the column-J/K/L/M headers (`devCapacity`, `pqa1Capacity`,
 *      `capacity`, `availabilityComment`) to VOTES if they're missing.
 *   2. Ensure the CAPACITY_OVERRIDES sheet exists with its header row.
 *   3. Report how many existing voter rows have any capacity-tier data so
 *      the operator can see whether voters have re-submitted under the new
 *      schema yet.
 *
 * It deliberately does NOT backfill values — leaving the new columns blank
 * for legacy rows is the correct behavior. The new getAllocationData() reader
 * treats blank as "unset" and falls back to the old availability flags.
 */
/**
 * One-shot cleanup for the case where a non-contributor's row got an
 * `available=true` written to it because the old `recordVotes` defaulted
 * `undefined` to `true`. Run once after deploying the fixed `recordVotes`.
 *
 * For every VOTES row whose voter role is in the non-contributor list (UXD,
 * TLTL, TS, TCap, customer, other), this clears columns H–M (available,
 * availableForPQA1, devCapacity, pqa1Capacity, capacity, availabilityComment).
 * Their priority votes (cols A–G) stay intact — only the availability fields
 * are nulled, since non-contributors aren't asked about availability and
 * those flags were polluting `unavailableNames` calculations.
 *
 * Idempotent. Logs how many rows were touched per role.
 */
function clearNonContributorAvailability() {
  const NON_CONTRIBUTOR_ROLES = new Set(['UXD', 'TLTL', 'TS', 'TCap', 'customer', 'other']);
  const sh = ss.getSheetByName('VOTES');
  if (!sh || sh.getLastRow() <= 1) {
    const msg = 'VOTES sheet missing or empty — nothing to clean up.';
    Logger.log(msg);
    return { clearedRows: 0, note: msg };
  }

  const numRows = sh.getLastRow() - 1;
  const numCols = Math.max(sh.getLastColumn(), 13);
  const rows = sh.getRange(2, 1, numRows, numCols).getValues();
  // Cols H..M are indices 7..12 (zero-based) — the 6 availability columns.
  const blanks = ['', '', '', '', '', ''];

  const perRole = {};
  let clearedRows = 0;
  for (let i = 0; i < numRows; i++) {
    const role = String(rows[i][2] || '');
    if (NON_CONTRIBUTOR_ROLES.has(role)) {
      sh.getRange(i + 2, 8, 1, 6).setValues([blanks]);
      perRole[role] = (perRole[role] || 0) + 1;
      clearedRows++;
    }
  }

  const result = {
    clearedRows: clearedRows,
    perRoleRowCount: perRole,
    note: 'Cleared columns H–M (availability + capacity fields) for any row whose role is a non-contributor. Priority votes preserved.',
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function migrateVotesSchemaForCapacity() {
  const sh = ss.getSheetByName('VOTES');
  if (!sh) {
    Logger.log('No VOTES sheet — nothing to migrate.');
    return { migrated: false, reason: 'no VOTES sheet' };
  }

  // Headers we want at columns J, K, L, M (10..13).
  const desired = [
    [10, 'devCapacity'],
    [11, 'pqa1Capacity'],
    [12, 'capacity'],
    [13, 'availabilityComment'],
  ];

  let headersAdded = 0;
  for (const [col, name] of desired) {
    const existing = sh.getRange(1, col).getValue();
    if (existing !== name) {
      sh.getRange(1, col).setValue(name);
      headersAdded++;
    }
  }

  // Ensure the CAPACITY_OVERRIDES sheet exists with its header row.
  let overridesCreated = false;
  let overridesSheet = ss.getSheetByName('CAPACITY_OVERRIDES');
  if (!overridesSheet) {
    overridesSheet = ss.insertSheet('CAPACITY_OVERRIDES');
    overridesSheet.appendRow(['name', 'devCapacity', 'pqa1Capacity', 'capacity', 'comment', 'setBy', 'timestamp']);
    overridesCreated = true;
  } else if (overridesSheet.getLastRow() === 0) {
    overridesSheet.appendRow(['name', 'devCapacity', 'pqa1Capacity', 'capacity', 'comment', 'setBy', 'timestamp']);
    overridesCreated = true;
  }

  // Stats for the run log: how many distinct voters have any capacity tier set?
  let totalRows = 0;
  let votersWithCapacity = 0;
  let totalVoters = 0;
  if (sh.getLastRow() > 1) {
    const numCols = Math.max(sh.getLastColumn(), 13);
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues();
    totalRows = rows.length;

    const perVoter = {};
    rows.forEach(row => {
      const name = row[1];
      if (!name) return;
      if (!perVoter[name]) perVoter[name] = { hasCapacity: false };
      const dev = row[9];
      const pqa = row[10];
      const cap = row[11];
      if ((dev !== '' && dev != null) || (pqa !== '' && pqa != null) || (cap !== '' && cap != null)) {
        perVoter[name].hasCapacity = true;
      }
    });

    totalVoters = Object.keys(perVoter).length;
    votersWithCapacity = Object.values(perVoter).filter(v => v.hasCapacity).length;
  }

  const result = {
    headersAdded: headersAdded,
    overridesSheetCreated: overridesCreated,
    columns: 'J (devCapacity), K (pqa1Capacity), L (capacity), M (availabilityComment)',
    totalRows: totalRows,
    totalVoters: totalVoters,
    votersWithCapacityData: votersWithCapacity,
    votersNeedingResubmit: totalVoters - votersWithCapacity,
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
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
