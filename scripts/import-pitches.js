#!/usr/bin/env node

/**
 * Import Pitches Script
 * 
 * This script takes the existing pitch data from the src/assets/pitches.json file
 * and converts it to a CSV format suitable for importing into the Google Sheet PITCHES tab.
 * 
 * Usage:
 * node scripts/import-pitches.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to construct it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the pitches JSON file
const pitchesJsonPath = path.join(__dirname, '..', 'src', 'assets', 'pitches.json');
const outputCsvPath = path.join(__dirname, '..', 'pitches-for-import.csv');

// Read the JSON file
console.log(`Reading pitch data from ${pitchesJsonPath}`);
const rawData = fs.readFileSync(pitchesJsonPath, 'utf8');
const pitches = JSON.parse(rawData);

// Convert to the format needed for the Google Sheet
// Include all available pitch data fields
const csvRows = [];

// Collect all possible field names from details across all pitches
const detailFields = new Set();
pitches.forEach(pitch => {
  const details = pitch.details || {};
  Object.keys(details).forEach(key => detailFields.add(key));
});

// Sort the field names for consistency
const sortedDetailFields = Array.from(detailFields).sort();

// Create the header row
const headerRow = ['pitch_id', 'title', ...sortedDetailFields];
csvRows.push(headerRow.join(','));

// Process each pitch
pitches.forEach(pitch => {
  const details = pitch.details || {};
  
  // Start with pitch_id and title
  const row = [
    pitch.id || '',
    escapeCsvField(pitch.title || '')
  ];
  
  // Add each detail field in the same order as the header
  sortedDetailFields.forEach(field => {
    const value = details[field] || '';
    row.push(escapeCsvField(value));
  });
  
  // Add the row
  csvRows.push(row.join(','));
});

// Write the CSV file
fs.writeFileSync(outputCsvPath, csvRows.join('\n'), 'utf8');

console.log(`Successfully created CSV file at: ${outputCsvPath}`);
console.log(`Total pitches processed: ${pitches.length}`);
console.log('\nInstructions:');
console.log('1. Open your Google Sheet');
console.log('2. Go to the PITCHES tab');
console.log('3. Import the CSV file using File > Import > Upload');
console.log('4. When prompted, select "Replace data at selected cell" and make sure cell A1 is selected');
console.log('5. Click Import data');

/**
 * Escape a field for CSV format
 * @param {any} field - The field to escape
 * @returns {string} - The escaped field
 */
function escapeCsvField(field) {
  // Convert to string first to handle non-string values
  const strValue = String(field);
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    // Double any quotes
    const escapedValue = strValue.replace(/"/g, '""');
    // Wrap in quotes
    return `"${escapedValue}"`;
  }
  return strValue;
}
