# Problem-Polling App Backend

This document provides an overview of the Google Sheets backend implementation for the Problem-Polling App.

## Overview

We've implemented a backend using Google Sheets and Google Apps Script as specified. This solution allows for:

- Centralized storage of pitches and votes
- Automatic aggregation of results
- API access for the frontend
- No additional hosting costs or infrastructure

## Architecture

### 1. Google Sheets Workbook

The backend uses a single Google Sheets workbook with multiple tabs:

| Tab | Purpose |
|-----|---------|
| **PITCHES** | Authoritative list of problem pitches |
| **VOTES** | All submitted ballots from voters |
| **RESULTS_VIEW** | Formula-driven aggregation of vote data |
| **VOTERS** | Optional whitelist for voters |

### 2. Google Apps Script API

A REST API provides the following endpoints:

- `GET ?route=pitches` - Get all pitches
- `GET ?route=results` - Get aggregated results
- `GET ?route=token` - Get CSRF token
- `POST ?route=vote` - Submit votes

### 3. Frontend Integration

The frontend has been updated to integrate with the backend:

- API service for communication
- Vote submission component
- Admin results dashboard
- Data type definitions

## Setup Instructions

### 1. Create and Configure Google Sheet

1. Create a new Google Sheet named `Poll-Backend.xlsx`
2. Create tabs: `PITCHES`, `VOTES`, `RESULTS_VIEW`, `VOTERS`
3. Set up headers:
   - `PITCHES`: `pitch_id, title, problem, idea, characteristics`
   - `VOTES`: `ts, voter_name, voter_email, pitch_id, appetite, tier, checksum`

4. In the `RESULTS_VIEW` tab, add the formula:
   ```
   =QUERY(VOTES!D:G,
         "select D,
                 sum(case when E='S' then 1 else 0 end) as small,
                 sum(case when E='M' then 1 else 0 end) as medium,
                 sum(case when E='L' then 1 else 0 end) as large,
                 avg(F) as mean_tier
          group by D
          label D 'pitch_id'", 1)
   ```

### 2. Deploy the Backend

1. Install Google clasp:
   ```bash
   npm install -g @google/clasp
   ```

2. Run the deployment script:
   ```bash
   npm run deploy:backend
   ```

   This script will:
   - Log you into Google Apps Script
   - Create a new Apps Script project
   - Upload the Code.gs and appsscript.json files
   - Deploy as a web app
   - Configure the secret "pepper" value
   - Create a .env file with the deployment URL

3. Alternatively, you can deploy manually:
   ```bash
   npm run clasp:login
   npm run clasp:push
   npm run clasp:deploy
   ```

### 3. Connect the Spreadsheet

1. Open the Apps Script project from your Google Drive
2. Make sure it's bound to the Google Sheet you created
   - If not: File > Project properties > Change script's container to your sheet

### 4. Configure Environment

1. Create a `.env` file (or use the one created by the deploy script):
   ```
   VITE_API_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
   VITE_ENABLE_ADMIN="false"
   ```

## Testing

Run the test suite to verify the API integration:

```bash
npm test
```

## Front-End Integration

The frontend has been updated with new components:

1. **API Service** (`src/services/api.ts`)
   - Communicates with the Google Apps Script backend

2. **Vote Submission** (`src/components/VoteSubmission.tsx`)
   - Handles vote submission to the backend

3. **Admin Results** (`src/components/AdminResults.tsx`)
   - Displays aggregated voting results

## Security Considerations

1. **CSRF Protection**
   - One-time tokens required for vote submission

2. **Vote Validation**
   - Checksums prevent duplicate votes
   - Secret "pepper" value adds security

3. **Access Control**
   - Spreadsheet access restricted to admins
   - Web app can be public or organization-only

## Next Steps

1. Import existing problem data:
   - Add your problem pitches to the PITCHES tab with UUID identifiers

2. Integrate the vote submission component:
   - Replace CSV export with the new VoteSubmission component

3. Add admin dashboard:
   - Integrate the AdminResults component for viewing results

4. Test the complete flow:
   - Ensure votes are properly recorded in the Google Sheet
   - Verify that results are correctly aggregated

## Future Enhancements

- Email notifications for new votes
- Scheduled reports via Apps Script triggers
- Enhanced analytics and visualizations
- Authentication integration
