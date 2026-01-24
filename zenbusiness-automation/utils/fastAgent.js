/**
 * Fast Agent - AI-powered browser automation for ZenBusiness flows
 * Uses Stagehand + GPT-4o-mini for autonomous navigation
 */

import { Stagehand } from '@browserbasehq/stagehand';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

import {
  PAYMENT_DATA,
  TEST_CREDENTIALS,
  WAIT_TIMES,
  DEFAULT_TEST_GOALS,
  CTA_SELECTORS,
  CHECKOUT_SELECTORS,
  COUNTY_SELECTORS,
  FIELD_CONFIG,
  getFieldValue,
  getFieldSelectors
} from './config.js';

import { findHandler, isEndState } from './pageHandlers.js';
import { CheckoutHandler } from './checkoutHandler.js';

export class FastAgent {
  constructor(persona, businessDetails, options = {}) {
    this.persona = persona;
    this.businessDetails = businessDetails;
    this.options = options;
    this.stagehand = null;
    this.page = null;
    this.agent = null;
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.stepLog = [];
    this.startTime = null;
    this.captchaTime = 0; // Track time spent waiting for CAPTCHA
    this.testRunDir = null;
    this.testGoals = { ...DEFAULT_TEST_GOALS, ...persona.testGoals };
  }

  /**
   * Initialize the browser and tools
   */
  async init() {
    console.log('Initializing FastAgent...');

    this.stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o-mini',
      modelClientOptions: { apiKey: process.env.OPENAI_API_KEY },
      enableCaching: true,
      headless: false,
      verbose: 0,
    });

    await this.stagehand.init();

    const pages = this.stagehand.context.pages();
    this.page = pages[0] || await this.stagehand.context.newPage();

    try {
      this.agent = this.stagehand.agent({
        modelName: 'gpt-4o-mini',
        modelClientOptions: { apiKey: process.env.OPENAI_API_KEY }
      });
      console.log('   Stagehand agent mode enabled (GPT-4o-mini)');
    } catch (e) {
      this.agent = null;
      console.log(`   Agent mode not available: ${e.message}`);
    }

    console.log('   FastAgent ready\n');
    this.startTime = Date.now();

    // Create test run folder
    const timestamp = Date.now();
    const runName = `fast_llc_${timestamp}`;
    this.testRunDir = path.join(process.cwd(), 'zenbusiness-automation', 'test-runs', runName);
    fs.mkdirSync(this.testRunDir, { recursive: true });
    fs.mkdirSync(path.join(this.testRunDir, 'screenshots'), { recursive: true });
    console.log(`Test run folder: ${this.testRunDir}\n`);
  }

  // ==================== Core Actions ====================

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async goto(url) {
    console.log(`Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.wait(WAIT_TIMES.short);
  }

  // ==================== Direct HTML Interaction Methods ====================

  /**
   * Detect and close any blocking modals or dialogs
   * @returns {boolean} - True if a modal was closed
   */
  async closeModals() {
    const modalCloseSelectors = [
      // X button variations (most common)
      'button[aria-label*="Close" i]',
      'button[aria-label*="Dismiss" i]',
      'button[title*="Close" i]',
      // X symbol variations in buttons
      'button:has-text("×")',  // Times symbol
      'button:has-text("✕")',  // Multiplication X
      'button:has-text("✖")',  // Heavy X
      'button:has-text("X")',  // Capital X
      // SVG close icons (common in modern UIs)
      'button:has(svg)',       // Button containing SVG (very common for X icons)
      '[role="button"]:has(svg)',
      // Dialog-scoped close buttons
      '[role="dialog"] button[aria-label*="Close" i]',
      '[role="dialog"] button:has(svg)',
      '[role="dialog"] button',  // Any button in dialog (if it's the only one, it's likely close)
      // Class-based patterns
      'button[class*="close" i]',
      'button[class*="dismiss" i]',
      '[class*="modal" i] button[class*="close" i]',
      '[class*="dialog" i] button[class*="close" i]',
      // Data attribute patterns
      '[data-testid*="close" i]',
      '[data-testid*="dismiss" i]',
      '[data-dismiss="modal"]',
      // Generic action text
      'button:has-text("No thanks")',
      'button:has-text("Maybe later")',
      'button:has-text("Not now")'
    ];

    console.log('   🔍 Checking for blocking modals...');

    // First, check if any modal/dialog is visible
    const hasModal = await this.page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="Modal"], [class*="Dialog"]');
      for (const modal of modals) {
        if (modal.offsetParent !== null) return true;
      }
      return false;
    }).catch(() => false);

    if (!hasModal) {
      console.log('   ℹ️  No blocking modals detected');
      return false;
    }

    console.log('   🎯 Modal detected, attempting to close...');

    // Try clicking close buttons
    for (const selector of modalCloseSelectors) {
      try {
        const element = this.page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          const isVisible = await element.isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            console.log(`   🎯 Found modal close button: ${selector}`);
            await element.click();
            console.log(`   ✅ Closed modal successfully`);
            await this.wait(WAIT_TIMES.medium);
            return true;
          }
        }
      } catch (e) {
        // Silently try next selector
        continue;
      }
    }

    // Fallback 1: Use AI to find and click the close button
    console.log('   ⚠️  Could not find close button with selectors, trying AI...');
    try {
      await this.act('Click the X button or close button in the top-right corner of the dialog to close it');
      await this.wait(WAIT_TIMES.medium);

      // Verify modal is gone
      const modalStillVisible = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], .modal, .dialog, [class*="Modal"], [class*="Dialog"]');
        for (const modal of modals) {
          if (modal.offsetParent !== null) return true;
        }
        return false;
      }).catch(() => false);

      if (!modalStillVisible) {
        console.log('   ✅ AI successfully closed modal');
        return true;
      }
    } catch (e) {
      console.log('   ⚠️  AI failed to close modal');
    }

    // Fallback 2: Press Escape key
    console.log('   ⚠️  Trying Escape key as last resort...');
    try {
      // Access keyboard via underlying Playwright page if needed
      const keyboard = this.page.keyboard || this.page._page?.keyboard;
      if (keyboard) {
        await keyboard.press('Escape');
        await this.wait(WAIT_TIMES.brief);
        console.log('   ✅ Pressed Escape key');
        return true;
      }
    } catch (e) {
      // Escape failed
    }

    console.log('   ❌ Failed to close modal with all methods');
    return false;
  }

  /**
   * Fill a field using direct Playwright selectors (no AI)
   * @param {string} fieldName - Field name from FIELD_CONFIG (e.g., 'firstName', 'businessName')
   * @param {*} customValue - Optional custom value (otherwise uses persona/business data)
   * @returns {boolean} - Success status
   */
  async fillDirect(fieldName, customValue = null) {
    // Look up field config by exact key match
    const fieldConfig = FIELD_CONFIG[fieldName];
    if (!fieldConfig) {
      console.log(`   fillDirect: No config found for "${fieldName}"`);
      return false;
    }

    const value = customValue || fieldConfig.getValue(this.persona, this.businessDetails);
    if (!value) {
      console.log(`   fillDirect: No value for "${fieldName}"`);
      return false;
    }

    console.log(`\nFill Direct: ${fieldName} = "${value}"`);
    const stepStart = Date.now();

    // Try each selector until one works
    for (const selector of fieldConfig.selectors) {
      try {
        const element = this.page.locator(selector).first();
        const count = await element.count();
        if (count === 0) continue;

        // Check if visible and enabled
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        const isEnabled = await element.isEnabled({ timeout: 1000 }).catch(() => false);

        if (!isVisible || !isEnabled) continue;

        // Fill the field
        await element.fill(value);
        await this.wait(WAIT_TIMES.brief);
        console.log(`   ✅ Filled via direct selector (${Date.now() - stepStart}ms): ${selector}`);
        return true;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    console.log(`   ❌ fillDirect failed - no selector worked (${Date.now() - stepStart}ms)`);
    return false;
  }

  /**
   * Click an element using direct Playwright selector (no AI)
   * @param {string|string[]} selectors - Single selector or array of selectors to try
   * @param {object} options - Click options (timeout, force, etc.)
   * @returns {boolean} - Success status
   */
  async clickDirect(selectors, options = {}) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const stepStart = Date.now();

    for (const selector of selectorArray) {
      try {
        const element = this.page.locator(selector).first();
        const count = await element.count();
        if (count === 0) continue;

        // Check if visible and enabled
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        const isEnabled = await element.isEnabled({ timeout: 1000 }).catch(() => false);

        if (!isVisible || !isEnabled) continue;

        // Click the element
        await element.click(options);
        await this.wait(WAIT_TIMES.brief);
        console.log(`   ✅ Clicked via direct selector (${Date.now() - stepStart}ms): ${selector}`);
        return true;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    console.log(`   ❌ clickDirect failed - no selector worked (${Date.now() - stepStart}ms)`);
    return false;
  }

  /**
   * Select from dropdown using direct Playwright selector (no AI)
   * @param {string} value - Value to select
   * @param {string[]} selectors - Array of selectors to try
   * @returns {boolean} - Success status
   */
  async selectDirect(value, selectors) {
    const stepStart = Date.now();

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        const count = await element.count();
        if (count === 0) continue;

        // Check if visible and enabled
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        if (!isVisible) continue;

        // Try to select by value, label, or index
        await element.selectOption({ label: value }, { timeout: 2000 }).catch(async () => {
          await element.selectOption({ value: value }).catch(async () => {
            await element.selectOption({ index: 0 });
          });
        });

        await this.wait(WAIT_TIMES.brief);
        console.log(`   ✅ Selected via direct selector (${Date.now() - stepStart}ms): ${selector}`);
        return true;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    console.log(`   ❌ selectDirect failed - no selector worked (${Date.now() - stepStart}ms)`);
    return false;
  }

  async act(instruction, maxRetries = 3) {
    const stepStart = Date.now();
    console.log(`\nAction: ${instruction}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.stagehand.act(instruction);
        console.log(`   Done (${Date.now() - stepStart}ms)`);
        this.stepLog.push({ action: instruction, success: true, duration: Date.now() - stepStart });
        return true;
      } catch (e) {
        const isEmptyResponse = e.message.includes('No object generated') ||
                               e.message.includes('response did not match schema') ||
                               e.message.includes('empty');

        if (isEmptyResponse && attempt < maxRetries) {
          console.log(`   Empty response (attempt ${attempt}/${maxRetries}) - retrying...`);
          await this.wait(WAIT_TIMES.medium);
          continue;
        }

        console.log(`   Failed: ${e.message}`);
        this.stepLog.push({ action: instruction, success: false, error: e.message, duration: Date.now() - stepStart });
        return false;
      }
    }
    return false;
  }

  async fill(fieldDescription, value = null) {
    const actualValue = value || getFieldValue(fieldDescription, this.persona, this.businessDetails);
    if (!actualValue) {
      console.log(`\nFill: ${fieldDescription} - No value found`);
      return false;
    }

    console.log(`\nFill: ${fieldDescription} = "${actualValue}"`);
    const stepStart = Date.now();

    // Strategy 1: Stagehand act
    try {
      await this.stagehand.act(`Type "${actualValue}" into the ${fieldDescription} field`);
      console.log(`   Filled via Stagehand (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 2: Direct Playwright with selectors
    const selectors = getFieldSelectors(fieldDescription);
    for (const selector of selectors) {
      try {
        await this.page.fill(selector, actualValue, { timeout: 2000 });
        console.log(`   Filled via selector: ${selector} (${Date.now() - stepStart}ms)`);
        return true;
      } catch (e) {
        continue;
      }
    }

    console.log(`   Could not fill ${fieldDescription}`);
    return false;
  }

  async select(fieldDescription, value) {
    console.log(`\nSelect: ${fieldDescription} = "${value}"`);
    const stepStart = Date.now();

    try {
      await this.stagehand.act(`Select "${value}" from the ${fieldDescription} dropdown`);
      console.log(`   Selected via Stagehand (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Try click sequence
    }

    try {
      await this.stagehand.act(`Click on the ${fieldDescription} dropdown to open it`);
      await this.wait(WAIT_TIMES.medium);
      await this.stagehand.act(`Click on the "${value}" option`);
      console.log(`   Selected via click sequence (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      // Try native select
    }

    try {
      await this.page.selectOption('select', { label: value });
      console.log(`   Selected via native select (${Date.now() - stepStart}ms)`);
      return true;
    } catch (e) {
      console.log(`   Could not select ${value}`);
      return false;
    }
  }

  async clickCTA() {
    console.log(`\nClick: Continue/Next button`);
    const stepStart = Date.now();

    for (const selector of CTA_SELECTORS) {
      try {
        const btn = await this.page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log(`   Clicked via selector: ${selector} (${Date.now() - stepStart}ms)`);
          await this.wait(WAIT_TIMES.brief);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    try {
      await this.stagehand.act('Click the Continue or Next button');
      console.log(`   Clicked via Stagehand (${Date.now() - stepStart}ms)`);
      await this.wait(WAIT_TIMES.brief);
      return true;
    } catch (e) {
      console.log(`   CTA click failed: ${e.message}`);
      return false;
    }
  }

  async waitForNavigation(timeout = WAIT_TIMES.checkout) {
    const startUrl = this.page.url();
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await this.wait(WAIT_TIMES.short);
      if (this.page.url() !== startUrl) {
        console.log(`   Navigated to: ${this.page.url()}`);
        return true;
      }
    }
    return false;
  }

  // ==================== CAPTCHA Handling ====================

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

  async waitForCaptcha(maxWait = 60000) {
    if (!(await this.isOnCaptcha())) return;

    console.log('\n CAPTCHA DETECTED - Complete it manually in the browser');
    const captchaStart = Date.now();
    while (Date.now() - captchaStart < maxWait) {
      await this.wait(2000);
      if (!(await this.isOnCaptcha())) {
        const captchaDuration = Date.now() - captchaStart;
        this.captchaTime += captchaDuration;
        console.log('   CAPTCHA completed!\n');
        return;
      }
      process.stdout.write(`\r   Waiting... ${Math.round((Date.now() - captchaStart) / 1000)}s`);
    }
    throw new Error('CAPTCHA timeout');
  }

  // ==================== Screenshots ====================

  async saveScreenshot(name, captureFullPage = false) {
    if (!this.testRunDir || !this.page) return null;
    try {
      const timestamp = Date.now();
      const baseName = name.replace(/[^a-z0-9]/gi, '_');

      if (captureFullPage) {
        const screenshots = [];
        const scrollPositions = ['top', 'middle', 'bottom'];
        const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await this.page.evaluate(() => window.innerHeight);

        for (let i = 0; i < scrollPositions.length; i++) {
          const position = scrollPositions[i];
          let scrollY = position === 'middle' ? (pageHeight - viewportHeight) / 2 :
                        position === 'bottom' ? pageHeight - viewportHeight : 0;
          scrollY = Math.max(0, scrollY);

          await this.page.evaluate((y) => window.scrollTo(0, y), scrollY);
          await this.wait(WAIT_TIMES.short);

          const filename = `${timestamp}_${baseName}_${position}.png`;
          const filepath = path.join(this.testRunDir, 'screenshots', filename);
          await this.page.screenshot({ path: filepath });
          screenshots.push(filepath);
          console.log(`   Screenshot saved: ${filename}`);
        }

        await this.page.evaluate(() => window.scrollTo(0, 0));
        return screenshots;
      } else {
        const filename = `${timestamp}_${baseName}.png`;
        const filepath = path.join(this.testRunDir, 'screenshots', filename);
        await this.page.screenshot({ path: filepath, fullPage: true });
        console.log(`   Screenshot saved: ${filename}`);
        return filepath;
      }
    } catch (e) {
      console.log(`   Screenshot failed: ${e.message}`);
      return null;
    }
  }

  // ==================== AI Decision Making ====================

  async decideNextAction() {
    const screenshot = await this.page.screenshot({ type: 'png' });
    const base64 = screenshot.toString('base64');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          {
            type: 'text',
            text: `ZenBusiness form automation. Analyze and return next action.

DATA: Name: ${this.persona.firstName} ${this.persona.lastName}, Email: ${this.persona.email}, Phone: ${this.persona.phone}, State: ${this.persona.state}, Business: ${this.businessDetails.businessName}, Card: ${PAYMENT_DATA.cardNumber}, Exp ${PAYMENT_DATA.expiry}, CVV ${PAYMENT_DATA.cvv}, Password: ${TEST_CREDENTIALS.password}

Look for validation errors or required empty fields.

Return JSON: {"action":"click|fill|select","target":"element","value":"data"}
Do NOT return {"action":"wait"}.`
          }
        ]
      }]
    });

    try {
      const text = response.content[0].text;
      return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    } catch {
      return { action: 'click', target: 'Continue button' };
    }
  }

  // ==================== Page Handlers ====================

  async handleBusinessState() {
    console.log('   Business state page...');

    // Try direct state selection first (FAST!)
    const stateSelectors = [
      'select[name*="state"]',
      'select[id*="state"]',
      '[aria-label*="state" i]',
      'select'
    ];

    let success = await this.selectDirect(this.persona.state, stateSelectors);

    // Fall back to AI if direct selection fails
    if (!success) {
      console.log('   Falling back to AI for state selection...');
      await this.select('state', this.persona.state);
    }

    await this.wait(WAIT_TIMES.long);

    // Check for county requirement (already uses direct selectors)
    const countySelected = await this.trySelectCounty();
    if (!countySelected) {
      await this.act('If there is a county dropdown visible, select the first available option');
      await this.wait(WAIT_TIMES.medium);
    }

    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleBusinessName() {
    console.log('   Business name page...');

    // Try direct HTML filling first (fast!)
    let success = await this.fillDirect('businessName');

    // Fall back to AI if direct method fails
    if (!success) {
      console.log('   Falling back to AI for business name...');
      await this.fill('business name', this.businessDetails.businessName);
    }

    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleContactInfo() {
    console.log('   Contact info page...');

    // Try direct HTML filling first (fast!)
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    let allSuccess = true;

    for (const field of fields) {
      const success = await this.fillDirect(field);
      if (!success) allSuccess = false;
    }

    // Fall back to AI if any field failed
    if (!allSuccess) {
      console.log('   Some fields failed, using AI fallback...');
      await this.fill('first name', this.persona.firstName);
      await this.fill('last name', this.persona.lastName);
      await this.fill('email', this.persona.email);
      await this.fill('phone', this.persona.phone);
    }

    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleExistingBusiness() {
    console.log('   Existing business question...');
    await this.act('Click "No" or the option indicating this is a new business');
    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleBusinessExperience() {
    console.log('   Business experience page...');
    await this.act('Click the first option or "Just getting started" or similar beginner option');
    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleIndustry() {
    console.log('   Industry page - skipping...');
    await this.act('Click "Skip for now" or "Skip" link');
    await this.waitForNavigation();
  }

  async handleAccountCreation() {
    console.log('   Account creation page...');

    // Try direct filling first (FAST!)
    let emailSuccess = await this.fillDirect('email');
    let passwordSuccess = await this.fillDirect('password');

    // Fall back to AI if needed
    if (!emailSuccess) {
      console.log('   Falling back to AI for email...');
      await this.fill('email', this.persona.email);
    }
    if (!passwordSuccess) {
      console.log('   Falling back to AI for password...');
      await this.fill('password', TEST_CREDENTIALS.password);
    }

    await this.clickCTA();
    await this.waitForNavigation();
    await this.waitForCaptcha();
  }

  async handlePackageSelection() {
    const pkg = this.testGoals.packagePreference.toUpperCase();
    console.log(`   Package selection - selecting ${pkg}...`);

    const selected = await this.trySelectPackage(pkg);
    if (!selected) {
      await this.act(`Click on the "${pkg}" package option, then click Continue or Select`);
    }
    await this.waitForNavigation();
  }

  async handleUpsell(config = {}) {
    // Support both configured upsells and generic upsells
    const shouldBuy = config.upsellKey
      ? (this.testGoals.upsells?.[config.upsellKey] ?? config.defaultAccept)
      : (this.testGoals.upsellStrategy === 'accept_all');
    const label = config.label || 'Generic';
    console.log(`   ${label} upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);

    let success = false;

    // Try direct selectors first (FAST!)
    if (shouldBuy) {
      // Accept selectors - primary buttons
      const acceptSelectors = [
        'button:has-text("Yes, add")',
        'button:has-text("Yes")',
        'button:has-text("Add")',
        'button:has-text("Appoint")',
        'button:has-text("Keep me covered")',
        'button[class*="primary"]',
        'button[class*="black"]'
      ];
      success = await this.clickDirect(acceptSelectors);
    } else {
      // Decline selectors - secondary buttons
      const declineSelectors = [
        'button:has-text("No thanks")',
        'button:has-text("No")',
        'button:has-text("Skip")',
        'a:has-text("Skip")',
        'button:has-text("figure it out myself")',
        'button:has-text("appoint someone else")',
        'button:has-text("Maybe later")',
        'button[class*="secondary"]',
        'button[class*="outline"]'
      ];
      success = await this.clickDirect(declineSelectors);
    }

    // Fall back to AI if direct selectors fail
    if (!success) {
      console.log('   Direct selectors failed, using AI fallback...');
      if (shouldBuy) {
        await this.act('Click the primary black button to accept (may say "Yes", "Add", "Appoint", "Keep me covered")');
      } else {
        await this.act('Click the secondary white/outline button to decline (may say "No", "Skip", "figure it out myself", "appoint someone else")');
      }
    }

    await this.waitForNavigation();
  }

  async handleCheckout() {
    // Reuse checkout handler to preserve state tracking across calls
    if (!this.checkoutHandler) {
      this.checkoutHandler = new CheckoutHandler(this);
    }
    await this.checkoutHandler.handle();
  }

  async handleBankingApplication() {
    console.log('   Banking application page...');
    await this.fill('business name', this.businessDetails.businessName);
    await this.fill('email', this.persona.email);
    await this.fill('phone', this.persona.phone);
    await this.fill('address', this.persona.address?.street || '123 Main Street');
    await this.fill('city', this.persona.address?.city || 'Austin');
    await this.fill('zip', this.persona.address?.zip || '78701');
    await this.act('Click Submit or Continue');
    await this.waitForNavigation();
  }

  // ==================== Post-Checkout Handlers ====================

  async handlePostCheckoutConfirmation() {
    console.log('   Order confirmation page - continuing to onboarding...');
    // Click Next or Continue to proceed through post-checkout flow
    await this.act('Click "Next" or "Continue" or "Get Started" button');
    await this.waitForNavigation();
  }

  async handlePostCheckoutJourney() {
    console.log('   Post-checkout journey page - analyzing page type...');

    // FIRST: Check for and close any blocking modals/dialogs
    // Note: Main loop also checks, but we double-check here for journey-specific modals
    await this.closeModals();

    // Journey pages can have different input styles:
    // 1. Text input fields (DBA name, business details, etc.)
    // 2. Card-style multiple choice (white cards with radio circles)
    // 3. List/menu selection (text items in a dropdown-like list)
    // MUST fill/select before the Next button becomes enabled

    // First, check if there's a text input field to fill
    const hasTextInput = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
      for (const input of inputs) {
        if (input.offsetParent !== null && !input.value && !input.disabled) {
          return true;
        }
      }
      return false;
    }).catch(() => false);

    if (hasTextInput) {
      console.log('   Found text input field - filling with business name...');
      // Try direct filling first (FAST!)
      let success = await this.fillDirect('businessName');
      if (!success) {
        // Fall back to AI
        await this.act(`Type "${this.businessDetails.businessName}" into the text input field`);
      }
      await this.wait(WAIT_TIMES.medium);
    } else {
      // Try selection strategies for multiple choice / list questions
      console.log('   Looking for selectable options...');

      let selectionSuccess = false;

      // FIRST: Try direct selectors (FAST & RELIABLE!)
      const directSelectors = [
        // Card-style with radio buttons (most common on journey)
        'label:has(input[type="radio"])',
        'div[role="radio"]',
        'button[role="radio"]',
        // Card containers
        '[class*="card"][class*="option"]',
        '[class*="choice"]',
        // List items
        'li[role="option"]',
        '[role="listbox"] > *',
        // Yes/No buttons
        'button:has-text("Yes")',
        'button:has-text("No")'
      ];

      for (const selector of directSelectors) {
        try {
          const elements = await this.page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            const firstElement = elements.first();
            const isVisible = await firstElement.isVisible({ timeout: 500 }).catch(() => false);
            if (isVisible) {
              await firstElement.click();
              selectionSuccess = true;
              console.log(`   ✅ Selected via direct selector (${selector})`);
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // FALLBACK: Use AI if direct selectors didn't work
      if (!selectionSuccess) {
        console.log('   Direct selectors failed, trying AI fallback...');
        const selectionStrategies = [
          // List/menu style - NAICS codes, industries, etc.
          'Click the first list item option (like "Agriculture" or the topmost selectable item in the list)',
          // Card style - white rectangular cards
          'Click on the white card containing the first answer option',
          // Radio button style
          'Click the empty circle or radio button on the left side of the first answer',
          // Direct text click
          'Click the first selectable text option under the question'
        ];

        for (const strategy of selectionStrategies) {
          try {
            await this.act(strategy);
            selectionSuccess = true;
            console.log(`   Selected via AI: ${strategy}`);
            break;
          } catch (e) {
            continue;
          }
        }

        if (!selectionSuccess) {
          console.log('   Could not select option - trying generic action');
          await this.act('Click any selectable option or fill any input field on this page');
        }
      }
    }

    await this.wait(WAIT_TIMES.medium);

    // Now click Next (should be enabled after filling/selecting)
    await this.act('Click the "Next" button');
    await this.waitForNavigation();
  }

  async handlePostCheckoutConclusion() {
    console.log('   Post-checkout conclusion page - continuing to onboarding...');

    // This is a summary page after all post-checkout upsells
    // Need to click Continue/Get Started to proceed to the journey flow
    const continueStrategies = [
      'Click "Continue" button',
      'Click "Get Started" button',
      'Click "Next" button',
      'Click "Go to Dashboard" button',
      'Click "Start Your Journey" button',
      'Click the primary black button to continue'
    ];

    for (const strategy of continueStrategies) {
      try {
        await this.act(strategy);
        const navigated = await this.waitForNavigation();
        if (navigated) {
          console.log(`   Continued via: ${strategy}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback - click any prominent button
    await this.act('Click the main call-to-action button on this page');
    await this.waitForNavigation();
  }

  async handlePostCheckoutCheckout() {
    // This is a checkout page for post-purchase products (like Business License Report)
    // Decide whether to buy based on persona's test goals
    const shouldBuy = this.testGoals.upsells?.postCheckoutProducts ?? false;
    console.log(`   Post-checkout product checkout page - ${shouldBuy ? 'PURCHASING' : 'DECLINING'}...`);

    if (shouldBuy) {
      // Complete the purchase - use the checkout handler
      await this.handleCheckout();
    } else {
      // Decline - look for "No thanks", "Skip", or similar decline options
      const declineStrategies = [
        'Click "No thanks" link or button',
        'Click "Skip" link or button',
        'Click "Maybe later" link',
        'Click "Continue without" link',
        'Click the secondary white/outline button to decline'
      ];

      for (const strategy of declineStrategies) {
        try {
          await this.act(strategy);
          const navigated = await this.waitForNavigation();
          if (navigated) {
            console.log(`   Declined via: ${strategy}`);
            return;
          }
        } catch (e) {
          continue;
        }
      }

      // If standard decline options don't work, this might be a required step
      // Try scrolling to find more options
      console.log('   Looking for decline option after scrolling...');
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.wait(WAIT_TIMES.medium);
      await this.act('Click any link or button that lets you decline or skip this purchase');
      await this.waitForNavigation();
    }
  }

  // ==================== Helper Methods ====================

  async trySelectCounty() {
    for (const selector of COUNTY_SELECTORS) {
      try {
        const dropdown = await this.page.$(selector);
        if (dropdown && await dropdown.isVisible()) {
          console.log(`   Found county dropdown: ${selector}`);

          const tagName = await dropdown.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'select') {
            const options = await dropdown.$$('option');
            for (const option of options) {
              const value = await option.getAttribute('value');
              const text = await option.textContent();
              if (value && value !== '' && !text.toLowerCase().includes('select')) {
                await dropdown.selectOption({ value });
                console.log(`   Selected county: ${text}`);
                return true;
              }
            }
          } else {
            await dropdown.click();
            await this.wait(WAIT_TIMES.medium);

            const optionSelectors = ['[role="option"]:not([aria-disabled="true"])', 'li:not(.disabled)', '.dropdown-item'];
            for (const optSel of optionSelectors) {
              const options = await this.page.$$(optSel);
              for (const opt of options) {
                const text = await opt.textContent();
                if (text && !text.toLowerCase().includes('select') && await opt.isVisible()) {
                  await opt.click();
                  console.log(`   Selected county: ${text}`);
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
    return false;
  }

  async trySelectPackage(packageName) {
    const pkgLower = packageName.toLowerCase();
    const pkgUpper = packageName.toUpperCase();

    const packageSelectors = [
      `button:has-text("${pkgUpper}")`,
      `button:has-text("${pkgLower}")`,
      `[class*="package"]:has-text("${pkgUpper}") button`,
      `[data-package="${pkgLower}"]`,
      `input[value="${pkgLower}"]`,
      `label:has-text("${pkgUpper}") input`
    ];

    for (const selector of packageSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element && await element.isVisible()) {
          await element.click();
          console.log(`   Selected package via: ${selector}`);
          await this.wait(WAIT_TIMES.medium);

          // Try continue button
          for (const contSel of ['button:has-text("Continue")', 'button:has-text("Select")', 'button[type="submit"]']) {
            try {
              const contBtn = await this.page.$(contSel);
              if (contBtn && await contBtn.isVisible()) {
                await contBtn.click();
                return true;
              }
            } catch (e) {
              continue;
            }
          }
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }

  // ==================== Main Flow ====================

  async runLLCFormation() {
    console.log('\n' + '='.repeat(60));
    console.log('Starting LLC Formation Flow');
    console.log('='.repeat(60));
    console.log(`Business: ${this.businessDetails.businessName}`);
    console.log(`State: ${this.persona.state}`);
    console.log(`Email: ${this.persona.email}`);
    console.log(`Name: ${this.persona.fullName}`);
    console.log('='.repeat(60) + '\n');

    try {
      await this.goto('https://www.dev.zenbusiness.com');
      await this.waitForCaptcha();
      return await this.runStepByStep();
    } catch (error) {
      console.error('\nFlow failed:', error.message);
      return { success: false, error: error.message, steps: this.stepLog.length };
    }
  }

  async runStepByStep() {
    console.log('\nRunning in STEP-BY-STEP MODE\n');

    // Initial step: Get started
    console.log('Current URL:', this.page.url());
    await this.act('Click the "Get started" button');
    await this.waitForNavigation();
    await this.waitForCaptcha();

    // Main loop
    let maxSteps = 50;
    let stepCount = 0;
    let stuckCount = 0;
    let urlAtStepStart = '';

    while (stepCount < maxSteps) {
      stepCount++;
      await this.waitForCaptcha();

      // Check for and close any blocking modals before proceeding
      await this.closeModals();

      const currentUrl = this.page.url();
      console.log(`\nStep ${stepCount}: URL = ${currentUrl}`);

      // Stuck detection - allow more attempts for SPAs like checkout and journey
      const isCheckoutPage = currentUrl.includes('checkout');
      const isJourneyPage = currentUrl.includes('/f/journey') || currentUrl.includes('/f/');
      const maxStuckAttempts = isCheckoutPage ? 10 : (isJourneyPage ? 15 : 5);

      if (currentUrl === urlAtStepStart) {
        stuckCount++;
        console.log(`   Same URL (attempt ${stuckCount}/${maxStuckAttempts})`);

        if (stuckCount >= maxStuckAttempts) {
          console.log(`\nSTUCK: Failed same page ${maxStuckAttempts} times. Stopping.`);
          await this.saveScreenshot('stuck_exit', true);
          break;
        }
      } else {
        stuckCount = 0;
      }
      urlAtStepStart = currentUrl;

      // Check end state
      if (isEndState(currentUrl)) {
        // Check for post-checkout banking goal
        if (this.testGoals.postCheckout?.applyForBanking) {
          console.log('   Order confirmed - looking for banking application...');
          await this.wait(WAIT_TIMES.navigation);
          try {
            await this.act('Click on "Apply for Banking" or "Open Bank Account" button');
            await this.waitForNavigation();
            continue;
          } catch (e) {
            console.log('   No banking link found');
          }
        }

        console.log('   Reached order confirmation - flow complete!');
        await this.saveScreenshot('order_confirmation');
        break;
      }

      // Find and execute handler
      const pageConfig = findHandler(currentUrl);

      if (pageConfig && pageConfig.handler) {
        try {
          if (pageConfig.config) {
            await this[pageConfig.handler](pageConfig.config);
          } else {
            await this[pageConfig.handler]();
          }
          continue;
        } catch (e) {
          console.log(`   Handler error: ${e.message}`);
        }
      }

      // Unknown page - use AI fallback
      console.log(`   Unknown page - using AI fallback...`);
      const decision = await this.decideNextAction();
      console.log(`   AI Decision: ${JSON.stringify(decision)}`);

      if (decision.action === 'done') {
        break;
      } else if (decision.action === 'fill' && decision.target && decision.value) {
        await this.fill(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'select' && decision.target && decision.value) {
        await this.select(decision.target, decision.value);
        await this.clickCTA();
      } else if (decision.action === 'click' && decision.target) {
        await this.act(`Click "${decision.target}"`);
      } else {
        await this.clickCTA();
      }
      await this.waitForNavigation();
    }

    const finalUrl = this.page.url();
    console.log('\nStep-by-step flow completed!');
    console.log(`Final URL: ${finalUrl}`);

    await this.saveScreenshot('final_state');

    return { success: true, steps: this.stepLog.length, finalUrl };
  }

  async close() {
    if (this.stagehand) {
      await this.stagehand.close();
    }
    const totalTime = Date.now() - this.startTime;
    const automationTime = totalTime - this.captchaTime;
    console.log(`\nTotal time: ${Math.round(totalTime / 1000)}s`);
    if (this.captchaTime > 0) {
      console.log(`Automation time (excluding CAPTCHA): ${Math.round(automationTime / 1000)}s`);
    }
    console.log(`Steps executed: ${this.stepLog.length}`);
  }
}
