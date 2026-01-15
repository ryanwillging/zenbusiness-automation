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
import { FastAgent } from './utils/fastAgent.js';
import { generatePersona, generateBusinessDetails } from './utils/personaGenerator.js';

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

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await agent.close();
  }
}

main().catch(console.error);
