/**
 * Fast Test Runner
 * Uses Stagehand + GPT-4o-mini for fast LLC formation testing
 *
 * Usage:
 *   npm run test:turbo                    # Default: minimal (cheapest path)
 *   npm run test:turbo -- --goal=minimal  # Decline all upsells, Starter package
 *   npm run test:turbo -- --goal=standard # Select sensible options, Pro package
 *   npm run test:turbo -- --goal=premium  # Accept all upsells, Premium package
 *   npm run test:turbo -- --goal=banking  # ZenBusiness Banking focus, Pro package + apply for bank account
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { FastAgent } from './utils/fastAgent.js';
import { generatePersona, generateBusinessDetails } from './utils/personaGenerator.js';

// Error log file for tracking failed runs
const ERROR_LOG_PATH = './zenbusiness-automation/failed-runs.json';

// Parse command line args for goal type
function getGoalType() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--goal=')) {
      return arg.split('=')[1];
    }
  }
  return 'minimal'; // Default to cheapest path
}

/**
 * Load existing failed runs log
 */
function loadFailedRuns() {
  try {
    if (fs.existsSync(ERROR_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(ERROR_LOG_PATH, 'utf8'));
    }
  } catch (e) {
    console.log('   Could not load previous failed runs');
  }
  return { runs: [], summary: {} };
}

/**
 * Save a failed run to the log
 */
function saveFailedRun(runData) {
  const log = loadFailedRuns();

  // Add this run
  log.runs.push({
    timestamp: new Date().toISOString(),
    ...runData
  });

  // Keep only last 20 failed runs
  if (log.runs.length > 20) {
    log.runs = log.runs.slice(-20);
  }

  // Update summary of common errors
  if (runData.error) {
    const errorKey = runData.error.substring(0, 50);
    log.summary[errorKey] = (log.summary[errorKey] || 0) + 1;
  }

  fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(log, null, 2));
  console.log(`\n📝 Failed run saved to ${ERROR_LOG_PATH}`);
}

/**
 * Review recent failed runs and show patterns
 */
function reviewFailedRuns() {
  const log = loadFailedRuns();

  if (log.runs.length === 0) {
    console.log('\n✅ No failed runs recorded');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 RECENT FAILED RUNS ANALYSIS');
  console.log('='.repeat(60));

  // Show last 3 failures
  console.log('\nLast 3 failures:');
  const recent = log.runs.slice(-3);
  for (const run of recent) {
    console.log(`\n  ${run.timestamp}`);
    console.log(`    Final URL: ${run.finalUrl || 'unknown'}`);
    console.log(`    Error: ${run.error || 'unknown'}`);
    console.log(`    Steps: ${run.steps || 0}`);
    if (run.screenshotFolder) {
      console.log(`    Screenshots: ${run.screenshotFolder}`);
    }
  }

  // Show error patterns
  if (Object.keys(log.summary).length > 0) {
    console.log('\n\nError patterns (most common):');
    const sorted = Object.entries(log.summary).sort((a, b) => b[1] - a[1]);
    for (const [error, count] of sorted.slice(0, 5)) {
      console.log(`    ${count}x: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('🚀 Fast LLC Formation Test\n');

  const goalType = getGoalType();

  // Generate test persona with specified goal
  const persona = generatePersona('llc', goalType);
  const businessDetails = generateBusinessDetails('llc', persona);

  console.log(`📋 Test Persona:`);
  console.log(`   Name: ${persona.fullName}`);
  console.log(`   Email: ${persona.email}`);
  console.log(`   State: ${persona.state}`);
  console.log(`   Business: ${businessDetails.businessName}`);
  console.log('');
  console.log(`🎯 Test Goal: ${persona.testGoals.name}`);
  console.log(`   ${persona.testGoals.description}`);
  console.log(`   Package: ${persona.testGoals.packagePreference.toUpperCase()}`);
  console.log(`   Upsell Strategy: ${persona.testGoals.upsellStrategy}`);
  console.log('');

  // Create FastAgent with goals
  const agent = new FastAgent(persona, businessDetails);

  try {
    // Initialize
    await agent.init();

    // Run the LLC formation flow
    const result = await agent.runLLCFormation();

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Steps: ${result.steps}`);
    if (result.error) console.log(`Error: ${result.error}`);

    // If failed, save to error log and review patterns
    // Success = reached Velo dashboard (or confirmation if Velo not reached)
    const isSuccess = result.success && !result.error &&
      (result.finalUrl?.includes('velo') || result.finalUrl?.includes('/app/') || result.finalUrl?.includes('dashboard'));
    if (!isSuccess) {
      saveFailedRun({
        persona: persona.fullName,
        state: persona.state,
        business: businessDetails.businessName,
        finalUrl: result.finalUrl,
        error: result.error || 'Did not reach confirmation page',
        steps: result.steps,
        screenshotFolder: agent.testRunFolder ? `${agent.testRunFolder}/screenshots` : null
      });

      // Review past failures to identify patterns
      reviewFailedRuns();
    } else {
      console.log('\n✅ Test completed successfully!');
    }

  } catch (error) {
    console.error('Fatal error:', error);

    // Save fatal errors too
    saveFailedRun({
      persona: persona.fullName,
      state: persona.state,
      business: businessDetails.businessName,
      error: `FATAL: ${error.message}`,
      steps: 0
    });
  } finally {
    await agent.close();
  }
}

main().catch(console.error);
