/**
 * Report Generator
 * Creates detailed markdown reports for each test scenario
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates a test log entry for a specific step
 */
export class TestLogger {
  constructor(scenarioName, persona) {
    this.scenarioName = scenarioName;
    this.persona = persona;
    this.steps = [];
    this.issues = {
      critical: [],
      major: [],
      minor: []
    };
    this.productDecisions = [];
    this.startTime = new Date();
    this.endTime = null;
    this.finalResult = null;
  }

  /**
   * Logs a step in the test execution
   */
  logStep(stepData) {
    const step = {
      timestamp: new Date().toISOString(),
      pageTitle: stepData.pageTitle || 'Unknown Page',
      url: stepData.url || '',
      actions: stepData.actions || [],
      dataInput: stepData.dataInput || {},
      uxEvaluation: stepData.uxEvaluation || '',
      copyEvaluation: stepData.copyEvaluation || '',
      interactionQuality: stepData.interactionQuality || '',
      productDecisions: stepData.productDecisions || [],
      screenshots: stepData.screenshots || [],
      result: stepData.result || 'pass',
      notes: stepData.notes || ''
    };

    this.steps.push(step);

    // Track product decisions separately
    if (stepData.productDecisions && stepData.productDecisions.length > 0) {
      this.productDecisions.push(...stepData.productDecisions);
    }
  }

  /**
   * Logs an issue found during testing
   */
  logIssue(severity, description, location) {
    const issue = {
      severity,
      description,
      location,
      timestamp: new Date().toISOString()
    };

    if (severity === 'critical' || severity === 'P0') {
      this.issues.critical.push(issue);
    } else if (severity === 'major' || severity === 'P1') {
      this.issues.major.push(issue);
    } else {
      this.issues.minor.push(issue);
    }
  }

