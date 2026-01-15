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

    // Initialize Stagehand in LOCAL mode with OpenAI GPT-4o-mini (cheaper, still good for browser actions)
    this.stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o-mini',
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
        modelName: 'gpt-4o-mini',
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY
        }
      });
      console.log('   ✅ Stagehand agent mode enabled (GPT-4o-mini)');
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
   * Fast action using Stagehand's act() - with retry logic for empty responses
   */
  async act(instruction, maxRetries = 3) {
    const stepStart = Date.now();
    console.log(`\n🎯 Action: ${instruction}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        const isEmptyResponse = e.message.includes('No object generated') ||
                               e.message.includes('response did not match schema') ||
                               e.message.includes('empty');

        if (isEmptyResponse && attempt < maxRetries) {
          console.log(`   ⚠️ Empty response (attempt ${attempt}/${maxRetries}) - retrying...`);
          await this.wait(500); // Brief pause before retry
          continue;
        }

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
    return false;
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
    if (d.includes('password')) return 'cakeroofQ1!';
    if (d.includes('card') && d.includes('number')) return '4242424242424242';
    if (d.includes('expir') || d.includes('exp date') || d.includes('mm/yy')) return '12/28';
    if (d.includes('cvv') || d.includes('cvc') || d.includes('security code')) return '123';

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
   * Try to click checkout-specific buttons directly (bypassing AI)
   */
  async tryCheckoutButtons() {
    const checkoutSelectors = [
      'button:has-text("Save and continue")',
      'button:has-text("Place Order")',
      'button:has-text("Complete Purchase")',
      'button:has-text("Submit Order")',
      'button:has-text("Pay Now")',
      '[data-testid*="checkout"] button[type="submit"]',
      'form button[type="submit"]',
      '.checkout button.primary',
      'button.checkout-btn'
    ];

    for (const selector of checkoutSelectors) {
      try {
        const btn = await this.page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log(`   ✅ Clicked checkout button: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  /**
   * Try to select county from dropdown (required for some states like NY, TX)
   */
  async trySelectCounty() {
    // Common county dropdown selectors
    const countyDropdownSelectors = [
      'select[name*="county"]',
      'select[id*="county"]',
      '[data-testid*="county"] select',
      'select[aria-label*="county" i]',
      '.county-select select',
      // Custom dropdown patterns
      '[class*="county"] [role="combobox"]',
      '[class*="county"] [role="listbox"]',
      'button:has-text("Select county")',
      'button:has-text("Select your county")',
      '[placeholder*="county" i]'
    ];

    for (const selector of countyDropdownSelectors) {
      try {
        const dropdown = await this.page.$(selector);
        if (dropdown && await dropdown.isVisible()) {
          console.log(`   📍 Found county dropdown: ${selector}`);

          // If it's a native select, get options and select first non-empty one
          const tagName = await dropdown.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'select') {
            const options = await dropdown.$$('option');
            for (const option of options) {
              const value = await option.getAttribute('value');
              const text = await option.textContent();
              if (value && value !== '' && !text.toLowerCase().includes('select')) {
                await dropdown.selectOption({ value });
                console.log(`   ✅ Selected county: ${text}`);
                return true;
              }
            }
          } else {
            // Custom dropdown - click to open, then click first option
            await dropdown.click();
            await this.wait(500);

            // Try to find and click first option
            const optionSelectors = [
              '[role="option"]:not([aria-disabled="true"])',
              'li:not(.disabled)',
              '.dropdown-item',
              '[class*="option"]'
            ];

            for (const optSel of optionSelectors) {
              const options = await this.page.$$(optSel);
              for (const opt of options) {
                const text = await opt.textContent();
                if (text && !text.toLowerCase().includes('select') && await opt.isVisible()) {
                  await opt.click();
                  console.log(`   ✅ Selected county: ${text}`);
                  return true;
                }
              }
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: Use AI to detect and select county
    try {
      console.log('   🤖 Trying AI for county selection...');
      await this.act('If there is a county dropdown visible, click it and select the first available county option');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Try to select a package option directly (bypassing AI)
   */
  async trySelectPackage(packageName) {
    const pkgLower = packageName.toLowerCase();
    const pkgUpper = packageName.toUpperCase();

    // Package card/button selectors
    const packageSelectors = [
      // Text-based selectors
      `button:has-text("${pkgUpper}")`,
      `button:has-text("${pkgLower}")`,
      `[class*="package"]:has-text("${pkgUpper}") button`,
      `[class*="plan"]:has-text("${pkgUpper}") button`,
      `[class*="tier"]:has-text("${pkgUpper}") button`,
      // Card-based selectors
      `[data-package="${pkgLower}"]`,
      `[data-plan="${pkgLower}"]`,
      `[data-tier="${pkgLower}"]`,
      // Radio/checkbox selectors
      `input[value="${pkgLower}"]`,
      `input[value="${pkgUpper}"]`,
      `label:has-text("${pkgUpper}") input`,
      // Generic card click
      `[class*="${pkgLower}"]`,
      `.${pkgLower}-package`,
      `.${pkgLower}-plan`
    ];

    for (const selector of packageSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          console.log(`   ✅ Selected package via: ${selector}`);
          await this.wait(500);

          // After selecting package, try to click Continue/Select button
          const continueSelectors = [
            'button:has-text("Continue")',
            'button:has-text("Select")',
            'button:has-text("Choose")',
            'button[type="submit"]'
          ];

          for (const contSel of continueSelectors) {
            try {
              const contBtn = await this.page.$(contSel);
              if (contBtn && await contBtn.isVisible()) {
                await contBtn.click();
                console.log(`   ✅ Clicked continue button: ${contSel}`);
                return true;
              }
            } catch (e) {
              continue;
            }
          }
          return true; // Package selected even if continue not found
        }
      } catch (e) {
        continue;
      }
    }

    return false;
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
            text: `ZenBusiness form automation. Analyze the page and tell me what action to take.

DATA TO USE:
- Name: ${this.persona.firstName} ${this.persona.lastName}
- Email: ${this.persona.email}
- Phone: ${this.persona.phone}
- State: ${this.persona.state}
- Business: ${this.businessDetails.businessName}
- Card: 4242424242424242, Exp 12/28, CVV 123
- Password: cakeroofQ1!

IMPORTANT: Look for error messages or required fields that are empty. If you see a validation error like "County is required" or "Field is required", tell me to fill that specific field.

Return JSON: {"action":"click|fill|select","target":"element description","value":"data to enter"}

Examples:
- {"action":"select","target":"county dropdown","value":"Albany"}
- {"action":"fill","target":"business name field","value":"My Business"}
- {"action":"click","target":"No thanks button","value":null}

Do NOT return {"action":"wait"} - always return a concrete action to take.`
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

      // Run step-by-step mode first (faster, more reliable)
      // Agent mode is used as fallback for unknown pages
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

    // Get test goals and upsell instructions
    const testGoals = this.persona.testGoals || { packagePreference: 'starter', upsellStrategy: 'decline_all', agentInstructions: 'DECLINE all upsells' };

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

CHECKOUT INSTRUCTIONS:
${testGoals.agentInstructions}

Continue through checkout using:
- Test Card: 4242 4242 4242 4242
- Expiry: 12/28
- CVV: 123
- Password: cakeroofQ1!

STOP after order confirmation or if you encounter a CAPTCHA.`;

    let lastAgentUrl = this.page.url();
    let agentStepCount = 0;

    try {
      const result = await this.agent.execute({
        instruction,
        maxSteps: 50,
        onStep: async (step) => {
          agentStepCount++;
          const currentUrl = this.page.url();
          const urlChanged = currentUrl !== lastAgentUrl;

          // Build step description from available properties
          const stepInfo = step.text || step.action || step.description || step.type || 'executing...';

          // Log step with URL context
          if (urlChanged) {
            console.log(`\n   📍 Step ${agentStepCount}: ${stepInfo}`);
            console.log(`      🔗 URL: ${currentUrl}`);
            lastAgentUrl = currentUrl;
          } else {
            console.log(`   📍 Step ${agentStepCount}: ${stepInfo}`);
          }

          // Log additional step details if available
          if (step.element) {
            console.log(`      🎯 Element: ${step.element}`);
          }
          if (step.value) {
            console.log(`      📝 Value: ${step.value}`);
          }

          this.stepLog.push({
            stepNumber: agentStepCount,
            action: stepInfo,
            url: currentUrl,
            success: true,
            timestamp: Date.now()
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
      console.log(`   Total steps: ${agentStepCount}`);

      return {
        success: true,
        steps: agentStepCount,
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

    // Continue with dynamic steps for remaining pages (high limit to reach dashboard)
    let maxSteps = 50;
    let stepCount = 0;
    let stuckCount = 0; // Track how many times we've been stuck on same URL
    let urlAtStepStart = ''; // Track URL at start of step to detect if we made progress
    let lastLoggedUrl = ''; // Track last URL for unknown page logging

    while (stepCount < maxSteps) {
      stepCount++;
      await this.waitForCaptcha();

      const currentUrl = this.page.url();
      console.log(`\n🔍 Step ${stepCount}: URL = ${currentUrl}`);

      // Stuck detection - fail after X attempts on same URL
      // Checkout gets more attempts since it has multiple sections at same URL
      const isCheckout = currentUrl.includes('checkout');
      const maxStuckAttempts = isCheckout ? 10 : 5;

      if (currentUrl === urlAtStepStart) {
        stuckCount++;
        console.log(`   ⚠️ Same URL as last step (attempt ${stuckCount}/${maxStuckAttempts})`);
        if (stuckCount >= maxStuckAttempts) {
          console.log(`\n❌ STUCK: Failed same page ${maxStuckAttempts} times. Stopping test.`);
          console.log(`   URL: ${currentUrl}`);
          console.log(`   Likely missing a required field or handler for this page.`);
          break;
        }
      } else {
        stuckCount = 0; // Reset counter when URL changes
      }
      urlAtStepStart = currentUrl; // Remember URL at start of this step

      // Check if we've reached end states (order confirmation or dashboard)
      if (currentUrl.includes('confirmation') || currentUrl.includes('thank-you') ||
          currentUrl.includes('success') || currentUrl.includes('order-complete') ||
          currentUrl.includes('dashboard') || currentUrl.includes('my-account')) {
        const testGoals = this.persona.testGoals || {};

        // If banking goal, look for banking application after confirmation
        if (testGoals.postCheckout?.applyForBanking) {
          console.log('   ✅ Order confirmed - looking for banking application...');
          await this.wait(2000);
          try {
            await this.act('Click on "Apply for Banking" or "Open Bank Account" or "Get Started with Banking" button');
            await this.waitForNavigation(3000);
            lastLoggedUrl = this.page.url();
            continue; // Continue to banking application
          } catch (e) {
            console.log('   ⚠️ No banking application link found on confirmation page');
          }
        }

        console.log('   ✅ Reached order confirmation - flow complete!');
        break;
      }

      // Banking application page (post-checkout)
      if (currentUrl.includes('banking-application') || currentUrl.includes('bank-account') ||
          currentUrl.includes('open-account')) {
        console.log('   🏦 Banking application page - filling application...');
        // Fill banking application fields
        await this.fill('business name', this.businessDetails.businessName);
        await this.fill('email', this.persona.email);
        await this.fill('phone', this.persona.phone);
        await this.fill('address', this.persona.address?.street || '123 Main Street');
        await this.fill('city', this.persona.address?.city || 'Austin');
        await this.fill('zip', this.persona.address?.zip || '78701');
        await this.act('Click Submit or Continue to submit the banking application');
        await this.waitForNavigation(3000);
        continue;
      }

      // Handle known page types directly

      // Business state page - may require county for some states (NY, TX, etc.)
      if (currentUrl.includes('business-state') && !currentUrl.includes('business-name')) {
        console.log('   🗺️ Business state page - handling...');

        // Strategy 1: Try direct county dropdown selectors
        const countySelected = await this.trySelectCounty();
        if (countySelected) {
          console.log('   ✅ County selected');
        }

        // Click Continue
        await this.clickCTA();
        await this.waitForNavigation(3000);
        continue;
      }

      if (currentUrl.includes('business-name')) {
        console.log('   📝 Business name page - filling...');
        await this.fill('business name', this.businessDetails.businessName);
        await this.clickCTA();
        await this.waitForNavigation(3000);
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
        continue;
      }

      if (currentUrl.includes('existing-business') || currentUrl.includes('designator')) {
        console.log('   📝 Existing business question - selecting No...');
        await this.act('Click "No" or the option indicating this is a new business');
        await this.clickCTA();
        await this.waitForNavigation(3000);
        continue;
      }

      if (currentUrl.includes('business-experience') || currentUrl.includes('business-stage')) {
        console.log('   📝 Business experience page - selecting first option...');
        await this.act('Click the first option or "Just getting started" or similar beginner option');
        await this.clickCTA();
        await this.waitForNavigation(3000);
        continue;
      }

      // Industry page - skip it
      if (currentUrl.includes('industry')) {
        console.log('   🏭 Industry page - skipping...');
        await this.act('Click "Skip for now" or "Skip" link');
        await this.waitForNavigation(3000);
        continue;
      }

      // Worry-free compliance upsell
      if (currentUrl.includes('worry-free-compliance') || currentUrl.includes('compliance')) {
        const testGoals = this.persona.testGoals || { upsells: { complianceMonitoring: false } };
        const shouldBuy = testGoals.upsells?.complianceMonitoring;
        console.log(`   🛡️ Compliance upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Yes" or "Add Worry-Free Compliance" or select the compliance option');
        } else {
          await this.act('Click "No thanks" or "Skip" or "Continue without" to decline compliance');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // EIN (Employer Identification Number) upsell
      if (currentUrl.includes('employer-identification-number') || currentUrl.includes('ein')) {
        const testGoals = this.persona.testGoals || { upsells: { einService: false } };
        const shouldBuy = testGoals.upsells?.einService;
        console.log(`   🔢 EIN upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Yes" or "Add EIN" or "Get my EIN" to accept EIN service');
        } else {
          await this.act('Click "No thanks" or "Skip" or "I\'ll do it myself" to decline EIN service');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Money Pro / Financial services upsell
      if (currentUrl.includes('money-pro') || currentUrl.includes('money')) {
        console.log('   💵 Money Pro upsell - DECLINING...');
        await this.act('Click "No thanks" or "Skip" or "Continue without" to decline Money Pro');
        await this.waitForNavigation(3000);
        continue;
      }

      // Operating Agreement upsell
      if (currentUrl.includes('operating-agreement')) {
        const testGoals = this.persona.testGoals || { upsells: { operatingAgreement: false } };
        const shouldBuy = testGoals.upsells?.operatingAgreement;
        console.log(`   📄 Operating Agreement upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Yes" or "Add Operating Agreement" or "Include" to accept');
        } else {
          await this.act('Click "No thanks" or "Skip" or "Continue without" to decline operating agreement');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Package selection page - select based on test goals
      if (currentUrl.includes('package-selection') || currentUrl.includes('pricing') || currentUrl.includes('packages')) {
        const testGoals = this.persona.testGoals || { packagePreference: 'starter' };
        const pkg = testGoals.packagePreference.toUpperCase();
        console.log(`   💰 Package selection page - selecting ${pkg} package...`);

        // Try direct selectors first
        const packageSelected = await this.trySelectPackage(pkg);
        if (!packageSelected) {
          // Fallback to AI
          await this.act(`Click on the "${pkg}" package option, then click Continue or Select`);
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Registered agent upsell
      if (currentUrl.includes('registered-agent')) {
        const testGoals = this.persona.testGoals || { upsells: { registeredAgent: true } };
        const shouldBuy = testGoals.upsells?.registeredAgent !== false; // Default to true
        console.log(`   📋 Registered agent page - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Appoint ZenBusiness" or "Yes" or select ZenBusiness as registered agent');
        } else {
          await this.act('Click "I\'ll be my own" or "No thanks" or decline registered agent service');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Upsell pages - handle based on test goals
      if (currentUrl.includes('rush-filing') || currentUrl.includes('rush')) {
        const testGoals = this.persona.testGoals || { upsells: { rushFiling: false } };
        const shouldBuy = testGoals.upsells?.rushFiling;
        console.log(`   ⚡ Rush filing upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Yes" or "Add rush filing" or select the rush option');
        } else {
          await this.act('Click "No thanks" or "Skip" or "Continue without rush filing"');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Banking upsell - special handling for ZenBusiness Banking
      if (currentUrl.includes('banking') || currentUrl.includes('bank')) {
        const testGoals = this.persona.testGoals || { upsells: { businessBanking: false } };
        const shouldBuy = testGoals.upsells?.businessBanking || testGoals.primaryGoal === 'banking';
        console.log(`   🏦 Banking upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldBuy) {
          await this.act('Click "Yes" or "Add ZenBusiness Banking" or "Get Banking" to accept banking');
        } else {
          await this.act('Click "No thanks" or "Skip" or "Continue without banking"');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Generic upsell handling
      if (currentUrl.includes('upsell') || currentUrl.includes('add-on') || currentUrl.includes('upgrade')) {
        const testGoals = this.persona.testGoals || { upsellStrategy: 'decline_all' };
        const shouldAccept = testGoals.upsellStrategy === 'accept_all';
        console.log(`   🛒 Upsell page - ${shouldAccept ? 'ACCEPTING' : 'DECLINING'}...`);
        if (shouldAccept) {
          await this.act('Click "Yes" or "Add" to accept this offer');
        } else {
          await this.act('Click "No thanks" or "Skip" or "Continue without" to decline this offer');
        }
        await this.waitForNavigation(3000);
        continue;
      }

      // Account creation page
      if (currentUrl.includes('sign-up') || currentUrl.includes('create-account') || currentUrl.includes('register')) {
        console.log('   👤 Account creation page - filling credentials...');
        await this.fill('email', this.persona.email);
        await this.fill('password', 'cakeroofQ1!');
        await this.clickCTA();
        await this.waitForNavigation(3000);
        await this.waitForCaptcha();
        continue;
      }

      // Checkout page - multi-step: account info, address, then payment
      if (currentUrl.includes('checkout')) {
        console.log('   💳 Checkout page - using AI to analyze section...');

        // Use Claude Haiku to figure out what section we're on and what to do
        const checkoutDecision = await this.decideNextAction();
        console.log(`   🤖 Checkout AI Decision: ${JSON.stringify(checkoutDecision)}`);

        let didFill = false;

        if (checkoutDecision.action === 'fill' && checkoutDecision.target && checkoutDecision.value) {
          // AI found a field to fill
          await this.fill(checkoutDecision.target, checkoutDecision.value);
          didFill = true;
        } else if (checkoutDecision.action === 'select' && checkoutDecision.target && checkoutDecision.value) {
          await this.select(checkoutDecision.target, checkoutDecision.value);
          didFill = true;
        } else if (checkoutDecision.action === 'click' && checkoutDecision.target) {
          // Check if it's a button to proceed
          const target = checkoutDecision.target.toLowerCase();
          if (target.includes('save') || target.includes('continue') || target.includes('place order') || target.includes('submit')) {
            console.log('   🔘 Clicking proceed button...');
            await this.act(`Click the "${checkoutDecision.target}" button`);
            await this.wait(3000); // Wait for section transition
          } else {
            await this.act(`Click "${checkoutDecision.target}"`);
          }
        } else {
          // AI didn't give useful response - try common checkout buttons directly
          console.log('   🔘 AI unclear - trying direct button click...');
          didFill = true; // Force button click attempt
        }

        // After filling, always try to click the submit button
        if (didFill) {
          console.log('   🔘 Trying to submit after fill...');
          const clicked = await this.tryCheckoutButtons();
          if (!clicked) {
            // Try Stagehand as fallback
            try {
              await this.act('Click the "Save and continue" or "Submit" button to proceed');
            } catch (e) {
              // Button click failed, will retry on next iteration
            }
          }
        }
        await this.wait(1000);
        continue;
      }

      // Unknown page - use AI to analyze and log for future handler creation
      const urlPath = new URL(currentUrl).pathname;
      if (currentUrl !== lastLoggedUrl) {
        lastLoggedUrl = currentUrl;
        console.log(`   🆕 UNKNOWN PAGE: ${urlPath}`);
        console.log('      ⚡ Using AI fallback - add handler for faster future runs');
      } else {
        console.log(`   ⚠️ STUCK on: ${urlPath} - analyzing with AI...`);
      }

      const decision = await this.decideNextAction();
      console.log(`   🤖 AI Decision: ${JSON.stringify(decision)}`);

      // Track unknown pages for learning
      if (!this.unknownPages) this.unknownPages = [];
      this.unknownPages.push({
        url: currentUrl,
        urlPath,
        decision,
        timestamp: Date.now()
      });

      // Handle AI decision
      if (decision.action === 'done') {
        break;
      } else if (decision.action === 'fill' && decision.target && decision.value) {
        await this.fill(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'select' && decision.target && decision.value) {
        await this.select(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'click' && decision.target) {
        await this.click(decision.target);
      } else if (decision.action === 'wait' || !decision.action) {
        // AI returned unhelpful response - try to find and fill any visible required field
        console.log('   ⚠️ AI returned no actionable response - trying to find required fields...');
        try {
          await this.act('Look for any field with a validation error or "required" message and fill it with appropriate data');
        } catch (e) {
          // If that fails, just try clicking Continue
          await this.clickCTA();
        }
      } else {
        // Default: try to click Continue
        await this.clickCTA();
      }
      await this.waitForNavigation(2000);
    }

    const finalUrl = this.page.url();
    console.log('\n✅ Step-by-step flow completed!');
    console.log(`📍 Final URL: ${finalUrl}`);

    // Report unknown pages that need handlers
    if (this.unknownPages && this.unknownPages.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('📝 LEARNINGS: Add these handlers for faster future runs');
      console.log('='.repeat(60));
      const uniquePages = [...new Map(this.unknownPages.map(p => [p.urlPath, p])).values()];
      for (const page of uniquePages) {
        console.log(`\n   URL Pattern: "${page.urlPath.split('/').pop()}"`);
        console.log(`   AI Action: ${page.decision.action}`);
        if (page.decision.target) console.log(`   Target: ${page.decision.target}`);
        if (page.decision.value) console.log(`   Value: ${page.decision.value}`);
        console.log(`   Suggested handler:`);
        console.log(`      if (currentUrl.includes('${page.urlPath.split('/').pop()}')) {`);
        if (page.decision.action === 'click') {
          console.log(`        await this.act('Click "${page.decision.target}"');`);
        } else if (page.decision.action === 'fill') {
          console.log(`        await this.fill('${page.decision.target}', '${page.decision.value}');`);
        } else if (page.decision.action === 'select') {
          console.log(`        await this.select('${page.decision.target}', '${page.decision.value}');`);
        }
        console.log(`        await this.waitForNavigation(3000);`);
        console.log(`      }`);
      }
      console.log('='.repeat(60));
    }

    return { success: true, steps: this.stepLog.length, finalUrl, unknownPages: this.unknownPages };
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
