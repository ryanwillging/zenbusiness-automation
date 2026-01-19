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
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      await this.wait(2000);
      if (!(await this.isOnCaptcha())) {
        console.log('   CAPTCHA completed!\n');
        return;
      }
      process.stdout.write(`\r   Waiting... ${Math.round((Date.now() - start) / 1000)}s`);
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
    await this.select('state', this.persona.state);
    await this.wait(WAIT_TIMES.long);

    // Check for county requirement
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
    await this.fill('business name', this.businessDetails.businessName);
    await this.clickCTA();
    await this.waitForNavigation();
  }

  async handleContactInfo() {
    console.log('   Contact info page...');
    await this.fill('first name', this.persona.firstName);
    await this.fill('last name', this.persona.lastName);
    await this.fill('email', this.persona.email);
    await this.fill('phone', this.persona.phone);
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
    await this.fill('email', this.persona.email);
    await this.fill('password', TEST_CREDENTIALS.password);
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

  async handleUpsell(config) {
    const shouldBuy = this.testGoals.upsells?.[config.upsellKey] ?? config.defaultAccept;
    console.log(`   ${config.label} upsell - ${shouldBuy ? 'ACCEPTING' : 'DECLINING'}...`);

    if (shouldBuy) {
      await this.act('Click "Yes" or "Add" or select the option to accept');
    } else {
      await this.act('Click "No thanks" or "Skip" or "Continue without" to decline');
    }
    await this.waitForNavigation();
  }

  async handleGenericUpsell() {
    const shouldAccept = this.testGoals.upsellStrategy === 'accept_all';
    console.log(`   Generic upsell - ${shouldAccept ? 'ACCEPTING' : 'DECLINING'}...`);

    if (shouldAccept) {
      await this.act('Click "Yes" or "Add" to accept this offer');
    } else {
      await this.act('Click "No thanks" or "Skip" to decline this offer');
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

      const currentUrl = this.page.url();
      console.log(`\nStep ${stepCount}: URL = ${currentUrl}`);

      // Stuck detection
      const isCheckoutPage = currentUrl.includes('checkout');
      const maxStuckAttempts = isCheckoutPage ? 10 : 5;

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
    console.log(`\nTotal time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    console.log(`Steps executed: ${this.stepLog.length}`);
  }
}
