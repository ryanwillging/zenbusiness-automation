/**
 * Vision-Powered Agent
 * Uses Claude's vision API to understand and interact with web pages
 */

import Anthropic from '@anthropic-ai/sdk';
import { StepCache } from './stepCache.js';
import fs from 'fs';
import path from 'path';

export class VisionAgent {
  constructor(page, persona, businessDetails, options = {}) {
    this.page = page;
    this.persona = persona;
    this.businessDetails = businessDetails;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.conversationHistory = [];
    this.stepCache = new StepCache();

    // Screenshot capture options
    this.screenshotsDir = options.screenshotsDir || null;
    this.capturedScreenshots = [];
    this.stepLog = []; // Detailed log of each step for reporting

    // Disable cache to always use AI vision
    this.useCache = options.useCache !== undefined ? options.useCache : false;

    // Track last page state to detect changes
    this.lastPageUrl = null;
    this.lastPageTitle = null;
    this.lastScreenshotHash = null;
  }

  /**
   * Ensure screenshots directory exists
   */
  ensureScreenshotsDir() {
    if (this.screenshotsDir && !fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Simple hash function for detecting screenshot changes
   */
  simpleHash(buffer) {
    let hash = 0;
    const bytes = new Uint8Array(buffer);
    // Sample every 1000th byte for speed
    for (let i = 0; i < bytes.length; i += 1000) {
      hash = ((hash << 5) - hash) + bytes[i];
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Check if page has changed since last screenshot
   */
  async hasPageChanged() {
    const url = this.page.url();
    const title = await this.page.title().catch(() => '');

    if (url !== this.lastPageUrl || title !== this.lastPageTitle) {
      return true;
    }
    return false;
  }

  /**
   * Take a screenshot and encode it as base64
   * Only saves to disk if the page has changed
   */
  async captureScreenshot(stepNumber = null) {
    const screenshot = await this.page.screenshot({
      fullPage: false,
      type: 'png'
    });

    const currentHash = this.simpleHash(screenshot);
    const pageChanged = await this.hasPageChanged() || currentHash !== this.lastScreenshotHash;

    // Update tracking
    this.lastPageUrl = this.page.url();
    this.lastPageTitle = await this.page.title().catch(() => '');
    this.lastScreenshotHash = currentHash;

    // Screenshots disabled for now - just return base64 for AI analysis
    // To re-enable, uncomment the block below
    /*
    if (this.screenshotsDir && pageChanged) {
      this.ensureScreenshotsDir();
      const timestamp = Date.now();
      const stepStr = stepNumber !== null ? `step_${String(stepNumber).padStart(3, '0')}_` : '';
      const filename = `${stepStr}${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);

      fs.writeFileSync(filepath, screenshot);
      this.capturedScreenshots.push({
        step: stepNumber,
        filename,
        filepath,
        timestamp: new Date().toISOString()
      });
      console.log(`   📸 Screenshot saved: ${filename}`);
    }
    */

    return screenshot.toString('base64');
  }

  /**
   * Get current page context
   */
  async getPageContext() {
    const url = this.page.url();
    const title = await this.page.title().catch(() => 'Unknown');

    return {
      url,
      title
    };
  }

  /**
   * Ask Claude what to do next based on current page
   */
  async decideNextAction(objective, stepNumber = null) {
    const screenshot = await this.captureScreenshot(stepNumber);
    const context = await this.getPageContext();

    // Build context about recent actions to avoid loops
    const recentActions = this.conversationHistory.slice(-6).map(h => h.content).join(' | ');

    const systemPrompt = `You are an autonomous web testing agent navigating the ZenBusiness onboarding flow.

YOUR PERSONA DATA (use these exact values when filling forms):
- Full Name: ${this.persona.fullName}
- First Name: ${this.persona.fullName.split(' ')[0]}
- Last Name: ${this.persona.fullName.split(' ').slice(1).join(' ')}
- Email: ${this.persona.email}
- Password: ${this.persona.password}
- Phone: ${this.persona.phone}
- Business Name: ${this.businessDetails.businessName}
- Business Type: ${this.persona.businessIdea}
- State: ${this.persona.state}
- Street Address: ${this.persona.address.street}
- City: ${this.persona.address.city}
- ZIP: ${this.persona.address.zip}
- Industry: ${this.persona.industry}

PAYMENT INFO (test card):
- Card Number: ${this.persona.payment.cardNumber}
- CVV: ${this.persona.payment.cvv}
- Expiry: ${this.persona.payment.expiryMonth}/${this.persona.payment.expiryYear}
- Billing ZIP: ${this.persona.payment.zip}

Current page: ${context.url}
Page title: ${context.title}

Recent actions taken: ${recentActions || 'None yet'}

YOUR JOB: Analyze the screenshot and determine the NEXT SINGLE ACTION to progress through the onboarding.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "reasoning": "What you see and why you chose this action",
  "action": "click" | "fill" | "select" | "navigate" | "wait" | "complete",
  "selector": "CSS selector to find the element",
  "value": "Value for fill/select actions (use exact persona data above)",
  "description": "Human-readable description"
}

CRITICAL RULES:

1. FOR DROPDOWNS (like state selection):
   - Use action: "select" with the EXACT value to select
   - Example for state: {"action": "select", "selector": "select", "value": "${this.persona.state}", "description": "Select state from dropdown"}
   - DO NOT just click on dropdowns repeatedly - use "select" action with the value

2. FOR TEXT INPUTS:
   - Use action: "fill" with the exact value from persona data
   - Example: {"action": "fill", "selector": "input[type='email']", "value": "${this.persona.email}", "description": "Enter email address"}

3. FOR BUTTONS:
   - Use action: "click"
   - Example: {"action": "click", "selector": "button:has-text('Continue')", "description": "Click Continue button"}

4. AVOID LOOPS:
   - If you see you've tried the same action multiple times in "Recent actions", try a DIFFERENT approach
   - If a dropdown won't open, try using "select" action directly instead of clicking

5. PRODUCT DECISIONS:
   - Accept: EIN, Registered Agent, Compliance
   - Decline: Website Builder, Logo Design, extra add-ons

6. COMPLETION:
   - If you see Velo chat, dashboard, or order confirmation, return action: "complete"

Return ONLY the JSON object, no other text.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        ...this.conversationHistory,
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot
              }
            },
            {
              type: 'text',
              text: `Objective: ${objective}\n\nWhat is the next action to take?`
            }
          ]
        }
      ],
      system: systemPrompt
    });

    // Parse the response
    const responseText = response.content[0].text;

    // Try to extract JSON from the response
    let actionDecision;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        actionDecision = JSON.parse(jsonMatch[0]);
      } else {
        actionDecision = JSON.parse(responseText);
      }
    } catch (error) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Could not parse action decision from Claude');
    }

    // Store in conversation history
    this.conversationHistory.push(
      {
        role: 'user',
        content: `Page: ${context.url}`
      },
      {
        role: 'assistant',
        content: JSON.stringify(actionDecision)
      }
    );

    return actionDecision;
  }

  /**
   * Smart fill that tries multiple strategies to find the input
   */
  async smartFill(suggestedSelector, value, description = '') {
    console.log(`   🔍 Looking for input: ${description || suggestedSelector}`);

    // Extract useful info from selector/description
    const labelText = description.toLowerCase();

    // Strategy 1: Try by label text
    const labelStrategies = [];
    if (labelText.includes('email')) labelStrategies.push(() => this.page.getByLabel(/email/i).first());
    if (labelText.includes('password')) labelStrategies.push(() => this.page.getByLabel(/password/i).first());
    if (labelText.includes('name')) labelStrategies.push(() => this.page.getByLabel(/name/i).first());
    if (labelText.includes('phone')) labelStrategies.push(() => this.page.getByLabel(/phone/i).first());
    if (labelText.includes('address')) labelStrategies.push(() => this.page.getByLabel(/address/i).first());
    if (labelText.includes('city')) labelStrategies.push(() => this.page.getByLabel(/city/i).first());
    if (labelText.includes('zip') || labelText.includes('postal')) labelStrategies.push(() => this.page.getByLabel(/zip|postal/i).first());
    if (labelText.includes('business')) labelStrategies.push(() => this.page.getByLabel(/business/i).first());

    // Strategy 2: Try by placeholder
    const placeholderStrategies = [
      () => this.page.getByPlaceholder(/email/i).first(),
      () => this.page.getByPlaceholder(/name/i).first(),
      () => this.page.getByPlaceholder(/enter/i).first(),
    ];

    // Strategy 3: Try by role
    const roleStrategies = [
      () => this.page.getByRole('textbox').first(),
      () => this.page.getByRole('searchbox').first(),
    ];

    // Strategy 4: CSS selectors
    const cssStrategies = [
      suggestedSelector,
      'input[type="email"]:visible',
      'input[type="text"]:visible',
      'input[type="password"]:visible',
      'input[type="tel"]:visible',
      'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):visible',
      'textarea:visible',
    ];

    // Try label strategies first
    for (const getElement of labelStrategies) {
      try {
        const element = getElement();
        await element.waitFor({ timeout: 2000, state: 'visible' });
        await element.fill(value);
        console.log(`   ✅ Filled by label`);
        return;
      } catch (e) { continue; }
    }

    // Try placeholder strategies
    for (const getElement of placeholderStrategies) {
      try {
        const element = getElement();
        await element.waitFor({ timeout: 1000, state: 'visible' });
        await element.fill(value);
        console.log(`   ✅ Filled by placeholder`);
        return;
      } catch (e) { continue; }
    }

    // Try CSS selectors
    for (const selector of cssStrategies) {
      if (!selector) continue;
      try {
        await this.page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
        await this.page.fill(selector, value);
        console.log(`   ✅ Filled using: ${selector}`);
        return;
      } catch (e) { continue; }
    }

    // Try role strategies as last resort
    for (const getElement of roleStrategies) {
      try {
        const element = getElement();
        await element.waitFor({ timeout: 1000, state: 'visible' });
        await element.fill(value);
        console.log(`   ✅ Filled by role`);
        return;
      } catch (e) { continue; }
    }

    throw new Error(`Could not find input field for: ${description || suggestedSelector}`);
  }

  /**
   * Smart click that tries multiple strategies
   */
  async smartClick(suggestedSelector, description = '') {
    console.log(`   🔍 Looking for element: ${description || suggestedSelector}`);

    // Extract text from selector or description
    const textMatch = suggestedSelector?.match(/has-text\(['"](.+?)['"]\)/)?.[1] ||
                     suggestedSelector?.match(/text=['"](.+?)['"]/)?.[1] ||
                     suggestedSelector?.match(/:text\(['"](.+?)['"]\)/)?.[1];

    const buttonText = description.toLowerCase();

    // Strategy 1: Try by role with name (most reliable)
    const roleStrategies = [];
    if (buttonText.includes('continue') || textMatch?.toLowerCase().includes('continue')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /continue/i }).first());
      roleStrategies.push(() => this.page.getByRole('link', { name: /continue/i }).first());
    }
    if (buttonText.includes('next') || textMatch?.toLowerCase().includes('next')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /next/i }).first());
    }
    if (buttonText.includes('submit') || textMatch?.toLowerCase().includes('submit')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /submit/i }).first());
    }
    if (buttonText.includes('start') || textMatch?.toLowerCase().includes('start')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /start/i }).first());
      roleStrategies.push(() => this.page.getByRole('link', { name: /start/i }).first());
    }
    if (buttonText.includes('sign') || textMatch?.toLowerCase().includes('sign')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /sign/i }).first());
    }
    if (buttonText.includes('create') || textMatch?.toLowerCase().includes('create')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /create/i }).first());
    }
    if (buttonText.includes('verify') || textMatch?.toLowerCase().includes('verify')) {
      roleStrategies.push(() => this.page.getByRole('button', { name: /verify/i }).first());
    }

    // Try role strategies first
    for (const getElement of roleStrategies) {
      try {
        const element = getElement();
        await element.waitFor({ timeout: 3000, state: 'visible' });
        await element.click();
        console.log(`   ✅ Clicked by role`);
        return;
      } catch (e) { continue; }
    }

    // Strategy 2: Try by text content
    if (textMatch) {
      try {
        await this.page.getByText(textMatch, { exact: false }).first().click({ timeout: 3000 });
        console.log(`   ✅ Clicked by text: ${textMatch}`);
        return;
      } catch (e) { /* continue */ }
    }

    // Strategy 3: Try the exact selector
    if (suggestedSelector) {
      try {
        await this.page.click(suggestedSelector, { timeout: 3000 });
        console.log(`   ✅ Clicked using: ${suggestedSelector}`);
        return;
      } catch (e) { /* continue */ }
    }

    // Strategy 4: Try common button patterns
    const fallbackSelectors = [
      'button[type="submit"]',
      'button.primary',
      'button.btn-primary',
      'a.btn-primary',
      '.continue-button',
      '[data-testid*="continue"]',
      '[data-testid*="submit"]',
    ];

    for (const selector of fallbackSelectors) {
      try {
        await this.page.click(selector, { timeout: 2000 });
        console.log(`   ✅ Clicked fallback: ${selector}`);
        return;
      } catch (e) { continue; }
    }

    throw new Error(`Could not find clickable element: ${description || suggestedSelector}`);
  }

  /**
   * Smart select for dropdowns (handles both native and custom dropdowns)
   */
  async smartSelect(suggestedSelector, value, description = '') {
    console.log(`   🔍 Looking for dropdown to select: ${value}`);

    // Strategy 1: Try native select first
    try {
      const selects = await this.page.$$('select');
      for (const select of selects) {
        try {
          await select.selectOption({ label: value });
          console.log(`   ✅ Selected by native select label: ${value}`);
          return;
        } catch (e) {
          try {
            await select.selectOption(value);
            console.log(`   ✅ Selected by native select value: ${value}`);
            return;
          } catch (e2) { continue; }
        }
      }
    } catch (e) { /* continue */ }

    // Strategy 2: Custom dropdown - click to open, then click option
    const dropdownTriggers = [
      '[class*="select"]',
      '[class*="dropdown"]',
      '[role="combobox"]',
      '[role="listbox"]',
      'div:has-text("Select your state")',
      'div:has-text("Select")',
      '[data-testid*="select"]',
      suggestedSelector,
    ].filter(Boolean);

    for (const trigger of dropdownTriggers) {
      try {
        // Click to open dropdown
        await this.page.click(trigger, { timeout: 2000 });
        console.log(`   📂 Opened dropdown with: ${trigger}`);
        await this.page.waitForTimeout(500);

        // Now try to find and click the option
        const optionSelectors = [
          // Try role-based selectors
          () => this.page.getByRole('option', { name: new RegExp(value, 'i') }).first(),
          () => this.page.getByRole('menuitem', { name: new RegExp(value, 'i') }).first(),
          () => this.page.getByRole('listitem').filter({ hasText: new RegExp(value, 'i') }).first(),
          // Try text-based selectors
          () => this.page.locator(`li:has-text("${value}")`).first(),
          () => this.page.locator(`div[role="option"]:has-text("${value}")`).first(),
          () => this.page.locator(`[class*="option"]:has-text("${value}")`).first(),
          () => this.page.locator(`[class*="item"]:has-text("${value}")`).first(),
          // General text match in visible area
          () => this.page.getByText(value, { exact: true }).first(),
          () => this.page.getByText(value, { exact: false }).first(),
        ];

        for (const getOption of optionSelectors) {
          try {
            const option = getOption();
            await option.waitFor({ timeout: 1500, state: 'visible' });
            await option.click();
            console.log(`   ✅ Selected option: ${value}`);
            await this.page.waitForTimeout(500);
            return;
          } catch (e) { continue; }
        }

        // If we opened dropdown but couldn't find option, close it and try next trigger
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);

      } catch (e) { continue; }
    }

    // Strategy 3: Type to search in dropdown
    try {
      // Try typing the value directly
      await this.page.keyboard.type(value.substring(0, 3), { delay: 100 });
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
      console.log(`   ✅ Selected by typing: ${value}`);
      return;
    } catch (e) { /* continue */ }

    throw new Error(`Could not select option: ${value}`);
  }

  /**
   * Check if we're on a CAPTCHA/security page that needs manual intervention
   */
  async isOnCaptchaPage() {
    const url = this.page.url();
    const title = await this.page.title().catch(() => '');

    // Check URL patterns
    if (url.includes('/t/validate') || url.includes('captcha') || url.includes('challenge')) {
      return true;
    }

    // Check page title
    if (title.toLowerCase().includes('checkpoint') || title.toLowerCase().includes('security')) {
      return true;
    }

    // Check for reCAPTCHA iframe
    try {
      const recaptcha = await this.page.$('iframe[title*="reCAPTCHA"]');
      if (recaptcha) return true;
    } catch (e) { /* ignore */ }

    return false;
  }

  /**
   * Wait for manual CAPTCHA completion
   */
  async waitForCaptchaCompletion(maxWaitMs = 120000) {
    console.log(`\n⏸️  ═══════════════════════════════════════════════════════════`);
    console.log(`   CAPTCHA DETECTED - Waiting for manual completion...`);
    console.log(`   Please complete the CAPTCHA in the browser window.`);
    console.log(`   Waiting up to ${maxWaitMs / 1000} seconds...`);
    console.log(`   ═══════════════════════════════════════════════════════════\n`);

    const startTime = Date.now();
    const checkInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      await this.page.waitForTimeout(checkInterval);

      // Check if we've moved past the CAPTCHA page
      if (!(await this.isOnCaptchaPage())) {
        console.log(`   ✅ CAPTCHA completed! Continuing automation...\n`);
        await this.page.waitForTimeout(1000); // Brief pause after CAPTCHA
        return true;
      }

      // Show waiting indicator
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r   ⏳ Waiting... ${elapsed}s elapsed`);
    }

    throw new Error('CAPTCHA timeout - manual completion not detected');
  }

  /**
   * Execute the action decided by Claude
   */
  async executeAction(action) {
    // First, check for CAPTCHA and wait for manual intervention
    if (await this.isOnCaptchaPage()) {
      await this.waitForCaptchaCompletion();
      return { complete: false }; // Continue with next step after CAPTCHA
    }

    console.log(`\n🤖 Claude's Decision:`);
    console.log(`   Reasoning: ${action.reasoning}`);
    console.log(`   Action: ${action.action}`);
    console.log(`   Description: ${action.description}`);

    switch (action.action) {
      case 'click':
        await this.smartClick(action.selector, action.description);
        await this.page.waitForTimeout(2000);
        break;

      case 'fill':
        await this.smartFill(action.selector, action.value, action.description);
        await this.page.waitForTimeout(500);
        break;

      case 'select':
        await this.smartSelect(action.selector, action.value, action.description);
        await this.page.waitForTimeout(500);
        break;

      case 'navigate':
        await this.page.goto(action.value);
        await this.page.waitForTimeout(3000);
        break;

      case 'wait':
        console.log(`   ⏳ Waiting for page to settle...`);
        await this.page.waitForTimeout(3000);
        break;

      case 'complete':
        console.log(`   ✅ Flow complete!`);
        return { complete: true };
        break;

      default:
        console.log(`   ⚠️  Unknown action: ${action.action}`);
    }

    return { complete: action.action === 'complete' };
  }

  /**
   * Run the autonomous flow
   */
  async runAutonomousFlow(objective, maxSteps = 50) {
    console.log(`\n🚀 Starting autonomous flow: ${objective}`);
    console.log(`   Max steps: ${maxSteps}`);
    if (this.screenshotsDir) {
      console.log(`   📁 Screenshots: ${this.screenshotsDir}`);
    }
    console.log('');

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3; // Fail after 3 consecutive errors
    const startTime = Date.now();

    for (let step = 1; step <= maxSteps; step++) {
      console.log(`\n📍 Step ${step}/${maxSteps}`);
      const stepStartTime = Date.now();

      try {
        const context = await this.getPageContext();
        let action;
        let usedCache = false;

        // Always use AI vision (cache disabled by default for better adaptability)
        console.log(`\n🤖 Using AI vision to analyze page...`);
        action = await this.decideNextAction(objective, step);

        // Execute the action
        const result = await this.executeAction(action);

        // Log this step
        this.stepLog.push({
          step,
          timestamp: new Date().toISOString(),
          url: context.url,
          pageTitle: context.title,
          action: action.action,
          selector: action.selector,
          value: action.value,
          description: action.description,
          reasoning: action.reasoning,
          usedCache,
          success: true,
          duration: Date.now() - stepStartTime,
          screenshot: this.capturedScreenshots[this.capturedScreenshots.length - 1]?.filename
        });

        // Cache the successful step
        this.stepCache.cacheStep(context.url, context.title, action);

        // Reset error counter on success
        consecutiveErrors = 0;

        // Check if we're done
        if (result.complete) {
          console.log(`\n✅ Objective completed in ${step} steps!`);
          const stats = this.stepCache.getStats();
          console.log(`\n📊 Cache Statistics:`);
          console.log(`   Pages learned: ${stats.pageCount}`);
          console.log(`   Total steps cached: ${stats.totalSteps}`);
          console.log(`   Success rate: ${(stats.overallSuccessRate * 100).toFixed(1)}%`);

          return {
            success: true,
            steps: step,
            finalUrl: this.page.url(),
            duration: Date.now() - startTime,
            screenshots: this.capturedScreenshots,
            stepLog: this.stepLog
          };
        }

      } catch (error) {
        consecutiveErrors++;
        console.error(`\n❌ Error on step ${step}:`, error.message);
        console.error(`   (Consecutive errors: ${consecutiveErrors}/${maxConsecutiveErrors})`);

        // Log the failed step
        const context = await this.getPageContext();
        this.stepLog.push({
          step,
          timestamp: new Date().toISOString(),
          url: context.url,
          pageTitle: context.title,
          success: false,
          error: error.message,
          duration: Date.now() - stepStartTime,
          screenshot: this.capturedScreenshots[this.capturedScreenshots.length - 1]?.filename
        });

        // Mark the cached step as failed
        this.stepCache.markStepFailed(context.url, context.title);

        // Check if this is a fatal error (API issues, auth problems, etc.)
        const isFatalError =
          error.message.includes('404') ||
          error.message.includes('not_found_error') ||
          error.message.includes('authentication') ||
          error.message.includes('Invalid API Key') ||
          error.message.includes('rate_limit');

        if (isFatalError) {
          console.error(`\n💀 Fatal error detected. Stopping execution.`);
          console.error(`   Error type: API or authentication issue`);
          throw error;
        }

        // Stop if too many consecutive errors
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`\n💀 Too many consecutive errors (${consecutiveErrors}). Stopping execution.`);
          throw new Error(`Failed after ${consecutiveErrors} consecutive errors. Last error: ${error.message}`);
        }

        // Try to recover for non-fatal errors - use AI next time
        console.log(`   🔄 Will use AI agent on retry...`);
        await this.page.waitForTimeout(2000);
      }
    }

    console.log(`\n⚠️  Reached max steps (${maxSteps}) without completing objective`);
    return {
      success: false,
      steps: maxSteps,
      finalUrl: this.page.url(),
      reason: 'Max steps reached',
      duration: Date.now() - startTime,
      screenshots: this.capturedScreenshots,
      stepLog: this.stepLog
    };
  }

  /**
   * Reset conversation history
   */
  resetHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get detailed results for reporting
   */
  getDetailedResults() {
    return {
      screenshots: this.capturedScreenshots,
      stepLog: this.stepLog,
      conversationHistory: this.conversationHistory
    };
  }
}
