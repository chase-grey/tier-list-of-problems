# Ops Setup Guide

## 1. Google Apps Script (GAS) Setup

### Opening the editor

1. Open the backing Google Sheet.
2. **Extensions → Apps Script** — this opens the bound script editor.
3. Paste or sync `Code.gs` into the editor (the file must be named `Code.gs`).

### Script Properties

Set these under **Project Settings → Script Properties** (gear icon in the left sidebar).

#### `pepper`

A secret string used to compute the per-voter per-pitch checksum stored in column G of VOTES. Used for deduplication. Any non-empty string works; just don't change it after votes are recorded.

```
pepper = some-random-secret-string
```

#### `allocation_config`

Full JSON object. Paste the serialized value (no line breaks) into the property value field.

```json
{
  "cycleId": "Aug26",
  "devTLNames": ["Alice Smith", "Bob Jones"],
  "qmNames": ["Carol White"],
  "categories": [
    "Support AI Charting",
    "Create and Improve Tools and Framework",
    "Mobile Feature Parity",
    "Address Technical Debt"
  ],
  "bandwidth": {
    "Support AI Charting": 50,
    "Create and Improve Tools and Framework": 30,
    "Mobile Feature Parity": 10,
    "Address Technical Debt": 10
  },
  "devs": [
    { "name": "Alice Smith", "role": "dev TL", "fte": 1.0 },
    { "name": "Bob Jones",   "role": "dev TL", "fte": 1.0 },
    { "name": "Carol White", "role": "QM",     "fte": 1.0 },
    { "name": "Dave Brown",  "role": "dev",    "fte": 1.0 }
  ]
}
```

**Field notes:**

| Field | Purpose |
|---|---|
| `cycleId` | Must match `VITE_POLLING_CYCLE_ID` in the frontend `.env`. |
| `devTLNames` | Names exactly as voters enter them. Used by `getAllocationData()` to split votes into `tlVotes` vs `teamVotes`. Any voter whose name is in this list goes into `tlVotes`; all others (including that same person) also appear in `teamVotes`. |
| `qmNames` | Used by the frontend to enable the Phase 2 interest-vote flow for QMs. |
| `bandwidth` | Target allocation percentages per category. **Must be kept in sync with `CATEGORY_BANDWIDTH_CONFIG` in `src/components/App.tsx`** — see section 5. |
| `devs` | Full roster shown in the TL allocation UI. `fte` is fractional (0.5 = half-time). |

### Required sheets

Create these sheets in the backing spreadsheet before first use.

| Sheet | Required columns (row 1 headers) | Notes |
|---|---|---|
| `PITCHES` | `pitch_id`, `title`, `problem`, `idea`, `characteristics` | Add a row per pitch. Extra columns are ignored. |
| `VOTES` | `timestamp`, `voterName`, `email`, `pitch_id`, `appetite`, `tier`, `checksum`, `interestLevel` | Append-only; do not sort or edit rows manually. |
| `RESULTS_VIEW` | `pitch_id`, `small`, `medium`, `large`, `mean_tier` | Populate via formula or manually; read by `getResults()`. |
| `INTEREST_VOTES` | auto-created | Created automatically on first Phase 2 interest-vote POST. Do not create it manually. |

### Deploying as a Web App

1. Click **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me** (the sheet owner).
4. Who has access: **Anyone** (required for CORS; the `pepper` checksum is the tamper-resistance mechanism, not auth).
5. Click **Deploy** and copy the `/exec` URL.
6. Paste that URL into `VITE_API_URL` in `.env`.

After any code change you must **Deploy → Manage deployments → New version** — editing and saving in the editor alone does not update the live endpoint.

---

## 2. Frontend Environment Variables

All variables live in `.env` (gitignored). Copy `.env.example` to `.env` and fill in values.

