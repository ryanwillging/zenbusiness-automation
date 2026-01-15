/**
 * Fast Test Runner
 * Uses Stagehand + AgentQL + Haiku for fast LLC formation testing
 */

import 'dotenv/config';
import { FastAgent } from './utils/fastAgent.js';
import { generatePersona, generateBusinessDetails } from './utils/personaGenerator.js';

async function main() {
  console.log('🚀 Fast LLC Formation Test\n');

  // Generate test persona
  const persona = generatePersona();
  const businessDetails = generateBusinessDetails('llc', persona);

  console.log(`📋 Test Persona:`);
  console.log(`   Name: ${persona.fullName}`);
  console.log(`   Email: ${persona.email}`);
  console.log(`   State: ${persona.state}`);
  console.log(`   Business: ${businessDetails.businessName}\n`);

  // Create FastAgent
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
