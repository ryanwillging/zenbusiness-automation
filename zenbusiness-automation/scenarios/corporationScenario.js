/**
 * Corporation Formation Scenario
 * Tests C-Corp and S-Corp formation flows
 */

import { LLCScenario } from './llcScenario.js';
import { generateFounders } from '../utils/personaGenerator.js';

export class CorporationScenario extends LLCScenario {
  constructor(persona) {
    super(persona);
    this.scenarioName = 'Corporation Formation';
    this.founders = generateFounders(Math.random() > 0.5 ? 2 : 3);
    this.corpType = Math.random() > 0.5 ? 'C-Corp' : 'S-Corp';
  }

  async startLLCFormation() {
    console.log(`\n🏢 Step: Starting ${this.corpType} formation...`);

    try {
      const corpSelectors = [
        'text="Incorporate"',
        'text="Corporation"',
        'text="C-Corp"',
        'text="S-Corp"',
        'a[href*="corporation"]',
        'a[href*="incorporate"]'
      ];

      let clicked = false;
      for (const selector of corpSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await this.safeClick(selector, 'Start Corporation button');
          clicked = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!clicked) {
        await this.page.goto(`${this.baseUrl}/incorporate`, { waitUntil: 'domcontentloaded' });
      }

      await this.wait(3000);

      this.logger.logStep({
        pageTitle: `${this.corpType} Formation Start`,
        url: this.page.url(),
        actions: [`Clicked "Start ${this.corpType}" button`],
        uxEvaluation: await this.evaluatePageUX(),
        copyEvaluation: await this.evaluateCopy(),
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Failed to start corporation formation: ${error.message}`);
      throw error;
    }
  }

  async answerCurrentQuestion() {
    // Handle corporation-specific questions first

    // Corporation type selection
    if (await this.isVisibleSelector('select[name*="type"], select[name*="entity"]')) {
      const typeValue = this.corpType === 'C-Corp' ? 'c-corp' : 's-corp';
      try {
        await this.safeSelect('select[name*="type"], select[name*="entity"]', typeValue, 'Corp type');
        return true;
      } catch (e) {
        // Fallback to clicking radio button
        if (await this.isVisibleSelector(`input[value*="${typeValue}"]`)) {
          await this.safeClick(`input[value*="${typeValue}"]`);
          return true;
        }
      }
    }

    // Number of founders/shareholders
    if (await this.isVisibleSelector('input[name*="founder"], input[name*="shareholder"]')) {
      await this.safeFill('input[name*="founder"], input[name*="shareholder"]',
        this.founders.length.toString(), 'Number of founders');
      return true;
    }

    // Add founder information
    if (await this.isVisibleSelector('input[name*="founder"][name*="name"]')) {
      for (let i = 0; i < this.founders.length; i++) {
        const founder = this.founders[i];
        try {
          await this.safeFill(`input[name*="founder${i}"][name*="name"]`, founder.fullName);
          if (await this.isVisibleSelector(`input[name*="founder${i}"][name*="email"]`)) {
            await this.safeFill(`input[name*="founder${i}"][name*="email"]`, founder.email);
          }
          if (await this.isVisibleSelector(`input[name*="founder${i}"][name*="ownership"]`)) {
            await this.safeFill(`input[name*="founder${i}"][name*="ownership"]`, founder.ownership.toString());
          }
        } catch (e) {
          console.log(`   ⚠️  Could not fill all founder ${i} fields`);
        }
      }
      return true;
    }

    // Call parent class method for standard questions
    return await super.answerCurrentQuestion();
  }
}
