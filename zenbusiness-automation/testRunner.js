/**
 * Multi-Flow Test Orchestrator
 * Executes all test scenarios and generates comprehensive reports
 */

import { generatePersona } from './utils/personaGenerator.js';
import { generateSummaryReport } from './utils/reportGenerator.js';
import { LLCScenario } from './scenarios/llcScenario.js';
import { DBAScenario } from './scenarios/dbaScenario.js';
import { CorporationScenario } from './scenarios/corporationScenario.js';
import { NonprofitScenario } from './scenarios/nonprofitScenario.js';
import { CustomScenario } from './scenarios/customScenario.js';
import { AILLCScenario } from './scenarios/aiLLCScenario.js';
import fs from 'fs';
import path from 'path';

/**
 * Main Test Orchestrator
 */
export class TestOrchestrator {
  constructor(options = {}) {
    this.options = {
      runLLC: true,
      runDBA: true,
      runCorporation: true,
      runNonprofit: true,
      runCustom: true,
      customScenarioCount: 1,
      delayBetweenScenarios: 5000, // 5 seconds between scenarios
      ...options
    };
    this.results = [];
  }

  /**
   * Run all configured test scenarios
   */
  async runAll() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 ZenBusiness Multi-Flow Testing Automation');
    console.log('='.repeat(80));
    console.log(`\nStarting test execution at ${new Date().toLocaleString()}\n`);

    const startTime = Date.now();

    // Scenario 1: LLC Formation
    if (this.options.runLLC) {
      await this.runScenario('llc', LLCScenario);
      await this.delay();
    }

    // Scenario 2: DBA Registration
    if (this.options.runDBA) {
      await this.runScenario('dba', DBAScenario);
      await this.delay();
    }

    // Scenario 3: Corporation
    if (this.options.runCorporation) {
      await this.runScenario('corporation', CorporationScenario);
      await this.delay();
    }

    // Scenario 4: Nonprofit
    if (this.options.runNonprofit) {
      await this.runScenario('nonprofit', NonprofitScenario);
      await this.delay();
    }

    // Scenario 5+: Custom Test Cases
    if (this.options.runCustom) {
      for (let i = 0; i < this.options.customScenarioCount; i++) {
        await this.runScenario('llc', CustomScenario, `Custom-${i + 1}`);
        if (i < this.options.customScenarioCount - 1) {
          await this.delay();
        }
      }
    }

    // AI-Powered Scenarios
    if (this.options.runAILLC) {
      await this.runScenario('llc', AILLCScenario);
      await this.delay();
    }

    const endTime = Date.now();
    const totalDuration = Math.round((endTime - startTime) / 1000);

    // Generate summary report
    await this.generateFinalReport(totalDuration);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Test Scenarios Completed');
    console.log('='.repeat(80));
    console.log(`\nTotal execution time: ${totalDuration} seconds`);
    console.log(`Total scenarios run: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.result).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.result).length}\n`);

