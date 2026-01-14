/**
 * Base Test Scenario
 * Abstract base class for all test scenarios
 */

import { chromium } from 'playwright';
import { TestLogger } from './reportGenerator.js';

export class BaseScenario {
  constructor(persona, scenarioName) {
    this.persona = persona;
    this.scenarioName = scenarioName;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.logger = new TestLogger(scenarioName, persona);
    this.baseUrl = 'https://www.dev.zenbusiness.com';
  }

  /**
   * Initializes the browser and page
   */
  async initialize() {
    console.log(`\n🚀 Initializing ${this.scenarioName} scenario...`);
    console.log(`📧 Test email: ${this.persona.email}`);

    this.browser = await chromium.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 100, // Slow down actions for visibility
      args: [
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      colorScheme: 'light'
    });

    this.page = await this.context.newPage();

    // Remove webdriver flag to bypass bot detection
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      window.chrome = { runtime: {} };

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    // Handle new pages/popups
    this.context.on('page', async (newPage) => {
      console.log(`📄 New page detected: ${await newPage.title()}`);
      // Optionally switch to the new page
      // this.page = newPage;
    });

    // Setup console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser console error: ${msg.text()}`);
      }
    });

    // Setup error logging
    this.page.on('pageerror', error => {
      console.log(`❌ Page error: ${error.message}`);
      this.logger.logIssue('major', `JavaScript error: ${error.message}`, this.page.url());
    });
  }

  /**
   * Navigate to the home page
   */
  async navigateToHome() {
    console.log(`📍 Navigating to ${this.baseUrl}...`);

    await this.page.goto(this.baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await this.wait(2000);

    this.logger.logStep({
      pageTitle: 'ZenBusiness Home',
      url: this.page.url(),
      actions: ['Navigated to home page'],
      result: 'pass'
    });
  }

  /**
   * Wait for a specified duration
   */
  async wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe click with retry logic
   */
  async safeClick(selector, description = '') {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
        await this.page.click(selector);
        console.log(`✅ Clicked: ${description || selector}`);
        return true;
      } catch (error) {
        lastError = error;
        console.log(`⚠️  Click attempt ${i + 1} failed for ${selector}. Retrying...`);
        await this.wait(2000);
      }
    }

    console.log(`❌ Failed to click: ${selector}`);
    this.logger.logIssue('major', `Failed to click element: ${description || selector}`, this.page.url());
    throw lastError;
  }

  /**
   * Safe fill input with retry logic
   */
  async safeFill(selector, value, description = '') {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
        await this.page.fill(selector, value);
        console.log(`✅ Filled: ${description || selector}`);
        return true;
      } catch (error) {
        lastError = error;
        console.log(`⚠️  Fill attempt ${i + 1} failed for ${selector}. Retrying...`);
        await this.wait(2000);
      }
    }

    console.log(`❌ Failed to fill: ${selector}`);
    this.logger.logIssue('major', `Failed to fill input: ${description || selector}`, this.page.url());
    throw lastError;
  }

  /**
   * Safe select from dropdown
   */
  async safeSelect(selector, value, description = '') {
    const maxRetries = 3;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000 });
        await this.page.selectOption(selector, value);
        console.log(`✅ Selected: ${description || selector}`);
        return true;
      } catch (error) {
        lastError = error;
        console.log(`⚠️  Select attempt ${i + 1} failed for ${selector}. Retrying...`);
        await this.wait(2000);
      }
    }

    console.log(`❌ Failed to select: ${selector}`);
    this.logger.logIssue('major', `Failed to select option: ${description || selector}`, this.page.url());
    throw lastError;
  }

  /**
   * Evaluate UX of current page
   */
  async evaluatePageUX() {
    try {
      if (this.page.isClosed()) {
        return 'Page closed, unable to evaluate UX.';
      }

      const url = this.page.url();
      const title = await this.page.title();

    // Basic UX checks
    const checks = {
      hasTitle: title && title.length > 0,
      hasHeadings: await this.page.locator('h1, h2').count() > 0,
      hasButtons: await this.page.locator('button, input[type="submit"]').count() > 0,
      hasNavigation: await this.page.locator('nav, header').count() > 0
    };

    let evaluation = '';

    if (!checks.hasTitle) {
      evaluation += '⚠️  Missing or empty page title. ';
    }

    if (!checks.hasHeadings) {
      evaluation += '⚠️  No clear heading hierarchy. ';
    }

      if (checks.hasTitle && checks.hasHeadings && checks.hasNavigation) {
        evaluation = '✅ Page has good structural elements (title, headings, navigation).';
      }

      return evaluation || 'Page structure appears adequate.';
    } catch (error) {
      return 'Unable to evaluate UX: ' + error.message;
    }
  }

  /**
   * Evaluate copy/content quality
   */
  async evaluateCopy() {
    try {
      const bodyText = await this.page.locator('body').innerText();

      // Basic copy checks
      const hasGrammarIssues = bodyText.includes('..') || bodyText.includes('!!');
      const hasClearCTA = /start|begin|continue|next|create/i.test(bodyText);

      let evaluation = '';

      if (hasGrammarIssues) {
        evaluation += '⚠️  Potential grammar/punctuation issues detected. ';
      }

      if (!hasClearCTA) {
        evaluation += '⚠️  No clear call-to-action detected. ';
      }

      if (!hasGrammarIssues && hasClearCTA) {
        evaluation = '✅ Copy appears clear with good call-to-action.';
      }

      return evaluation || 'Copy appears adequate.';
    } catch (error) {
      return 'Unable to evaluate copy.';
    }
  }

  /**
   * Evaluate interaction quality (buttons, forms, etc.)
   */
  async evaluateInteractions() {
    try {
      if (this.page.isClosed()) {
        return 'Page closed, unable to evaluate interactions.';
      }

      const buttons = await this.page.locator('button, input[type="submit"]').count();
      const inputs = await this.page.locator('input, textarea, select').count();

      let evaluation = '';

      if (buttons === 0 && inputs === 0) {
        evaluation = '⚠️  No interactive elements detected on page.';
      } else {
        evaluation = `✅ Page has ${buttons} button(s) and ${inputs} input(s).`;
      }

      return evaluation;
    } catch (error) {
      return 'Unable to evaluate interactions.';
    }
  }

  /**
   * Evaluate and decide on a product offer
   */
  evaluateProductOffer(productName, businessType) {
    const productRelevance = {
      'EIN': {
        llc: { relevant: true, reasoning: 'LLCs typically need an EIN for tax purposes and banking' },
        dba: { relevant: false, reasoning: 'Sole proprietors can use SSN, EIN optional for DBAs' },
        corporation: { relevant: true, reasoning: 'Corporations require EIN for tax filing' },
        nonprofit: { relevant: true, reasoning: 'Nonprofits must have EIN for 501(c)(3) status' }
      },
      'Worry-Free Compliance': {
        llc: { relevant: true, reasoning: 'LLCs need annual report filing and compliance tracking' },
        dba: { relevant: false, reasoning: 'DBAs have minimal compliance requirements' },
        corporation: { relevant: true, reasoning: 'Corporations have complex compliance requirements' },
        nonprofit: { relevant: true, reasoning: 'Nonprofits face strict compliance and reporting' }
      },
      'Domain Registration': {
        llc: { relevant: true, reasoning: 'Most businesses need online presence' },
        dba: { relevant: true, reasoning: 'Branding requires domain name' },
        corporation: { relevant: true, reasoning: 'Professional presence requires domain' },
        nonprofit: { relevant: true, reasoning: 'Nonprofits need online visibility for donors' }
      },
      'Website Builder': {
        llc: { relevant: true, reasoning: 'Customer-facing businesses benefit from websites' },
        dba: { relevant: true, reasoning: 'Helps establish brand credibility' },
        corporation: { relevant: false, reasoning: 'Startups typically build custom websites' },
        nonprofit: { relevant: true, reasoning: 'Essential for donor engagement and awareness' }
      },
      'Business Banking': {
        llc: { relevant: true, reasoning: 'LLCs should separate personal and business finances' },
        dba: { relevant: false, reasoning: 'Sole proprietors can use personal accounts initially' },
        corporation: { relevant: true, reasoning: 'Corporations require separate business bank accounts' },
        nonprofit: { relevant: true, reasoning: 'Nonprofits need dedicated accounts for transparency' }
      },
      'Bookkeeping': {
        llc: { relevant: true, reasoning: 'Proper accounting essential for tax compliance' },
        dba: { relevant: false, reasoning: 'Simple businesses can manage basic bookkeeping' },
        corporation: { relevant: true, reasoning: 'Complex entity requires professional bookkeeping' },
        nonprofit: { relevant: true, reasoning: 'Transparency and reporting require good bookkeeping' }
      }
    };

    const normalizedBusinessType = businessType.toLowerCase().replace(/ /g, '');
    let businessKey = 'llc';

    if (normalizedBusinessType.includes('dba')) businessKey = 'dba';
    else if (normalizedBusinessType.includes('corp')) businessKey = 'corporation';
    else if (normalizedBusinessType.includes('nonprofit')) businessKey = 'nonprofit';

    const productInfo = productRelevance[productName]?.[businessKey] || {
      relevant: true,
      reasoning: 'Generally useful for most businesses'
    };

    const decision = productInfo.relevant ? 'Accept' : 'Decline';
    const relevance = productInfo.relevant ? 'High' : 'Low';

    this.logger.logProductDecision(productName, decision, productInfo.reasoning, relevance);

    return {
      decision,
      relevance,
      reasoning: productInfo.reasoning
    };
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Cleanup and close browser
   */
  async cleanup() {
    console.log(`\n🧹 Cleaning up ${this.scenarioName} scenario...`);

    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Run the complete scenario
   */
  async run() {
    let success = false;
    let veloReached = false;

    try {
      await this.initialize();
      await this.navigateToHome();

      // Execute the scenario-specific logic
      const result = await this.execute();
      veloReached = result.veloReached || false;
      success = true;

      console.log(`\n✅ ${this.scenarioName} completed successfully!`);

    } catch (error) {
      console.error(`\n❌ ${this.scenarioName} failed:`, error.message);
      this.logger.logIssue('critical', `Scenario failed: ${error.message}`, this.page?.url() || 'Unknown');
      success = false;

    } finally {
      this.logger.complete(success, veloReached);
      await this.cleanup();

      // Generate and save report
      const reportPath = await this.logger.saveReport('./zenbusiness-automation/reports');
      console.log(`📄 Report saved: ${reportPath}`);

      return {
        scenario: this.scenarioName,
        result: success,
        veloReached,
        duration: Math.round((this.logger.endTime - this.logger.startTime) / 1000),
        criticalIssues: this.logger.issues.critical.length,
        majorIssues: this.logger.issues.major.length,
        reportPath
      };
    }
  }
}