| Variable | What it does | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the GAS Web App `/exec` endpoint. All API calls go here. | `https://script.google.com/macros/s/AKfycb.../exec` |
| `VITE_ENABLE_ADMIN` | Set to `"true"` to show the admin dashboard tab. Leave `"false"` in production. | `"false"` |
| `VITE_POLLING_CYCLE_ID` | Short identifier for the current polling cycle. Stored with each vote row for grouping. | `"Aug26"` |
| `VITE_POLLING_STAGE` | Controls which UI the app renders. See section 3. | `"1"` |
| `VITE_PITCH_PRJ_ID` | Track PRJ ID for the quarter's pitch grouper project. Used by API calls that reference Chronicle records. | `"347624"` |
| `VITE_BASE_URL` | Vite `base` path. Use `"/"` for local dev; leave unset for production GitHub Pages (`/tier-list-of-problems/` is the fallback). | `"/"` |

---

## 3. Polling Stage Progression

Set `VITE_POLLING_STAGE` in `.env`, then rebuild and redeploy the frontend.

| Value | Stage name | Who sees what |
|---|---|---|
| `"1"` (default) | Priority ranking | All voters rank every pitch 1–8. No role restriction. |
| `"2"` | Interest ranking | Only dev TLs and QMs see the interest-vote UI (1–4 scale on pitches that passed Stage 1). Other roles see a "stay tuned" message. Pitches shown are filtered to those with `stage2: true` in the PITCHES sheet. |
| `"tl-1"` | TL Allocation round 1 | Dev TLs see the allocation board (dev-to-project matching, step 0). Non-TLs see a wait message. |
| `"tl-2"` | TL Allocation round 2 | Dev TLs see the allocation board (TL/QM assignment, step 1). Non-TLs see a wait message. |

In local dev you can override the stage without rebuilding by setting `localStorage.setItem('polling.debugStage', 'tl-1')` in the browser console. Same key exists for `polling.debugCycleId`.

---

## 4. New Cycle Reset Checklist

Run through this at the start of each quarterly cycle (Feb, May, Aug, Nov).

- [ ] **Increment `VITE_POLLING_CYCLE_ID`** in `.env` (e.g., `Aug26` → `Nov26`).
- [ ] **Archive the VOTES sheet** — rename it to `VOTES_Aug26` (or copy to a separate archive spreadsheet). Create a fresh empty `VOTES` sheet with the correct headers.
- [ ] **Archive INTEREST_VOTES** — rename it to `INTEREST_VOTES_Aug26`. The script will auto-create a new `INTEREST_VOTES` on the first Phase 2 submission.
- [ ] **Update PITCHES** — replace or extend with the new cycle's pitches. Existing `pitch_id` values must not be reused.
- [ ] **Update RESULTS_VIEW** — clear old results; repopulate formulas/data for the new cycle.
- [ ] **Update `allocation_config`** Script Property — bump `cycleId`, update `devs` roster and `bandwidth` targets as needed.
- [ ] **Update `CATEGORY_BANDWIDTH_CONFIG`** in `src/components/App.tsx` — keep in sync with the `bandwidth` field above (see section 5).
- [ ] **Set `VITE_POLLING_STAGE="1"`** in `.env`.
- [ ] **Rebuild** (`npm run build`) and redeploy the frontend.
- [ ] **Deploy a new GAS version** if `Code.gs` changed.
- [ ] Smoke-test: submit a test vote, verify it appears in the new VOTES sheet, verify the cycle ID on the row matches.

---

## 5. Keeping Bandwidth Targets in Sync

The target allocation percentages are stored in **two places** that must match:

**`src/components/App.tsx` — `CATEGORY_BANDWIDTH_CONFIG`** (frontend display):

```ts
const CATEGORY_BANDWIDTH_CONFIG: CategoryBandwidthConfig = {
  bandwidth: {
    'Support AI Charting': 50,
    'Create and Improve Tools and Framework': 30,
    'Mobile Feature Parity': 10,
    'Address Technical Debt': 10,
  },
  // ...
};
```

**GAS Script Property — `allocation_config.bandwidth`** (backend / TL allocation UI):

```json
"bandwidth": {
  "Support AI Charting": 50,
  "Create and Improve Tools and Framework": 30,
  "Mobile Feature Parity": 10,
  "Address Technical Debt": 10
}
```

When you change targets for a new cycle, update both. The frontend bar chart pulls from the hardcoded `CATEGORY_BANDWIDTH_CONFIG`; the TL allocation logic pulls from the Script Property. Ideally these would be fetched from the backend `getConfig()` endpoint so there is a single source of truth — that is a known gap and a future improvement.
