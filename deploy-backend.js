#!/usr/bin/env node

/**
 * Script to deploy the Google Apps Script backend
 * This helps automate the process of pushing changes to Google Apps Script
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// ES modules don't have __dirname, so we need to construct it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if clasp is installed
function checkClasp() {
  try {
    execSync('clasp --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    console.error('ERROR: Google clasp is not installed. Please install it using "npm install -g @google/clasp"');
    return false;
  }
}

// Check if user is logged in to clasp
function checkLogin() {
  try {
    execSync('clasp login --status', { stdio: 'ignore' });
    return true;
  } catch (e) {
    console.log('You need to login to Google Apps Script first.');
    try {
      execSync('clasp login', { stdio: 'inherit' });
      return true;
    } catch (loginError) {
      console.error('Failed to login:', loginError.message);
      return false;
    }
  }
}

// Create or update the script project
function createOrUpdateProject() {
  const claspConfig = path.join(__dirname, '.clasp.json');
  let scriptId = '';
  
  // Check if .clasp.json exists
  if (fs.existsSync(claspConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(claspConfig, 'utf8'));
      scriptId = config.scriptId;
      console.log(`Found existing script project with ID: ${scriptId}`);
    } catch (e) {
      console.error('Error reading .clasp.json:', e.message);
    }
  }
  
  if (!scriptId) {
    console.log('No script ID found. Creating a new Apps Script project...');
    try {
      execSync('clasp create --title "Problem-Polling Backend" --type webapp --rootDir .', { stdio: 'inherit' });
      console.log('Created new Apps Script project.');
      
      // Read the newly created script ID
      if (fs.existsSync(claspConfig)) {
        const config = JSON.parse(fs.readFileSync(claspConfig, 'utf8'));
        scriptId = config.scriptId;
      }
    } catch (e) {
      console.error('Failed to create new project:', e.message);
      return false;
    }
  }
  
  return !!scriptId;
}

// Push code to Apps Script
function pushCode() {
  try {
    console.log('Pushing code to Google Apps Script...');
    execSync('clasp push', { stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error('Failed to push code:', e.message);
    return false;
  }
}

// Deploy as web app
function deployWebApp() {
  try {
    console.log('Deploying as web app...');
    const result = execSync('clasp deploy --description "Problem-Polling Backend v1"', { encoding: 'utf8' });
    
    // Extract deployment URL from the output
    const urlMatch = result.match(/https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/);
    if (urlMatch) {
      const deployUrl = urlMatch[0];
      console.log(`\nDeployment successful!\nWeb app URL: ${deployUrl}\n`);
      
      // Create or update .env file with the deployment URL
      try {
        const envContent = `VITE_API_URL="${deployUrl}"\nVITE_ENABLE_ADMIN="false"\n`;
        fs.writeFileSync(path.join(__dirname, '.env'), envContent);
        console.log('Created .env file with the deployment URL');
      } catch (envError) {
        console.error('Could not update .env file:', envError.message);
      }
      
      return true;
    } else {
      console.log('Deployment completed, but could not extract the URL.');
      console.log('Please check your Google Apps Script dashboard for the deployment URL.');
      return true;
    }
  } catch (e) {
    console.error('Failed to deploy:', e.message);
    return false;
  }
}

// Configure script properties (secret pepper)
function configureScriptProperties() {
  console.log('\nWould you like to set the secret "pepper" for vote checksums? (y/n)');
  
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      // Generate a random pepper value
      const pepper = crypto.randomBytes(32).toString('hex');
      
      console.log('\nSetting script property "pepper"...');
      try {
        const command = `clasp run "PropertiesService.getScriptProperties().setProperty('pepper', '${pepper}')"`;
        execSync(command, { stdio: 'inherit' });
        console.log('Successfully set the pepper value.');
      } catch (e) {
        console.error('Failed to set script property:', e.message);
        console.log('\nManual instructions:');
        console.log('1. Open your Apps Script project in the browser');
        console.log('2. Go to Project Settings > Script Properties');
        console.log('3. Add a property with name "pepper" and the following value:');
        console.log(`   ${pepper}`);
      }
    }
    
    console.log('\nDeployment process completed!');
    console.log('\nNext steps:');
    console.log('1. Set up your Google Sheet with the required tabs (PITCHES, VOTES, RESULTS_VIEW, VOTERS)');
    console.log('2. Connect your spreadsheet to the Apps Script project');
    console.log('3. Update your frontend to use the new backend API');
    console.log('\nSee BACKEND-README.md for detailed instructions.');
    
    rl.close();
  });
}

// Main deployment flow
async function main() {
  console.log('=== Problem-Polling Backend Deployment ===\n');
  
  if (!checkClasp()) {
    process.exit(1);
  }
  
  if (!checkLogin()) {
    process.exit(1);
  }
  
  if (!createOrUpdateProject()) {
    process.exit(1);
  }
  
  if (!pushCode()) {
    process.exit(1);
  }
  
  if (!deployWebApp()) {
    process.exit(1);
  }
  
  configureScriptProperties();
}

main();
