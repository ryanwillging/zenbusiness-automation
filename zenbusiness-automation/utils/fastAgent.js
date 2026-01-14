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

    // Initialize Stagehand in LOCAL mode with Anthropic Claude Haiku (faster, higher rate limits)
    this.stagehand = new Stagehand({
      env: 'LOCAL',
      model: {
        modelName: 'anthropic/claude-haiku-4-5-20251001',
        apiKey: process.env.ANTHROPIC_API_KEY
      },
      enableCaching: true,
      headless: false,
      verbose: 1,
    });

    await this.stagehand.init();

    // Get page from context
    const pages = this.stagehand.context.pages();
    this.page = pages[0] || await this.stagehand.context.newPage();

    // Create Stagehand agent for autonomous navigation
    try {
      this.agent = this.stagehand.agent({
        model: 'anthropic/claude-haiku-4-5-20251001',
        instructions: this.buildAgentInstructions()
      });
      console.log('   ✅ Stagehand agent mode enabled (Haiku)');
    } catch (e) {
      console.log(`   ⚠️ Stagehand agent mode not available: ${e.message}`);
    }

    console.log('   ✅ FastAgent ready\n');
    this.startTime = Date.now();
  }

  /**
   * Build instructions for the Stagehand agent with persona and business data
   */
  buildAgentInstructions() {
    return `You are automating a ZenBusiness LLC formation flow.

PERSONA INFORMATION (use these EXACT values when filling forms):
- Full Name: ${this.persona.fullName}
- First Name: ${this.persona.firstName}
- Last Name: ${this.persona.lastName}
- Email: ${this.persona.email}
- Phone: ${this.persona.phone}
- State: ${this.persona.state}
- Address: ${this.persona.address?.street || '123 Main Street'}
- City: ${this.persona.address?.city || 'Las Vegas'}
- ZIP: ${this.persona.address?.zip || '89101'}

BUSINESS INFORMATION:
- Business Name: ${this.businessDetails.businessName}
- Business Type: ${this.businessDetails.businessType || 'LLC'}
- Industry: ${this.businessDetails.industry || 'Technology'}

IMPORTANT INSTRUCTIONS:
1. When you see a form field, fill it with the EXACT data provided above
2. For state dropdowns, select "${this.persona.state}"
3. For experience/stage questions, select reasonable default options
4. Click Continue/Next/Submit buttons to progress
5. If you see a CAPTCHA, STOP and wait (do not try to solve it)
6. Do NOT create real accounts or submit real payment information
7. Stop before any payment/checkout step

Be efficient and use the fastest method to interact with each element.`;
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
    await this.wait(1000);
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
  async waitForCaptcha(maxWait = 120000) {
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
      await this.wait(1000);
      return true;
    } catch (e) {
      console.log(`   ❌ Click failed: ${e.message}`);
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
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64 }
          },
          {
            type: 'text',
            text: `You are automating a ZenBusiness LLC formation flow.

PERSONA DATA (use these EXACT values):
- Full Name: ${this.persona.fullName}
- First Name: ${this.persona.firstName}
- Last Name: ${this.persona.lastName}
- Email: ${this.persona.email}
- Phone: ${this.persona.phone}
- State: ${this.persona.state}
- Password: ${this.persona.password || 'TestPass123!'}
- Address: ${this.persona.address?.street || '123 Main Street'}
- City: ${this.persona.address?.city || 'Las Vegas'}
- ZIP: ${this.persona.address?.zip || '89101'}

BUSINESS DATA:
- Business Name: ${this.businessDetails.businessName}

RULES:
- If there's a form field to fill, use the EXACT value from persona data above
- If there's a dropdown/select, provide the value to select
- If there's a continue/next/submit button, click it
- If on a CAPTCHA page, return action: "wait"
- If on checkout/payment page, return action: "done"
- For experience/stage questions, pick first reasonable option

What is the single next action? Respond with JSON only:
{"action": "click|fill|select|wait|done", "target": "element description", "value": "exact value for fill/select"}`
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

    const instruction = `Complete the ZenBusiness LLC formation flow with these details:
- Click "Get started" to begin
- Select state: ${this.persona.state}
- Enter business name: ${this.businessDetails.businessName}
- Select "No" if asked about existing business
- Create account with email: ${this.persona.email}
- Use password: ${this.persona.password || 'TestPass123!'}
- Fill contact info: ${this.persona.firstName} ${this.persona.lastName}, phone: ${this.persona.phone}
- For experience/business stage questions, select first reasonable option
- Continue through each step until reaching package selection or payment page
- STOP if you see a CAPTCHA - do not try to solve it
- STOP before any payment step

Do NOT submit any real payments.`;

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
   * Fallback: Run using step-by-step commands
   */
  async runStepByStep() {
    console.log('\n📋 Running in STEP-BY-STEP MODE\n');

    // Step 2: Start the flow
    await this.act('Click the "Get started" button');
    await this.waitForCaptcha();

    // Step 3: Select state
    await this.select('state', this.persona.state);
    await this.click('Continue button');
    await this.waitForCaptcha();

    // Step 4: Enter business name
    await this.fill('business name', this.businessDetails.businessName);
    await this.click('Continue button');
    await this.waitForCaptcha();

    // Dynamic steps using Haiku for decision making
    let maxSteps = 30;
    let stepCount = 0;

    while (stepCount < maxSteps) {
      stepCount++;
      await this.waitForCaptcha();

      // Use Haiku to analyze the page and decide next action
      console.log(`\n🔍 Step ${stepCount}: Analyzing page...`);
      const decision = await this.decideNextAction();
      console.log(`   Decision: ${JSON.stringify(decision)}`);

      if (decision.action === 'done') {
        console.log('   ✅ Flow appears complete');
        break;
      }

      if (decision.action === 'fill') {
        // Auto-detect value from persona if not provided
        const value = decision.value || this.getPersonaValue(decision.target);
        if (value) {
          await this.fill(decision.target, value);
        }
      } else if (decision.action === 'click') {
        await this.click(decision.target);
      } else if (decision.action === 'select') {
        const value = decision.value || this.getPersonaValue(decision.target);
        if (value) {
          await this.select(decision.target, value);
        }
      } else if (decision.action === 'wait') {
        await this.wait(2000);
      }

      await this.wait(500);

      // Check if we've reached checkout/payment
      const url = this.page.url();
      if (url.includes('checkout') || url.includes('payment') || url.includes('cart')) {
        console.log('   🛑 Reached checkout page - stopping');
        break;
      }
    }

    console.log('\n✅ Step-by-step flow completed!');
    return { success: true, steps: this.stepLog.length };
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
