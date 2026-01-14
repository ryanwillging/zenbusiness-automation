/**
 * Custom Test Scenario Generator
 * Dynamically generates test scenarios with varying complexity
 */

import { LLCScenario } from './llcScenario.js';
import { DBAScenario } from './dbaScenario.js';
import { CorporationScenario } from './corporationScenario.js';
import { NonprofitScenario } from './nonprofitScenario.js';

/**
 * Generates a random custom test scenario
 * This stresses uncommon paths and edge cases
 */
export class CustomScenario extends LLCScenario {
  constructor(persona) {
    super(persona);
    this.scenarioName = 'Custom Test Case';
    this.customBehavior = this.generateCustomBehavior();
  }

  generateCustomBehavior() {
    const behaviors = [
      {
        name: 'Multi-state business',
        description: 'Business operating in multiple states',
        additionalQuestions: ['secondary_state', 'foreign_qualification']
      },
      {
        name: 'International founder',
        description: 'Founder with international address',
        additionalQuestions: ['country', 'visa_status']
      },
      {
        name: 'Complex ownership',
        description: 'Multi-member LLC with complex ownership structure',
        additionalQuestions: ['ownership_percentage', 'operating_agreement']
      },
      {
        name: 'Existing business conversion',
        description: 'Converting from sole proprietorship to LLC',
        additionalQuestions: ['existing_business_date', 'business_assets']
      },
      {
        name: 'Series LLC',
        description: 'Creating a series LLC structure',
        additionalQuestions: ['series_count', 'series_purposes']
      }
    ];

    return behaviors[Math.floor(Math.random() * behaviors.length)];
  }

  async execute() {
    console.log(`\n🎲 Executing Custom Test Case: ${this.customBehavior.name}`);
    console.log(`   Description: ${this.customBehavior.description}`);

    // Execute base flow
    const result = await super.execute();

    console.log(`\n✅ Custom scenario completed: ${this.customBehavior.name}`);
    return result;
  }

  async answerCurrentQuestion() {
    // Handle custom behavior questions
    const pageText = await this.page.locator('body').innerText().catch(() => '');

    for (const question of this.customBehavior.additionalQuestions) {
      if (pageText.toLowerCase().includes(question.replace('_', ' '))) {
        await this.handleCustomQuestion(question);
        return true;
      }
    }

    // Fall back to parent class
    return await super.answerCurrentQuestion();
  }

  async handleCustomQuestion(questionType) {
    switch (questionType) {
      case 'secondary_state':
        if (await this.isVisibleSelector('select[name*="state"]')) {
          await this.safeSelect('select[name*="state"]', 'NY', 'Secondary state');
        }
        break;

      case 'country':
        if (await this.isVisibleSelector('select[name*="country"]')) {
          await this.safeSelect('select[name*="country"]', 'USA', 'Country');
        }
        break;

      case 'ownership_percentage':
        if (await this.isVisibleSelector('input[name*="ownership"], input[name*="percentage"]')) {
          await this.safeFill('input[name*="ownership"], input[name*="percentage"]', '50', 'Ownership');
        }
        break;

      case 'existing_business_date':
        if (await this.isVisibleSelector('input[type="date"]')) {
          await this.safeFill('input[type="date"]', '2020-01-01', 'Business start date');
        }
        break;

      default:
        // Generic handling - click yes or fill with generic answer
        if (await this.isVisibleSelector('input[type="radio"]')) {
          const radios = await this.page.locator('input[type="radio"]').all();
          if (radios.length > 0) {
            await radios[0].click();
          }
        }
    }
  }
}

/**
 * Factory function to create random test scenarios
 */
export function createRandomScenario(persona) {
  const scenarios = [
    LLCScenario,
    DBAScenario,
    CorporationScenario,
    NonprofitScenario,
    CustomScenario
  ];

  const ScenarioClass = scenarios[Math.floor(Math.random() * scenarios.length)];
  return new ScenarioClass(persona);
}
