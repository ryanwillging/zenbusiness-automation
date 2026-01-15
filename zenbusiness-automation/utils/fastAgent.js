/**
 * Fast Agent - Combines Stagehand + AgentQL + Claude Haiku
 * Optimized for speed and reliability
 *
 * Uses Stagehand's agent() mode for autonomous multi-step navigation
 */

import { Stagehand } from '@browserbasehq/stagehand';
import Anthropic from '@anthropic-ai/sdk';

export class FastAgent {
  constructor(persona, businessDetails, options = {}) {
    this.persona = persona;
    this.businessDetails = businessDetails;
    this.options = options;

    // Stagehand instance
    this.stagehand = null;
    this.page = null;
    this.agent = null; // Stagehand agent for autonomous navigation

    // Anthropic client for Haiku fallback
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Step tracking
    this.stepLog = [];
    this.startTime = null;
  }

  /**
   * Initialize the browser and tools
   */
  async init() {
    console.log('🚀 Initializing FastAgent...');

    // Initialize Stagehand in LOCAL mode with OpenAI GPT-4o (Stagehand works better with OpenAI)
    this.stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY
      },
      enableCaching: true,
      headless: false,
      verbose: 0,
    });

    await this.stagehand.init();

    // Get page from context
    const pages = this.stagehand.context.pages();
    this.page = pages[0] || await this.stagehand.context.newPage();

    // Create Stagehand agent for autonomous navigation
    try {
      this.agent = this.stagehand.agent({
        modelName: 'gpt-4o',
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY
        }
      });
      console.log('   ✅ Stagehand agent mode enabled (GPT-4o)');
    } catch (e) {
      this.agent = null;
      console.log(`   ⚠️ Agent mode not available: ${e.message}`);
    }

    console.log('   ✅ FastAgent ready\n');
    this.startTime = Date.now();
  }

  /**
   * Build instructions for the Stagehand agent with persona and business data
   */
  buildAgentInstructions() {
    return `ZenBusiness LLC automation. Fill forms with EXACT values, then click CTA.

DATA:
Name: ${this.persona.firstName} ${this.persona.lastName}
Email: ${this.persona.email}
Phone: ${this.persona.phone}
State: ${this.persona.state}
Business: ${this.businessDetails.businessName}
Address: ${this.persona.address?.street || '123 Main Street'}, ${this.persona.address?.city || 'Las Vegas'}, ${this.persona.address?.zip || '89101'}

CTA BUTTONS (click these to progress):
- "Continue" (most common - blue button at bottom)
- "Get started" (homepage)
- "Create account" / "Sign up"
- "Next"
- "Submit"

RULES:
1. Fill ALL visible form fields, then click the CTA button
2. For dropdowns: click to open, type to filter, click result
3. For questions with options: select first reasonable choice
4. STOP on CAPTCHA or payment pages`;
  }

  /**
   * Helper to wait
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Navigate to URL
   */
  async goto(url) {
    console.log(`📍 Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.wait(300);
  }

  /**
   * Check if on CAPTCHA page
   */
  async isOnCaptcha() {
    const url = this.page.url();
    if (url.includes('/t/validate')) return true;

    try {
      const captcha = await this.page.$('iframe[title*="reCAPTCHA"]', { timeout: 500 });
      return !!captcha;
    } catch {
      return false;
    }
  }

  /**
   * Wait for manual CAPTCHA completion
   */
  async waitForCaptcha(maxWait = 180000) {
    if (!(await this.isOnCaptcha())) return;

    console.log('\n⏸️  CAPTCHA DETECTED - Complete it manually in the browser');

    const start = Date.now();
    while (Date.now() - start < maxWait) {
      await this.wait(2000);
      if (!(await this.isOnCaptcha())) {
        console.log('   ✅ CAPTCHA completed!\n');
        return;
      }
      process.stdout.write(`\r   ⏳ Waiting... ${Math.round((Date.now() - start) / 1000)}s`);
    }
    throw new Error('CAPTCHA timeout');
  }

  /**
   * Use AgentQL to query elements semantically
   */
  async queryElements(query) {
    if (!this.agentqlPage) return null;

    try {
      const result = await this.agentqlPage.queryElements(query);
      return result;
    } catch (e) {
      return null;
    }
  }

  /**
   * Fast action using Stagehand's act()
   */
  async act(instruction) {
    const stepStart = Date.now();
    console.log(`\n🎯 Action: ${instruction}`);

    try {
      // Stagehand act() takes a string directly
      await this.stagehand.act(instruction);
      console.log(`   ✅ Done (${Date.now() - stepStart}ms)`);

      this.stepLog.push({
        action: instruction,
        success: true,
        duration: Date.now() - stepStart
      });

      return true;
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
      this.stepLog.push({
        action: instruction,
        success: false,
        error: e.message,
        duration: Date.now() - stepStart
      });
      return false;
    }
  }

  /**
   * Extract data from page using Stagehand
   */
  async extract(instruction, schema) {
    try {
      const result = await this.stagehand.extract({
        instruction,
        schema
      });
      return result;
    } catch (e) {
      console.log(`   ⚠️ Extract failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Get persona value for a field description
   */
  getPersonaValue(fieldDescription) {
    const d = fieldDescription.toLowerCase();

    if (d.includes('email')) return this.persona.email;
    if (d.includes('first name')) return this.persona.firstName;
    if (d.includes('last name')) return this.persona.lastName;
    if (d.includes('full name') || d.includes('name')) return this.persona.fullName;
    if (d.includes('phone')) return this.persona.phone;
    if (d.includes('business') || d.includes('company')) return this.businessDetails.businessName;
    if (d.includes('address') || d.includes('street')) return this.persona.address?.street || '123 Main Street';
    if (d.includes('city')) return this.persona.address?.city || 'Las Vegas';
    if (d.includes('zip') || d.includes('postal')) return this.persona.address?.zip || '89101';
    if (d.includes('state')) return this.persona.state;
    if (d.includes('password')) return this.persona.password || 'TestPass123!';

    return null;
  }

  /**
   * Fill a form field - tries multiple strategies
   * Automatically uses persona data when value not specified
   */
  async fill(fieldDescription, value = null) {
    // Auto-detect value from persona if not provided
    const actualValue = value || this.getPersonaValue(fieldDescription);
    if (!actualValue) {
      console.log(`\n📝 Fill: ${fieldDescription} - No value found`);
      return false;
    }

    console.log(`\n📝 Fill: ${fieldDescription} = "${actualValue}"`);
    const stepStart = Date.now();

    // Strategy 1: Stagehand act
    try {
      await this.stagehand.act(`Type "${actualValue}" into the ${fieldDescription} field`);
      console.log(`   ✅ Filled via Stagehand (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 2: Direct Playwright with common selectors
    const selectors = this.getSelectorsForField(fieldDescription);
    for (const selector of selectors) {
      try {
        await this.page.fill(selector, actualValue, { timeout: 2000 });
        console.log(`   ✅ Filled via selector: ${selector} (${Date.now() - stepStart}ms)`);
        return true;
      } catch (e) {
        continue;
      }
    }

    console.log(`   ❌ Could not fill ${fieldDescription}`);
    return false;
  }

  /**
   * Get likely selectors for a field description
   */
  getSelectorsForField(description) {
    const d = description.toLowerCase();
    const selectors = [];

    if (d.includes('email')) {
      selectors.push('input[type="email"]', 'input[name*="email"]', '[placeholder*="email" i]');
    }
    if (d.includes('password')) {
      selectors.push('input[type="password"]', 'input[name*="password"]');
    }
    if (d.includes('first name')) {
      selectors.push('input[name*="first"]', '[placeholder*="first" i]');
    }
    if (d.includes('last name')) {
      selectors.push('input[name*="last"]', '[placeholder*="last" i]');
    }
    if (d.includes('phone')) {
      selectors.push('input[type="tel"]', 'input[name*="phone"]', '[placeholder*="phone" i]');
    }
    if (d.includes('business') || d.includes('company')) {
      selectors.push('input[name*="business"]', 'input[name*="company"]', '[placeholder*="business" i]');
    }
    if (d.includes('address') || d.includes('street')) {
      selectors.push('input[name*="address"]', 'input[name*="street"]', '[placeholder*="address" i]');
    }
    if (d.includes('city')) {
      selectors.push('input[name*="city"]', '[placeholder*="city" i]');
    }
    if (d.includes('zip') || d.includes('postal')) {
      selectors.push('input[name*="zip"]', 'input[name*="postal"]', '[placeholder*="zip" i]');
    }
    if (d.includes('card')) {
      selectors.push('input[name*="card"]', 'input[name*="number"]', '[placeholder*="card" i]');
    }
    if (d.includes('cvv') || d.includes('cvc')) {
      selectors.push('input[name*="cvv"]', 'input[name*="cvc"]', '[placeholder*="cvv" i]');
    }

    // Generic fallback
    selectors.push('input:visible', 'textarea:visible');

    return selectors;
  }

  /**
   * Select from dropdown
   */
  async select(fieldDescription, value) {
    console.log(`\n📋 Select: ${fieldDescription} = "${value}"`);
    const stepStart = Date.now();

    // Strategy 1: Stagehand act
    try {
      await this.stagehand.act(`Select "${value}" from the ${fieldDescription} dropdown`);
      console.log(`   ✅ Selected via Stagehand (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Continue
    }

    // Strategy 2: Click dropdown then click option
    try {
      await this.stagehand.act(`Click on the ${fieldDescription} dropdown to open it`);
      await this.wait(500);
      await this.stagehand.act(`Click on the "${value}" option`);
      console.log(`   ✅ Selected via click sequence (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Continue
    }

    // Strategy 3: Native select
    try {
      await this.page.selectOption('select', { label: value });
      console.log(`   ✅ Selected via native select (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Continue
    }

    console.log(`   ❌ Could not select ${value}`);
    return false;
  }

  /**
   * Click a button or link
   */
  async click(description) {
    console.log(`\n🖱️  Click: ${description}`);
    const stepStart = Date.now();

    try {
      await this.stagehand.act(`Click the ${description}`);
      console.log(`   ✅ Clicked (${Date.now() - stepStart}ms)`);
      await this.wait(200);
      return true;
    } catch (e) {
      console.log(`   ❌ Click failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Quick click on common CTA buttons - tries direct selectors first for speed
   */
  async clickCTA() {
    console.log(`\n🖱️  Click: Continue/Next button`);
    const stepStart = Date.now();

    // Try direct selectors first (fastest)
    const ctaSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Get started")',
      'button:has-text("Create account")',
      'button:has-text("Submit")',
      '[data-testid*="continue"]',
      '[data-testid*="submit"]',
      'button[type="submit"]',
      '.btn-primary',
      'button.primary'
    ];

    for (const selector of ctaSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log(`   ✅ Clicked via selector: ${selector} (${Date.now() - stepStart}ms)`);
          await this.wait(200);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback to Stagehand
    try {
      await this.stagehand.act('Click the Continue or Next button');
      console.log(`   ✅ Clicked via Stagehand (${Date.now() - stepStart}ms)`);
      await this.wait(200);
      return true;
    } catch (e) {
      console.log(`   ❌ CTA click failed: ${e.message}`);
      return false;
    }
  }

  /**
   * Use Claude Haiku to decide what to do next
   */
  async decideNextAction() {
    const screenshot = await this.page.screenshot({ type: 'png' });
    const base64 = screenshot.toString('base64');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64 }
          },
          {
            type: 'text',
            text: `ZenBusiness form automation. DATA: ${this.persona.firstName} ${this.persona.lastName}, ${this.persona.email}, ${this.persona.phone}, ${this.persona.state}, ${this.businessDetails.businessName}

Next action? JSON only: {"action":"click|fill|select|wait|done","target":"element","value":"data"}
- fill: use exact data above
- click: for Continue/Next/Submit buttons
- done: if on payment/checkout
- wait: if CAPTCHA`
          }
        ]
      }]
    });

    try {
      const text = response.content[0].text;
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return json;
    } catch {
      return { action: 'wait', target: 'page' };
    }
  }

  /**
   * Run the full LLC formation flow using Stagehand agent mode
   */
  async runLLCFormation() {
    console.log('\n' + '='.repeat(60));
    console.log('🏢 Starting LLC Formation Flow');
    console.log('='.repeat(60));
    console.log(`Business: ${this.businessDetails.businessName}`);
    console.log(`State: ${this.persona.state}`);
    console.log(`Email: ${this.persona.email}`);
    console.log(`Name: ${this.persona.fullName}`);
    console.log('='.repeat(60) + '\n');

    try {
      // Step 1: Navigate
      await this.goto('https://www.dev.zenbusiness.com');

      // Handle CAPTCHA
      await this.waitForCaptcha();

      // Try agent mode first for autonomous navigation
      if (this.agent) {
        return await this.runWithAgentMode();
      }

      // Fallback to step-by-step mode
      return await this.runStepByStep();

    } catch (error) {
      console.error('\n❌ Flow failed:', error.message);
      return { success: false, error: error.message, steps: this.stepLog.length };
    }
  }

  /**
   * Run using Stagehand's autonomous agent mode
   */
  async runWithAgentMode() {
    console.log('\n🤖 Running in AGENT MODE (autonomous navigation)\n');

    const instruction = `Complete the ZenBusiness LLC formation flow using this data:

- State: ${this.persona.state}
- Business Name: ${this.businessDetails.businessName}
- First Name: ${this.persona.firstName}
- Last Name: ${this.persona.lastName}
- Email: ${this.persona.email}
- Phone: ${this.persona.phone}

For each page:
1. Fill any form fields with the data above
2. Select appropriate options (e.g., "No" for existing business, first option for experience questions)
3. Click the button to proceed to the next page (Continue, Next, Submit, etc.)

STOP when you reach a package selection, pricing, or payment page.
STOP if you encounter a CAPTCHA.`;

    try {
      const result = await this.agent.execute({
        instruction,
        maxSteps: 50,
        onStep: async (step) => {
          console.log(`   📍 Step ${step.stepNumber}: ${step.action || step.description || 'executing...'}`);
          this.stepLog.push({
            action: step.action || step.description,
            success: true,
            stepNumber: step.stepNumber
          });

          // Check for CAPTCHA after each step
          if (await this.isOnCaptcha()) {
            console.log('\n   ⏸️ CAPTCHA detected - waiting for manual completion...');
            await this.waitForCaptcha();
          }
        }
      });

      console.log('\n✅ Agent mode completed!');
      console.log(`   Final URL: ${this.page.url()}`);

      return {
        success: true,
        steps: this.stepLog.length,
        finalUrl: this.page.url(),
        agentResult: result
      };
    } catch (error) {
      console.log(`\n⚠️ Agent mode error: ${error.message}`);
      console.log('   Falling back to step-by-step mode...\n');
      return await this.runStepByStep();
    }
  }

  /**
   * Wait for page to change or stabilize
   */
  async waitForNavigation(timeout = 3000) {
    const startUrl = this.page.url();
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await this.wait(300);
      if (this.page.url() !== startUrl) {
        console.log(`   📍 Navigated to: ${this.page.url()}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Run using step-by-step commands - follows known ZenBusiness flow
   */
  async runStepByStep() {
    console.log('\n📋 Running in STEP-BY-STEP MODE\n');

    // Step 1: Start the flow
    console.log('📍 Current URL:', this.page.url());
    await this.act('Click the "Get started" button');
    await this.waitForNavigation();
    await this.waitForCaptcha();

    // Step 2: Select state
    console.log('📍 Current URL:', this.page.url());
    await this.select('state', this.persona.state);
    await this.clickCTA();
    await this.waitForNavigation();
    await this.waitForCaptcha();

    // Step 3: Enter business name (retry if needed)
    console.log('📍 Current URL:', this.page.url());
    let filled = await this.fill('business name', this.businessDetails.businessName);
    if (!filled) {
      // Try alternative selectors
      await this.act(`Type "${this.businessDetails.businessName}" into the business name input field`);
    }
    await this.clickCTA();
    await this.waitForNavigation();
    await this.waitForCaptcha();

    // Step 4: Check current page and handle accordingly
    console.log('📍 Current URL:', this.page.url());
    const url = this.page.url();

    // Handle different page types based on URL
    if (url.includes('existing-business') || url.includes('designator')) {
      await this.act('Click "No" or select that this is a new business');
      await this.clickCTA();
      await this.waitForNavigation();
    }

    // Step 5: Account creation (if on sign-up page)
    console.log('📍 Current URL:', this.page.url());
    if (this.page.url().includes('sign-up') || this.page.url().includes('account') || this.page.url().includes('register')) {
      await this.fill('email', this.persona.email);
      await this.fill('password', this.persona.password);
      await this.clickCTA();
      await this.waitForNavigation();
      await this.waitForCaptcha();
    }

    // Step 6: Contact info (if on contact page)
    console.log('📍 Current URL:', this.page.url());
    if (this.page.url().includes('contact')) {
      await this.fill('first name', this.persona.firstName);
      await this.fill('last name', this.persona.lastName);
      await this.fill('email', this.persona.email);
      await this.fill('phone', this.persona.phone);
      await this.clickCTA();
      await this.waitForNavigation();
      await this.waitForCaptcha();
    }

    // Continue with dynamic steps for remaining pages
    let maxSteps = 10;
    let stepCount = 0;
    let lastUrl = this.page.url();

    while (stepCount < maxSteps) {
      stepCount++;
      await this.waitForCaptcha();

      const currentUrl = this.page.url();
      console.log(`\n🔍 Step ${stepCount}: URL = ${currentUrl}`);

      // Check if we've reached end states
      if (currentUrl.includes('checkout') || currentUrl.includes('payment') ||
          currentUrl.includes('cart') || currentUrl.includes('package') ||
          currentUrl.includes('pricing')) {
        console.log('   🛑 Reached checkout/package page - stopping');
        break;
      }

      // Handle known page types directly
      if (currentUrl.includes('business-name')) {
        console.log('   📝 Business name page - filling...');
        await this.fill('business name', this.businessDetails.businessName);
        await this.clickCTA();
        await this.waitForNavigation(3000);
        lastUrl = this.page.url();
        continue;
      }

      if (currentUrl.includes('contact-info')) {
        console.log('   📝 Contact info page - filling...');
        await this.fill('first name', this.persona.firstName);
        await this.fill('last name', this.persona.lastName);
        await this.fill('email', this.persona.email);
        await this.fill('phone', this.persona.phone);
        await this.clickCTA();
        await this.waitForNavigation(3000);
        lastUrl = this.page.url();
        continue;
      }

      if (currentUrl.includes('existing-business') || currentUrl.includes('designator')) {
        console.log('   📝 Existing business question - selecting No...');
        await this.act('Click "No" or the option indicating this is a new business');
        await this.clickCTA();
        await this.waitForNavigation(3000);
        lastUrl = this.page.url();
        continue;
      }

      if (currentUrl.includes('business-experience') || currentUrl.includes('business-stage')) {
        console.log('   📝 Business experience page - selecting first option...');
        await this.act('Click the first option or "Just getting started" or similar beginner option');
        await this.clickCTA();
        await this.waitForNavigation(3000);
        lastUrl = this.page.url();
        continue;
      }

      // Unknown page - use AI to analyze
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('   🆕 Unknown page - analyzing with AI...');
      } else {
        console.log('   ⚠️ Stuck on page - analyzing with AI...');
      }

      const decision = await this.decideNextAction();
      console.log(`   Decision: ${JSON.stringify(decision)}`);

      if (decision.action === 'done') {
        break;
      } else if (decision.action === 'fill' && typeof decision.value === 'string') {
        await this.fill(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'select' && typeof decision.value === 'string') {
        await this.select(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'click') {
        await this.click(decision.target);
        await this.clickCTA(); // Always click Continue after selecting an option
      } else {
        // Default: try to click Continue
        await this.clickCTA();
      }
      await this.waitForNavigation(2000);
    }

    const finalUrl = this.page.url();
    console.log('\n✅ Step-by-step flow completed!');
    console.log(`📍 Final URL: ${finalUrl}`);
    return { success: true, steps: this.stepLog.length, finalUrl };
  }

  /**
   * Cleanup
   */
  async close() {
    if (this.stagehand) {
      await this.stagehand.close();
    }
    console.log(`\n📊 Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    console.log(`   Steps executed: ${this.stepLog.length}`);
  }
}
