/**
 * AI-Powered LLC Formation Scenario
 * Uses Claude's vision API to autonomously navigate the flow
 */

import { BaseScenario } from '../utils/baseScenario.js';
import { generateBusinessDetails } from '../utils/personaGenerator.js';
import { VisionAgent } from '../utils/visionAgent.js';
import { TestAnalyzer } from '../utils/testAnalyzer.js';
import fs from 'fs';
import path from 'path';

export class AILLCScenario extends BaseScenario {
  constructor(persona) {
    super(persona, 'AI-Powered LLC Formation');
    this.businessDetails = generateBusinessDetails('llc', persona);
    this.testRunId = `ai_llc_${Date.now()}`;
    this.testRunDir = null;
  }

  /**
   * Create test-specific directory for screenshots and reports
   */
  createTestRunDirectory() {
    const baseDir = './zenbusiness-automation/test-runs';
    this.testRunDir = path.join(baseDir, this.testRunId);

    // Create directories
    fs.mkdirSync(path.join(this.testRunDir, 'screenshots'), { recursive: true });

    console.log(`📁 Test run directory: ${this.testRunDir}`);
    return this.testRunDir;
  }

  /**
   * Generate enhanced report with screenshots and step details
   */
  generateEnhancedReport(result, agentDetails) {
    const reportPath = path.join(this.testRunDir, 'report.md');

    let report = `# AI-Powered LLC Formation Test Report\n\n`;
    report += `**Test Run ID:** ${this.testRunId}\n`;
    report += `**Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Duration:** ${Math.round(result.duration / 1000)} seconds\n`;
    report += `**Result:** ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    report += `**Total Steps:** ${result.steps}\n`;
    report += `**Final URL:** ${result.finalUrl}\n\n`;

    report += `---\n\n`;

    // Persona details
    report += `## Test Persona\n\n`;
    report += `- **Name:** ${this.persona.fullName}\n`;
    report += `- **Email:** ${this.persona.email}\n`;
    report += `- **Business:** ${this.businessDetails.businessName}\n`;
    report += `- **State:** ${this.persona.state}\n`;
    report += `- **Industry:** ${this.persona.industry}\n\n`;

    report += `---\n\n`;

    // Step-by-step log with screenshots
    report += `## Step-by-Step Execution\n\n`;

    if (agentDetails.stepLog) {
      agentDetails.stepLog.forEach((step, index) => {
        report += `### Step ${step.step}: ${step.description || step.action}\n\n`;
        report += `- **URL:** \`${step.url}\`\n`;
        report += `- **Page:** ${step.pageTitle}\n`;
        report += `- **Action:** ${step.action}\n`;

        if (step.selector) {
          report += `- **Selector:** \`${step.selector}\`\n`;
        }
        if (step.value) {
          report += `- **Value:** ${step.value}\n`;
        }
        if (step.reasoning) {
          report += `- **AI Reasoning:** ${step.reasoning}\n`;
        }

        report += `- **Used Cache:** ${step.usedCache ? 'Yes' : 'No'}\n`;
        report += `- **Duration:** ${step.duration}ms\n`;
        report += `- **Result:** ${step.success ? '✅ Success' : `❌ Failed: ${step.error}`}\n`;

        if (step.screenshot) {
          report += `- **Screenshot:** [${step.screenshot}](screenshots/${step.screenshot})\n`;
        }

        report += `\n`;
      });
    }

    report += `---\n\n`;

    // Screenshots summary
    report += `## Screenshots Captured\n\n`;
    report += `Total: ${agentDetails.screenshots?.length || 0} screenshots\n\n`;

    if (agentDetails.screenshots) {
      report += `| Step | Filename | Timestamp |\n`;
      report += `|------|----------|----------|\n`;
      agentDetails.screenshots.forEach(ss => {
        report += `| ${ss.step} | ${ss.filename} | ${ss.timestamp} |\n`;
      });
    }

    report += `\n---\n\n`;

    // Issues and failures
    report += `## Issues Encountered\n\n`;

    const failedSteps = agentDetails.stepLog?.filter(s => !s.success) || [];
    if (failedSteps.length > 0) {
      failedSteps.forEach(step => {
        report += `- **Step ${step.step}:** ${step.error}\n`;
        report += `  - URL: ${step.url}\n`;
        report += `  - Screenshot: ${step.screenshot}\n\n`;
      });
    } else {
      report += `No issues encountered during this test run.\n\n`;
    }

    report += `---\n\n`;

    // Raw data for analysis
    report += `## Raw Data\n\n`;
    report += `<details>\n<summary>Click to expand raw step data</summary>\n\n`;
    report += `\`\`\`json\n${JSON.stringify(agentDetails.stepLog, null, 2)}\n\`\`\`\n\n`;
    report += `</details>\n\n`;

    // Write report
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Enhanced report saved: ${reportPath}`);

    return reportPath;
  }

  async execute() {
    console.log(`\n📋 Executing AI-Powered LLC Formation flow...`);
    console.log(`Business: ${this.businessDetails.businessName}`);
    console.log(`Using Claude Vision API for autonomous navigation\n`);

    // Create test run directory
    this.createTestRunDirectory();

    // Create vision agent with screenshots directory
    const agent = new VisionAgent(this.page, this.persona, this.businessDetails, {
      screenshotsDir: path.join(this.testRunDir, 'screenshots')
    });

    // Define the objective
    const objective = `
Complete the full LLC formation onboarding flow on ZenBusiness:
1. Start the LLC formation process
2. Create an account with the provided credentials
3. Fill in all business information (name, state, address, etc.)
4. Make decisions on product add-ons (accept EIN, Compliance; decline Website Builder)
5. Complete payment with test card information
6. Reach the Velo chat or dashboard
`;

    let result;
    try {
      // Run the autonomous flow
      result = await agent.runAutonomousFlow(objective, 50);

      // Get detailed results
      const agentDetails = agent.getDetailedResults();

      // Generate enhanced report
      const reportPath = this.generateEnhancedReport(result, agentDetails);

      // Log the result
      this.logger.logStep({
        pageTitle: 'AI-Powered Flow Complete',
        url: result.finalUrl,
        actions: [`Completed autonomous flow in ${result.steps} steps`],
        uxEvaluation: result.success ? 'Successfully navigated entire flow' : 'Did not complete flow',
        result: result.success ? 'pass' : 'fail',
        notes: result.reason || 'Flow completed successfully'
      });

      // Run automatic analysis to learn from this test
      console.log(`\n🧠 Analyzing test results for learning...`);
      try {
        const analyzer = new TestAnalyzer();
        const analysis = await analyzer.analyzeAndLearn(reportPath, this.testRunDir);

        if (analysis) {
          console.log(`\n📚 Learning Summary:`);
          console.log(`   Patterns identified: ${analysis.patternsIdentified || 0}`);
          console.log(`   Recommendations: ${analysis.recommendations?.length || 0}`);

          if (analysis.updatedInstructions) {
            console.log(`   ✅ CLAUDE.md updated with new learnings`);
          }
        }
      } catch (analyzeError) {
        console.log(`   ⚠️  Analysis skipped: ${analyzeError.message}`);
      }

      return {
        veloReached: result.success,
        steps: result.steps,
        finalUrl: result.finalUrl,
        testRunDir: this.testRunDir
      };

    } catch (error) {
      console.error(`\n❌ AI-powered flow failed:`, error.message);

      // Still try to generate report with what we have
      const agentDetails = agent.getDetailedResults();
      if (agentDetails.stepLog.length > 0) {
        this.generateEnhancedReport(
          { success: false, steps: agentDetails.stepLog.length, finalUrl: this.page.url(), duration: 0 },
          agentDetails
        );
      }

      this.logger.logStep({
        pageTitle: 'AI Flow Failed',
        url: this.page.url(),
        actions: ['Attempted autonomous navigation'],
        result: 'fail',
        notes: error.message
      });

      throw error;
    }
  }
}
