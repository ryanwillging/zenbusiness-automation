/**
 * Nonprofit Formation Scenario
 * Tests nonprofit 501(c)(3) formation flow
 */

import { LLCScenario } from './llcScenario.js';

export class NonprofitScenario extends LLCScenario {
  constructor(persona) {
    super(persona);
    this.scenarioName = 'Nonprofit Formation';
    this.missionStatement = this.generateMissionStatement();
  }

  generateMissionStatement() {
    const missions = [
      'To provide educational opportunities for underserved communities',
      'To protect and preserve natural habitats and wildlife',
      'To support families experiencing food insecurity',
      'To empower youth through mentorship and skill development',
      'To advance mental health awareness and support services'
    ];
    return missions[Math.floor(Math.random() * missions.length)];
  }

  async startLLCFormation() {
    console.log(`\n🎗️  Step: Starting Nonprofit formation...`);

    try {
      const nonprofitSelectors = [
        'text="Nonprofit"',
        'text="501(c)(3)"',
        'text="Start a Nonprofit"',
        'a[href*="nonprofit"]'
      ];

      let clicked = false;
      for (const selector of nonprofitSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await this.safeClick(selector, 'Start Nonprofit button');
          clicked = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!clicked) {
        await this.page.goto(`${this.baseUrl}/nonprofit`, { waitUntil: 'domcontentloaded' });
      }

      await this.wait(3000);

      this.logger.logStep({
        pageTitle: 'Nonprofit Formation Start',
        url: this.page.url(),
        actions: ['Clicked "Start Nonprofit" button'],
        uxEvaluation: await this.evaluatePageUX(),
        copyEvaluation: await this.evaluateCopy(),
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Failed to start nonprofit formation: ${error.message}`);
      throw error;
    }
  }

  async answerCurrentQuestion() {
    // Handle nonprofit-specific questions

    // Mission statement
    if (await this.isVisibleSelector('textarea[name*="mission"]')) {
      await this.safeFill('textarea[name*="mission"]', this.missionStatement, 'Mission statement');
      return true;
    }

    // 501(c)(3) intention
    if (await this.isVisibleSelector('input[value*="501"]')) {
      await this.safeClick('input[value*="501"]', '501(c)(3) selection');
      return true;
    }

    // Charitable purpose
    if (await this.isVisibleSelector('select[name*="purpose"], select[name*="charitable"]')) {
      const purposes = ['education', 'charity', 'religious', 'scientific'];
      const purpose = purposes[Math.floor(Math.random() * purposes.length)];
      await this.safeSelect('select[name*="purpose"], select[name*="charitable"]', purpose, 'Charitable purpose');
      return true;
    }

    // Board members
    if (await this.isVisibleSelector('input[name*="board"]')) {
      await this.safeFill('input[name*="board"]', '3', 'Number of board members');
      return true;
    }

    // Funding sources
    if (await this.isVisibleSelector('input[type="checkbox"][value*="donation"], input[type="checkbox"][value*="grant"]')) {
      await this.safeClick('input[type="checkbox"][value*="donation"]', 'Donation funding');
      return true;
    }

    // Call parent class method for standard questions
    return await super.answerCurrentQuestion();
  }
}
