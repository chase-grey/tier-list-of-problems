# Problem-Polling App Backend

## Overview

This is the backend implementation for the Problem-Polling app using Google Sheets and Google Apps Script (GAS). The backend provides a REST API that enables direct interaction with a Google Sheets workbook for storing pitches, votes, and aggregating results.

## Technology Stack

- **Google Sheets**: Data storage and result aggregation
- **Google Apps Script**: Server-side API implementation
- **CORS-enabled REST API**: JSON endpoints for front-end communication

## Setup Instructions

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new workbook named `Poll-Backend.xlsx`
2. Create the following tabs (worksheets):
   - `PITCHES` - For storing the problem pitches
   - `VOTES` - For recording user votes
   - `RESULTS_VIEW` - For formula-driven aggregation
   - `VOTERS` - (Optional) For voter whitelisting

3. Set up the column headers in each sheet:

   **PITCHES**:
   ```
   A: pitch_id | B: title | C: problem | D: idea | E: characteristics
   ```

   **VOTES**:
   ```
   A: ts | B: voter_name | C: voter_email | D: pitch_id | E: appetite | F: tier | G: checksum
   ```

   **RESULTS_VIEW**:
   (This sheet will be formula-driven)

### 2. Set Up the RESULTS_VIEW Formulas

In cell A1 of the RESULTS_VIEW tab, enter the following formula:

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

### 3. Deploy the Google Apps Script

1. Open the Google Sheet you created
2. Click on Extensions > Apps Script
3. In the Apps Script editor, create the following files:
   - `Code.gs` (Copy the contents from the Code.gs file in this repository)
   - Click on the + button next to Files and create a new script file called `appsscript.json`
   - Copy the contents from the appsscript.json file in this repository

4. Add a secret "pepper" value:
   - In the Apps Script editor, click on Project Settings (gear icon)
   - Go to Script Properties
   - Click "Add script property"
   - Name: `pepper`
   - Value: [generate a random 32-byte hex string, e.g., using `openssl rand -hex 32`]

5. Deploy the web app:
   - Click on Deploy > New deployment
   - Select type: Web app
   - Description: "Problem-Polling Backend v1"
   - Execute as: Me
   - Who has access: Anyone (for public voting) or Anyone within [your organization] (for authenticated voting)
   - Click Deploy
   - Copy the web app URL that is generated (you'll need this for the front end)

### 4. Connect the Front End

Update your React front-end to use the new backend:

1. Create a `.env` file in your project root with:
   ```
   VITE_API_URL="https://script.google.com/macros/s/[YOUR_DEPLOYMENT_ID]/exec"
   ```
   (Replace [YOUR_DEPLOYMENT_ID] with your actual deployment ID)

2. Update your API service to use the new endpoints:
   - GET `?route=pitches` to fetch the problem list
   - GET `?route=token` to retrieve a CSRF token before voting
   - POST `?route=vote` to submit votes
   - GET `?route=results` for admin dashboards

## Security Considerations

1. **Access Control**:
   - The spreadsheet itself should only be accessible to admins and the script owner
   - The Web App can be configured for public access or organization-only access

2. **CSRF Protection**:
   - The API implements CSRF tokens to prevent replay attacks
   - Tokens are valid for 10 minutes and are one-time use

3. **Duplicate Prevention**:
   - The API computes SHA-256 checksums for each vote to prevent duplicates
   - The script property "pepper" adds entropy to checksums

## API Documentation

### Endpoints

| Endpoint | Method | Description | Request Format | Response Format |
|----------|--------|-------------|----------------|-----------------|
| `?route=pitches` | GET | Returns list of all pitches | N/A | `[{pitch_id, title, problem, idea, characteristics}, ...]` |
| `?route=token` | GET | Gets CSRF token for voting | N/A | `{nonce: "uuid-value"}` |
| `?route=vote` | POST | Records votes | `{nonce, voterName, votes: [{pitch_id, appetite, tier}, ...]}` | `{saved: number}` |
| `?route=results` | GET | Gets aggregated results | N/A | `[{pitch_id, small, medium, large, mean_tier}, ...]` |

### Error Responses

All errors follow this format:
```json
{
  "error": "ERROR_CODE",
  "detail": "Human-readable error message"
}
```

Common error codes:
- `BAD_REQUEST`: Invalid input format
- `FORBIDDEN`: Invalid CSRF token
- `NOT_FOUND`: Invalid endpoint
- `SERVER_ERROR`: Internal server error

## Local Development

For local development with the Google Apps Script code:

1. Install the Google Clasp CLI:
   ```bash
   npm install -g @google/clasp
   ```

2. Login to your Google account:
   ```bash
   clasp login
   ```

3. Create a new Apps Script project or clone this one:
   ```bash
   clasp clone [scriptId]
   ```

4. Push changes to Google Apps Script:
   ```bash
   clasp push
   ```

5. Create a new deployment:
   ```bash
   clasp deploy --description "v1 backend"
   ```

## Performance Considerations

- The Google Apps Script quota is 90 requests/minute per IP address, which is sufficient for the expected usage.
- The script makes efficient use of Sheets by batch-processing vote submissions.
- Consider implementing rate limiting for high-traffic scenarios.

## Troubleshooting

1. **CORS Issues**:
   - Verify the `Access-Control-Allow-Origin` header is properly set
   - For testing, you can set it to `*`, but for production, specify your exact domain

2. **Authentication Problems**:
   - Check the deployment settings to ensure the script is executing as the correct user
   - Verify access settings match your intended audience (public vs. organization)

3. **Duplicate Votes**:
   - The checksum mechanism prevents duplicate submissions
   - If a user tries to submit the same votes twice, only the first submission will be recorded

## Future Extensions

- Add webhooks to notify admins of new submissions
- Implement a daily email report of results
- Add advanced analytics and visualization in the RESULTS_VIEW tab
- Implement soft deletes for invalid pitches