  /**
   * Logs a product decision (accept/decline add-on)
   */
  logProductDecision(productName, decision, reasoning, relevance) {
    this.productDecisions.push({
      product: productName,
      decision,
      reasoning,
      relevance,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Marks the test as complete
   */
  complete(result, veloReached = false) {
    this.endTime = new Date();
    this.finalResult = result;
    this.veloReached = veloReached;
  }

  /**
   * Generates the markdown report
   */
  generateReport() {
    const duration = this.endTime ?
      Math.round((this.endTime - this.startTime) / 1000) : 0;

    let report = '';

    // Header
    report += `# Test Report: ${this.scenarioName}\n\n`;
    report += `**Timestamp:** ${this.startTime.toISOString()}\n\n`;
    report += `**Duration:** ${duration} seconds\n\n`;
    report += `**Final Result:** ${this.finalResult ? '✅ PASS' : '❌ FAIL'}\n\n`;
    report += `**Velo Chat Reached:** ${this.veloReached ? '✅ Yes' : '❌ No'}\n\n`;

    report += `---\n\n`;

    // Persona Details
    report += `## Test Persona\n\n`;
    report += `- **Name:** ${this.persona.fullName}\n`;
    report += `- **Email:** ${this.persona.email}\n`;
    report += `- **Business Type:** ${this.scenarioName}\n`;
    report += `- **Business Idea:** ${this.persona.businessIdea}\n`;
    report += `- **Location:** ${this.persona.state}\n`;
    report += `- **Background:** ${this.persona.background}\n`;
    report += `- **Motivation:** ${this.persona.motivation}\n\n`;

    report += `---\n\n`;

    // Step-by-Step Log
    report += `## Test Execution Steps\n\n`;

    this.steps.forEach((step, index) => {
      report += `### Step ${index + 1}: ${step.pageTitle}\n\n`;
      report += `**URL:** \`${step.url}\`\n\n`;
      report += `**Timestamp:** ${step.timestamp}\n\n`;

      if (step.actions.length > 0) {
        report += `**Actions Taken:**\n`;
        step.actions.forEach(action => {
          report += `- ${action}\n`;
        });
        report += `\n`;
      }

      if (Object.keys(step.dataInput).length > 0) {
        report += `**Data Input:**\n`;
        Object.entries(step.dataInput).forEach(([key, value]) => {
          report += `- **${key}:** ${value}\n`;
        });
        report += `\n`;
      }

      if (step.uxEvaluation) {
        report += `**UX Evaluation:**\n${step.uxEvaluation}\n\n`;
      }

      if (step.copyEvaluation) {
        report += `**Copy Evaluation:**\n${step.copyEvaluation}\n\n`;
      }

      if (step.interactionQuality) {
        report += `**Interaction Quality:**\n${step.interactionQuality}\n\n`;
      }

      if (step.productDecisions.length > 0) {
        report += `**Product Decisions:**\n`;
        step.productDecisions.forEach(decision => {
          report += `- **${decision.product}:** ${decision.decision}\n`;
          report += `  - Relevance: ${decision.relevance}\n`;
          report += `  - Reasoning: ${decision.reasoning}\n`;
        });
        report += `\n`;
      }

      report += `**Step Result:** ${step.result === 'pass' ? '✅ Pass' : '❌ Fail'}\n\n`;

      if (step.notes) {
        report += `**Notes:** ${step.notes}\n\n`;
      }

      report += `---\n\n`;
    });

    // Product Decisions Summary
    if (this.productDecisions.length > 0) {
      report += `## Product Add-On Decisions Summary\n\n`;
      report += `| Product | Decision | Relevance | Reasoning |\n`;
      report += `|---------|----------|-----------|------------|\n`;

      this.productDecisions.forEach(decision => {
        report += `| ${decision.product} | ${decision.decision} | ${decision.relevance} | ${decision.reasoning} |\n`;
      });

      report += `\n---\n\n`;
    }

    // Issues Found
    report += `## Issues Found\n\n`;

    if (this.issues.critical.length > 0) {
      report += `### Critical Issues (P0)\n\n`;
      this.issues.critical.forEach((issue, index) => {
        report += `${index + 1}. **${issue.description}**\n`;
        report += `   - Location: ${issue.location}\n`;
        report += `   - Time: ${issue.timestamp}\n\n`;
      });
    }

    if (this.issues.major.length > 0) {
      report += `### Major Issues (P1)\n\n`;
      this.issues.major.forEach((issue, index) => {
        report += `${index + 1}. **${issue.description}**\n`;
        report += `   - Location: ${issue.location}\n`;
        report += `   - Time: ${issue.timestamp}\n\n`;
      });
    }

    if (this.issues.minor.length > 0) {
      report += `### Minor Issues (P2)\n\n`;
      this.issues.minor.forEach((issue, index) => {
        report += `${index + 1}. **${issue.description}**\n`;
        report += `   - Location: ${issue.location}\n`;
        report += `   - Time: ${issue.timestamp}\n\n`;
      });
    }

    if (this.issues.critical.length === 0 &&
        this.issues.major.length === 0 &&
        this.issues.minor.length === 0) {
      report += `No issues found during this test run. ✅\n\n`;
    }

    report += `---\n\n`;

    // Recommendations
    report += `## Recommendations\n\n`;
    report += `### UX Recommendations\n\n`;
    report += this.generateUXRecommendations();
    report += `\n### Copy Recommendations\n\n`;
    report += this.generateCopyRecommendations();
    report += `\n---\n\n`;

    // Final Summary
    report += `## Final Assessment\n\n`;
    report += `- **Test Result:** ${this.finalResult ? '✅ PASS' : '❌ FAIL'}\n`;
    report += `- **Total Steps:** ${this.steps.length}\n`;
    report += `- **Failed Steps:** ${this.steps.filter(s => s.result === 'fail').length}\n`;
    report += `- **Critical Issues:** ${this.issues.critical.length}\n`;
    report += `- **Major Issues:** ${this.issues.major.length}\n`;
    report += `- **Minor Issues:** ${this.issues.minor.length}\n`;
    report += `- **Velo Reached:** ${this.veloReached ? 'Yes' : 'No'}\n\n`;

    return report;
  }

  /**
   * Generates UX recommendations based on logged steps
   */
  generateUXRecommendations() {
    let recommendations = '';

    // Analyze steps for common UX patterns
    const slowSteps = this.steps.filter(s => s.notes && s.notes.includes('slow'));
    const confusingSteps = this.steps.filter(s =>
      s.uxEvaluation && (s.uxEvaluation.includes('confusing') || s.uxEvaluation.includes('unclear'))
    );

    if (slowSteps.length > 0) {
      recommendations += `- Consider optimizing page load times (${slowSteps.length} slow steps detected)\n`;
    }

    if (confusingSteps.length > 0) {
      recommendations += `- Improve clarity and visual hierarchy on ${confusingSteps.length} pages\n`;
    }

    if (this.steps.length > 20) {
      recommendations += `- Consider streamlining the flow (${this.steps.length} total steps)\n`;
    }

    if (recommendations === '') {
      recommendations = 'No specific UX recommendations at this time.\n';
    }

    return recommendations;
  }

  /**
   * Generates copy recommendations based on logged steps
   */
  generateCopyRecommendations() {
    let recommendations = '';

    const copyIssues = this.steps.filter(s =>
      s.copyEvaluation && (s.copyEvaluation.includes('unclear') || s.copyEvaluation.includes('confusing'))
    );

    if (copyIssues.length > 0) {
      recommendations += `- Revise copy on ${copyIssues.length} pages for better clarity\n`;
    }

    if (recommendations === '') {
      recommendations = 'No specific copy recommendations at this time.\n';
    }

    return recommendations;
  }

  /**
   * Saves the report to a file
   */
  async saveReport(reportsDir = './reports') {
    const report = this.generateReport();
    const fileName = `${this.scenarioName}_${this.persona.uniqueId}_${Date.now()}.md`;
    const filePath = path.join(reportsDir, fileName);

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, report, 'utf-8');
    console.log(`Report saved to: ${filePath}`);

    return filePath;
  }
}

/**
 * Generates a summary report across multiple scenarios
 */
export function generateSummaryReport(scenarioResults) {
  let summary = `# Multi-Scenario Test Summary\n\n`;
  summary += `**Generated:** ${new Date().toISOString()}\n\n`;
  summary += `**Total Scenarios:** ${scenarioResults.length}\n\n`;

  const passed = scenarioResults.filter(r => r.result === true).length;
  const failed = scenarioResults.filter(r => r.result === false).length;

  summary += `**Passed:** ${passed} ✅\n`;
  summary += `**Failed:** ${failed} ❌\n\n`;

  summary += `---\n\n`;

  summary += `## Scenario Results\n\n`;
  summary += `| Scenario | Result | Duration | Velo Reached | Critical Issues | Major Issues |\n`;
  summary += `|----------|--------|----------|--------------|-----------------|---------------|\n`;

  scenarioResults.forEach(result => {
    summary += `| ${result.scenario} | ${result.result ? '✅ Pass' : '❌ Fail'} | ${result.duration}s | ${result.veloReached ? '✅' : '❌'} | ${result.criticalIssues} | ${result.majorIssues} |\n`;
  });

  summary += `\n---\n\n`;

  // Cross-scenario analysis
  summary += `## Cross-Scenario Analysis\n\n`;

  const totalIssues = scenarioResults.reduce((acc, r) => acc + r.criticalIssues + r.majorIssues, 0);
  summary += `### Total Issues Across All Scenarios: ${totalIssues}\n\n`;

  // Common pain points
  summary += `### Common Pain Points\n\n`;
  summary += `(Analysis based on patterns across multiple test runs)\n\n`;

  const avgDuration = scenarioResults.reduce((acc, r) => acc + r.duration, 0) / scenarioResults.length;
  summary += `- Average test duration: ${Math.round(avgDuration)} seconds\n`;

  const veloReachedCount = scenarioResults.filter(r => r.veloReached).length;
  summary += `- Velo chat reached: ${veloReachedCount}/${scenarioResults.length} scenarios\n`;

  summary += `\n---\n\n`;

  summary += `## Recommendations\n\n`;
  summary += `Based on the test results:\n\n`;

  if (failed > 0) {
    summary += `1. **Priority:** Address failures in ${failed} scenario(s)\n`;
  }

  if (veloReachedCount < scenarioResults.length) {
    summary += `2. **Priority:** Investigate why ${scenarioResults.length - veloReachedCount} scenario(s) did not reach Velo\n`;
  }

  if (totalIssues > 5) {
    summary += `3. **Review:** ${totalIssues} total issues require attention\n`;
  }

  summary += `\n`;

  return summary;
}
