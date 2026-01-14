/**
 * Simple test to verify the framework is working
 */

console.log('🔍 Testing ZenBusiness Automation Framework...\n');

try {
  console.log('1. Testing imports...');

  const { generatePersona } = await import('./utils/personaGenerator.js');
  console.log('   ✅ personaGenerator imported');

  const { TestLogger } = await import('./utils/reportGenerator.js');
  console.log('   ✅ reportGenerator imported');

  const { BaseScenario } = await import('./utils/baseScenario.js');
  console.log('   ✅ baseScenario imported');

  const { LLCScenario } = await import('./scenarios/llcScenario.js');
  console.log('   ✅ llcScenario imported');

  console.log('\n2. Testing persona generation...');
  const persona = generatePersona('llc');
  console.log(`   ✅ Generated persona: ${persona.fullName}`);
  console.log(`   📧 Email: ${persona.email}`);
  console.log(`   🏢 Business: ${persona.businessIdea}`);
  console.log(`   📍 State: ${persona.state}`);

  console.log('\n3. Testing scenario creation...');
  const scenario = new LLCScenario(persona);
  console.log(`   ✅ Created scenario: ${scenario.scenarioName}`);

  console.log('\n✅ All basic tests passed!');
  console.log('\n📝 Next step: Run the full test with:');
  console.log('   npm run test:zenbusiness:llc');
  console.log('\nNote: The full test will open a browser and take several minutes.\n');

} catch (error) {
  console.error('\n❌ Error occurred:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
