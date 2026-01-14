/**
 * Test Analyzer
 * Analyzes test results and updates instruction set with learnings
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export class TestAnalyzer {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.claudeMdPath = './CLAUDE.md';
    this.learningsPath = './zenbusiness-automation/learnings.json';
  }

  /**
   * Load existing learnings from JSON file
   */
  loadLearnings() {
    try {
      if (fs.existsSync(this.learningsPath)) {
        return JSON.parse(fs.readFileSync(this.learningsPath, 'utf-8'));
      }
    } catch (error) {
      console.log(`   Could not load existing learnings: ${error.message}`);
    }
    return {
      testRuns: [],
      patterns: [],
      selectors: {},
      commonIssues: [],
      successfulPaths: []
    };
  }

  /**
   * Save learnings to JSON file
   */
  saveLearnings(learnings) {
    fs.writeFileSync(this.learningsPath, JSON.stringify(learnings, null, 2));
  }

  /**
   * Analyze test report and extract learnings
   */
  async analyzeReport(reportPath) {
    const reportContent = fs.readFileSync(reportPath, 'utf-8');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this test report and extract learnings that can improve future test runs.

${reportContent}

Please provide your analysis in the following JSON format:
{
  "summary": "Brief summary of the test run",
  "success": true/false,
  "patternsIdentified": [
    {
      "type": "selector|navigation|form|error",
      "description": "What was learned",
      "pageUrl": "URL pattern where this applies",
      "recommendation": "How to use this learning"
    }
  ],
  "workingSelectors": [
    {
      "page": "page name or URL pattern",
      "element": "what element",
      "selector": "CSS selector that worked",
      "action": "click|fill|select"
    }
  ],
  "failedSelectors": [
    {
      "page": "page name",
      "attemptedSelector": "selector that failed",
      "reason": "why it failed"
    }
  ],
  "navigationFlow": [
    "Step 1 description",
    "Step 2 description"
  ],
  "recommendations": [
    "Specific recommendation for improving the test"
  ],
  "instructionUpdates": [
    {
      "section": "section name",
      "update": "what to add or change",
      "priority": "high|medium|low"
    }
  ]
}

Return ONLY valid JSON.`
        }
      ]
    });

    const responseText = response.content[0].text;

    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse analysis response:', error.message);
      return null;
    }
  }

  /**
   * Update CLAUDE.md with new learnings
   */
  updateClaudeMd(analysis, learnings) {
    if (!fs.existsSync(this.claudeMdPath)) {
      console.log('   CLAUDE.md not found, skipping update');
      return false;
    }

    let claudeMd = fs.readFileSync(this.claudeMdPath, 'utf-8');

    // Check if learnings section exists
    const learningsSectionMarker = '## Learned Patterns';

    if (!claudeMd.includes(learningsSectionMarker)) {
      // Add learnings section
      claudeMd += `\n\n${learningsSectionMarker}\n\n`;
      claudeMd += `This section is automatically updated based on test run analysis.\n\n`;
    }

    // Build learnings content
    let learningsContent = `\n### Last Updated: ${new Date().toISOString()}\n\n`;

    // Add working selectors
    if (learnings.patterns.length > 0) {
      learningsContent += `### Known Working Patterns\n\n`;
      const recentPatterns = learnings.patterns.slice(-10); // Last 10 patterns
      recentPatterns.forEach(pattern => {
        learningsContent += `- **${pattern.type}**: ${pattern.description}\n`;
        if (pattern.recommendation) {
          learningsContent += `  - Recommendation: ${pattern.recommendation}\n`;
        }
      });
      learningsContent += `\n`;
    }

    // Add successful navigation flows
    if (learnings.successfulPaths.length > 0) {
      learningsContent += `### Successful Navigation Flows\n\n`;
      const recentFlow = learnings.successfulPaths[learnings.successfulPaths.length - 1];
      if (recentFlow && recentFlow.steps) {
        recentFlow.steps.slice(0, 10).forEach((step, i) => {
          learningsContent += `${i + 1}. ${step}\n`;
        });
      }
      learningsContent += `\n`;
    }

    // Add common issues to watch for
    if (learnings.commonIssues.length > 0) {
      learningsContent += `### Common Issues\n\n`;
      const recentIssues = learnings.commonIssues.slice(-5);
      recentIssues.forEach(issue => {
        learningsContent += `- ${issue}\n`;
      });
      learningsContent += `\n`;
    }

    // Add test statistics
    learningsContent += `### Test Statistics\n\n`;
    learningsContent += `- Total test runs analyzed: ${learnings.testRuns.length}\n`;
    const successfulRuns = learnings.testRuns.filter(r => r.success).length;
    learningsContent += `- Successful runs: ${successfulRuns}\n`;
    learningsContent += `- Success rate: ${((successfulRuns / learnings.testRuns.length) * 100).toFixed(1)}%\n`;

    // Replace or append learnings section
    const sectionRegex = new RegExp(`${learningsSectionMarker}[\\s\\S]*$`);
    if (claudeMd.match(sectionRegex)) {
      claudeMd = claudeMd.replace(sectionRegex, `${learningsSectionMarker}\n\nThis section is automatically updated based on test run analysis.\n${learningsContent}`);
    } else {
      claudeMd += learningsContent;
    }

    fs.writeFileSync(this.claudeMdPath, claudeMd);
    return true;
  }

  /**
   * Main method: analyze report and update learnings
   */
  async analyzeAndLearn(reportPath, testRunDir) {
    console.log(`\n🔍 Analyzing test report: ${reportPath}`);

    // Load existing learnings
    const learnings = this.loadLearnings();

    // Analyze the report
    const analysis = await this.analyzeReport(reportPath);

    if (!analysis) {
      console.log('   Analysis failed, no learnings extracted');
      return null;
    }

    // Record this test run
    learnings.testRuns.push({
      timestamp: new Date().toISOString(),
      reportPath,
      testRunDir,
      success: analysis.success,
      summary: analysis.summary
    });

    // Add new patterns
    if (analysis.patternsIdentified) {
      analysis.patternsIdentified.forEach(pattern => {
        // Avoid duplicates
        const exists = learnings.patterns.some(p =>
          p.type === pattern.type && p.description === pattern.description
        );
        if (!exists) {
          learnings.patterns.push({
            ...pattern,
            addedAt: new Date().toISOString()
          });
        }
      });
    }

    // Add working selectors
    if (analysis.workingSelectors) {
      analysis.workingSelectors.forEach(selector => {
        const key = `${selector.page}_${selector.element}`;
        learnings.selectors[key] = {
          ...selector,
          lastSeen: new Date().toISOString(),
          successCount: (learnings.selectors[key]?.successCount || 0) + 1
        };
      });
    }

    // Track failed selectors as issues
    if (analysis.failedSelectors) {
      analysis.failedSelectors.forEach(failed => {
        const issue = `Selector failed on ${failed.page}: ${failed.attemptedSelector} - ${failed.reason}`;
        if (!learnings.commonIssues.includes(issue)) {
          learnings.commonIssues.push(issue);
        }
      });
    }

    // Record successful navigation flow
    if (analysis.success && analysis.navigationFlow) {
      learnings.successfulPaths.push({
        timestamp: new Date().toISOString(),
        steps: analysis.navigationFlow
      });
    }

    // Save updated learnings
    this.saveLearnings(learnings);
    console.log(`   💾 Learnings saved to ${this.learningsPath}`);

    // Update CLAUDE.md
    const updatedInstructions = this.updateClaudeMd(analysis, learnings);

    // Save analysis to test run directory
    if (testRunDir) {
      const analysisPath = path.join(testRunDir, 'analysis.json');
      fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
      console.log(`   📊 Analysis saved to ${analysisPath}`);
    }

    return {
      ...analysis,
      patternsIdentified: analysis.patternsIdentified?.length || 0,
      updatedInstructions
    };
  }

  /**
   * Generate a summary of all learnings
   */
  generateLearningSummary() {
    const learnings = this.loadLearnings();

    let summary = `# Test Learning Summary\n\n`;
    summary += `Generated: ${new Date().toISOString()}\n\n`;

    summary += `## Overview\n\n`;
    summary += `- Total test runs: ${learnings.testRuns.length}\n`;
    summary += `- Patterns learned: ${learnings.patterns.length}\n`;
    summary += `- Working selectors: ${Object.keys(learnings.selectors).length}\n`;
    summary += `- Known issues: ${learnings.commonIssues.length}\n\n`;

    summary += `## Recent Test Runs\n\n`;
    learnings.testRuns.slice(-5).forEach(run => {
      summary += `- ${run.timestamp}: ${run.success ? '✅' : '❌'} ${run.summary || 'No summary'}\n`;
    });

    summary += `\n## Top Patterns\n\n`;
    learnings.patterns.slice(-10).forEach(pattern => {
      summary += `### ${pattern.type}\n`;
      summary += `${pattern.description}\n`;
      if (pattern.recommendation) {
        summary += `> ${pattern.recommendation}\n`;
      }
      summary += `\n`;
    });

    return summary;
  }
}
