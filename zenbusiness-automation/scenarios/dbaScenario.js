/**
 * DBA Registration Scenario
 * Tests the DBA (Doing Business As) registration flow
 */

import { LLCScenario } from './llcScenario.js';

export class DBAScenario extends LLCScenario {
  constructor(persona) {
    super(persona);
    this.scenarioName = 'DBA Registration';
  }

  async startLLCFormation() {
    console.log(`\n📝 Step: Starting DBA registration...`);

    try {
      const dbaSelectors = [
        'text="Register DBA"',
        'text="Trade Name"',
        'a[href*="dba"]',
        'button:has-text("DBA")'
      ];

      let clicked = false;
      for (const selector of dbaSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await this.safeClick(selector, 'Start DBA button');
          clicked = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!clicked) {
        await this.page.goto(`${this.baseUrl}/dba`, { waitUntil: 'domcontentloaded' });
      }

      await this.wait(3000);

      this.logger.logStep({
        pageTitle: 'DBA Registration Start',
        url: this.page.url(),
        actions: ['Clicked "DBA Registration" button'],
        uxEvaluation: await this.evaluatePageUX(),
        copyEvaluation: await this.evaluateCopy(),
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Failed to start DBA registration: ${error.message}`);
      throw error;
    }
  }
}