    return this.results;
  }

  /**
   * Run a single scenario
   */
  async runScenario(personaType, ScenarioClass, customName = null) {
    console.log('\n' + '-'.repeat(80));
    console.log(`Starting: ${customName || ScenarioClass.name}`);
    console.log('-'.repeat(80));

    try {
      // Generate unique persona for this scenario
      const persona = generatePersona(personaType);

      // Create and run scenario
      const scenario = new ScenarioClass(persona);
      const result = await scenario.run();

      this.results.push(result);

      console.log(`\n✅ Completed: ${result.scenario}`);
      console.log(`   Result: ${result.result ? 'PASS' : 'FAIL'}`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Velo Reached: ${result.veloReached ? 'Yes' : 'No'}`);
      console.log(`   Issues: ${result.criticalIssues} critical, ${result.majorIssues} major`);

    } catch (error) {
      console.error(`\n❌ Scenario failed catastrophically: ${error.message}`);

      this.results.push({
        scenario: customName || ScenarioClass.name,
        result: false,
        veloReached: false,
        duration: 0,
        criticalIssues: 1,
        majorIssues: 0,
        reportPath: null
      });
    }
  }

  /**
   * Delay between scenarios
   */
  async delay() {
    if (this.options.delayBetweenScenarios > 0) {
      console.log(`\n⏳ Waiting ${this.options.delayBetweenScenarios / 1000}s before next scenario...`);
      await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenScenarios));
    }
  }

  /**
   * Generate final summary report
   */
  async generateFinalReport(totalDuration) {
    console.log('\n📊 Generating summary report...');

    const summaryReport = generateSummaryReport(this.results);

    // Add execution metadata
    const fullReport = summaryReport + `\n## Execution Details\n\n` +
      `- **Total Duration:** ${totalDuration} seconds\n` +
      `- **Start Time:** ${new Date(Date.now() - totalDuration * 1000).toISOString()}\n` +
      `- **End Time:** ${new Date().toISOString()}\n` +
      `- **Scenarios Configured:** ${this.countConfiguredScenarios()}\n` +
      `- **Scenarios Executed:** ${this.results.length}\n\n` +
      `---\n\n` +
      `## Individual Reports\n\n`;

    const reportsList = this.results
      .filter(r => r.reportPath)
      .map(r => `- [${r.scenario}](${path.basename(r.reportPath)})`)
      .join('\n');

    const finalReport = fullReport + reportsList + '\n';

    // Save summary report
    const reportsDir = './zenbusiness-automation/reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const summaryPath = path.join(reportsDir, `SUMMARY_${Date.now()}.md`);
    fs.writeFileSync(summaryPath, finalReport, 'utf-8');

    console.log(`✅ Summary report saved: ${summaryPath}`);

    return summaryPath;
  }

  /**
   * Count how many scenarios are configured to run
   */
  countConfiguredScenarios() {
    let count = 0;
    if (this.options.runLLC) count++;
    if (this.options.runDBA) count++;
    if (this.options.runCorporation) count++;
    if (this.options.runNonprofit) count++;
    if (this.options.runCustom) count += this.options.customScenarioCount;
    return count;
  }
}

/**
 * CLI execution
 */
// More robust check for direct execution
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('testRunner.js');

if (isDirectExecution) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    runLLC: !args.includes('--skip-llc'),
    runDBA: !args.includes('--skip-dba'),
    runCorporation: !args.includes('--skip-corporation'),
    runNonprofit: !args.includes('--skip-nonprofit'),
    runCustom: !args.includes('--skip-custom'),
    customScenarioCount: 1,
    delayBetweenScenarios: 5000
  };

  // Check for specific scenario flags
  if (args.includes('--only-llc')) {
    options.runLLC = true;
    options.runDBA = false;
    options.runCorporation = false;
    options.runNonprofit = false;
    options.runCustom = false;
  }

  if (args.includes('--only-dba')) {
    options.runLLC = false;
    options.runDBA = true;
    options.runCorporation = false;
    options.runNonprofit = false;
    options.runCustom = false;
  }

  if (args.includes('--only-corporation')) {
    options.runLLC = false;
    options.runDBA = false;
    options.runCorporation = true;
    options.runNonprofit = false;
    options.runCustom = false;
  }

  if (args.includes('--only-nonprofit')) {
    options.runLLC = false;
    options.runDBA = false;
    options.runCorporation = false;
    options.runNonprofit = true;
    options.runCustom = false;
  }

  // AI-powered scenarios
  if (args.includes('--ai-llc')) {
    options.runLLC = false;
    options.runDBA = false;
    options.runCorporation = false;
    options.runNonprofit = false;
    options.runCustom = false;
    options.runAILLC = true;
  }

  // Custom scenario count
  const customCountIndex = args.indexOf('--custom-count');
  if (customCountIndex !== -1 && args[customCountIndex + 1]) {
    options.customScenarioCount = parseInt(args[customCountIndex + 1], 10);
  }

  // Delay between scenarios
  const delayIndex = args.indexOf('--delay');
  if (delayIndex !== -1 && args[delayIndex + 1]) {
    options.delayBetweenScenarios = parseInt(args[delayIndex + 1], 10);
  }

  console.log('\n🔧 Configuration:');
  console.log(JSON.stringify(options, null, 2));

  const orchestrator = new TestOrchestrator(options);

  orchestrator.runAll()
    .then((results) => {
      const passed = results.filter(r => r.result).length;
      const failed = results.filter(r => !r.result).length;

      console.log('\n📈 Final Results:');
      console.log(`   Total: ${results.length}`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);

      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
