/**
 * Checkout Handler - Manages the multi-step checkout flow
 * Extracted from fastAgent.js for clarity and maintainability
 */

import { PAYMENT_DATA, CHECKOUT_SELECTORS, STRIPE_SELECTORS, WAIT_TIMES } from './config.js';

export class CheckoutHandler {
  constructor(agent) {
    this.agent = agent;
    this.page = agent.page;
    // Access the Stagehand instance for keyboard operations
    this.stagehand = agent.stagehand;
    this.lastSection = null;
    this.sectionAttempts = 0;
  }

  /**
   * Get keyboard from Playwright page
   * Stagehand wraps the page, so we need to access the underlying Playwright page
   */
  async getKeyboard() {
    // Method 1: Try this.page._page (Stagehand's internal Playwright page reference)
    if (this.page?._page?.keyboard) {
      console.log('   [keyboard] Found via page._page.keyboard');
      return this.page._page.keyboard;
    }

    // Method 2: Try this.page.page (alternative internal reference)
    if (this.page?.page?.keyboard) {
      console.log('   [keyboard] Found via page.page.keyboard');
      return this.page.page.keyboard;
    }

    // Method 3: From stagehand context - try _page on each
    if (this.stagehand?.context) {
      try {
        const pages = this.stagehand.context.pages();
        if (pages && pages.length > 0) {
          // Try _page first
          if (pages[0]._page?.keyboard) {
            console.log('   [keyboard] Found via context.pages()[0]._page.keyboard');
            return pages[0]._page.keyboard;
          }
          // Try direct keyboard
          if (pages[0].keyboard) {
            console.log('   [keyboard] Found via context.pages()[0].keyboard');
            return pages[0].keyboard;
          }
        }
      } catch (e) {
        console.log(`   [keyboard] Error accessing context pages: ${e.message}`);
      }
    }

    // Method 4: Direct from this.page.keyboard (in case it's a raw Playwright page)
    if (this.page?.keyboard) {
      console.log('   [keyboard] Found via this.page.keyboard');
      return this.page.keyboard;
    }

    // Method 5: From stagehand.page
    if (this.stagehand?.page?._page?.keyboard) {
      console.log('   [keyboard] Found via stagehand.page._page.keyboard');
      return this.stagehand.page._page.keyboard;
    }

    // Debug: Explore the page object structure
    if (this.page) {
      const pageKeys = Object.keys(this.page);
      console.log(`   [keyboard] Debug - page keys: ${pageKeys.slice(0, 10).join(', ')}...`);
    }

    console.log('   [keyboard] WARNING: No keyboard found - using Stagehand act() fallback');
    return null;
  }

  /**
   * Fill Stripe payment iframe using Playwright's FrameLocator API
   * This is the most reliable method for Stripe Elements
   * @returns {boolean} true if successful, false if iframe not found
   */
  async fillStripeIframe() {
    console.log('   Attempting Stripe iframe fill...');

    try {
      // Get the underlying Playwright page
      const playwrightPage = this.page._page || this.page;

      // Check if there are any iframes
      const iframeCount = await playwrightPage.locator('iframe').count();
      console.log(`   Found ${iframeCount} iframes`);

      if (iframeCount === 0) {
        console.log('   No iframes found - not a Stripe Elements form');
        return false;
      }

      // Try to find Stripe iframe by various selectors
      const stripeSelectors = [
        'iframe[name*="__privateStripeFrame"]',
        'iframe[src*="stripe"]',
        'iframe[title*="Secure card"]',
        'iframe[title*="card number"]',
        'iframe'  // fallback to first iframe
      ];

      let stripeFrame = null;
      for (const selector of stripeSelectors) {
        try {
          const frame = playwrightPage.frameLocator(selector).first();
          // Test if we can find card number field
          const cardField = frame.locator('[placeholder="Card number"], [name="cardnumber"], input[autocomplete="cc-number"]');
          const cardCount = await cardField.count().catch(() => 0);
          if (cardCount > 0) {
            stripeFrame = frame;
            console.log(`   Found Stripe frame with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!stripeFrame) {
        console.log('   Could not locate Stripe card field in any iframe');
        return false;
      }

      // Fill card number
      console.log('   Filling card number...');
      await stripeFrame.locator('[placeholder="Card number"], [name="cardnumber"], input[autocomplete="cc-number"]').first().fill(PAYMENT_DATA.cardNumber);
      await this.agent.wait(WAIT_TIMES.medium);

      // Fill expiration (MM / YY format)
      console.log('   Filling expiration...');
      await stripeFrame.locator('[placeholder="MM / YY"], [placeholder="MM/YY"], [name="exp-date"], input[autocomplete="cc-exp"]').first().fill('12/28');
      await this.agent.wait(WAIT_TIMES.medium);

      // Fill CVC
      console.log('   Filling CVC...');
      await stripeFrame.locator('[placeholder="CVC"], [placeholder="CVV"], [name="cvc"], input[autocomplete="cc-csc"]').first().fill(PAYMENT_DATA.cvv);
      await this.agent.wait(WAIT_TIMES.medium);

      // Fill ZIP if in same iframe (some Stripe configs include it)
      try {
        const zipField = stripeFrame.locator('[placeholder="ZIP"], [placeholder*="Postal"], [name="postal"], input[autocomplete="postal-code"]');
        if (await zipField.count() > 0) {
          console.log('   Filling ZIP in Stripe frame...');
          await zipField.first().fill(PAYMENT_DATA.zipCode);
          await this.agent.wait(WAIT_TIMES.medium);
        }
      } catch (e) {
        // ZIP might be outside iframe
      }

      // Fill ZIP outside iframe if needed
      try {
        const mainZipField = playwrightPage.locator('input[placeholder*="ZIP"], input[placeholder*="Postal"], input[autocomplete="postal-code"]').first();
        if (await mainZipField.count() > 0) {
          console.log('   Filling ZIP outside iframe...');
          await mainZipField.fill(PAYMENT_DATA.zipCode);
          await this.agent.wait(WAIT_TIMES.medium);
        }
      } catch (e) {
        // Try with Stagehand
        await this.agent.act('Click on ZIP code field and type 78701');
        await this.agent.wait(WAIT_TIMES.medium);
      }

      // Click Place Order
      console.log('   Clicking Place Order...');
      const urlBefore = await this.page.url();
      await this.agent.act('Click "Place Order" button');
      await this.agent.wait(WAIT_TIMES.checkout);

      // Check if successful
      const urlAfter = await this.page.url();
      if (urlAfter !== urlBefore || urlAfter.includes('confirmation')) {
        console.log('   Order placed successfully!');
        return true;
      }

      // Check for errors
      const error = await this.getValidationError();
      if (error) {
        console.log(`   Stripe fill error: ${error}`);
        return false;
      }

      return true;
    } catch (error) {
      console.log(`   Stripe iframe error: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect which checkout section we're on
   * @returns {string} - 'account', 'summary', 'payment', or 'unknown'
   */
  async detectSection() {
    const state = await this.page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();

      // Check for empty, visible password field FIRST (highest priority if visible)
      const passwordField = document.querySelector('input[type="password"]');
      const hasEmptyVisiblePassword = passwordField &&
        passwordField.offsetParent !== null &&  // visible in viewport
        !passwordField.value;  // empty

      // Check for payment section by looking for key text AND visible elements
      // These phrases ONLY appear when payment form is visible
      const paymentKeyPhrases = ['add card details', 'payment method', 'card number', 'mm / yy', 'mm/yy'];
      const hasPaymentText = paymentKeyPhrases.some(phrase => pageText.includes(phrase));

      // Also check for visible card input or place order button
      const cardInput = document.querySelector('input[placeholder*="card" i], input[name*="card" i], [class*="card-number"]');
      const hasVisibleCardInput = cardInput && cardInput.offsetParent !== null;

      // Check for Place order button (only enabled when on payment section)
      const placeOrderBtn = document.querySelector('button');
      let hasPlaceOrderVisible = false;
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText?.toLowerCase().includes('place order') && btn.offsetParent !== null) {
          hasPlaceOrderVisible = true;
          break;
        }
      }

      // Check for Stripe iframes
      const hasStripeIframes = document.querySelector('iframe[src*="stripe"], iframe[name*="stripe"]');

      // Detection priority:
      // 1. If password field is empty and visible → account
      // 2. If payment text/inputs visible → payment
      // 3. Otherwise → summary (need to scroll/proceed)

      if (hasEmptyVisiblePassword) return 'account';
      if (hasPaymentText || hasVisibleCardInput || hasStripeIframes || hasPlaceOrderVisible) return 'payment';

      return 'summary';
    }).catch(() => 'unknown');

    return state;
  }

  /**
   * Handle the full checkout flow
   */
  async handle() {
    console.log('   Checkout page - analyzing current section...');

    const section = await this.detectSection();
    console.log(`   Section detected: ${section}`);

    // Track if we're stuck on the same section
    if (section === this.lastSection) {
      this.sectionAttempts++;
      console.log(`   Same section attempt ${this.sectionAttempts}/2`);

      // After 2 attempts on same section, use AI to figure out what's wrong
      if (this.sectionAttempts >= 2) {
        console.log('   Stuck on same section - using AI to analyze...');
        return this.handleWithAI();
      }
    } else {
      this.lastSection = section;
      this.sectionAttempts = 1;
    }

    switch (section) {
      case 'account':
        return this.handleAccountSection();
      case 'summary':
        return this.handleSummarySection();
      case 'payment':
        return this.handlePaymentSection();
      default:
        return this.handleUnknownSection();
    }
  }

  /**
   * Use AI to analyze the page and determine what action to take
   */
  async handleWithAI() {
    console.log('   AI analyzing checkout page...');
    const decision = await this.agent.decideNextAction();
    console.log(`   AI Decision: ${JSON.stringify(decision)}`);

    if (decision.action === 'fill' && decision.target && decision.value) {
      await this.agent.fill(decision.target, decision.value);
    } else if (decision.action === 'select' && decision.target && decision.value) {
      await this.agent.select(decision.target, decision.value);
    } else if (decision.action === 'click' && decision.target) {
      await this.agent.act(`Click "${decision.target}"`);
    } else {
      // Try scrolling and clicking any visible submit button
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.agent.wait(WAIT_TIMES.medium);
      await this.agent.act('Click the most prominent button to continue (e.g., Save and continue, Place Order, Continue, Submit)');
    }

    await this.agent.wait(WAIT_TIMES.checkout);

    // Reset attempts after AI intervention
    this.sectionAttempts = 0;
  }

  /**
   * Handle account creation section
   * Note: Email is usually pre-filled from contact-info page, only fill password
   */
  async handleAccountSection() {
    console.log('   Account section - filling password only (email is pre-filled)...');

    // Only fill the password field - email should already be populated
    await this.agent.act('Click on the password input field and type cakeroofQ1!');
    await this.agent.wait(WAIT_TIMES.medium);

    // Click Save and continue button
    const clicked = await this.trySubmit();
    if (!clicked) {
      await this.agent.act('Click "Save and continue" or "Create account" or "Continue" button');
    }
    await this.agent.wait(WAIT_TIMES.checkout);
  }

  /**
   * Handle order summary section
   */
  async handleSummarySection() {
    console.log('   Order summary section - scrolling to payment...');
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.agent.wait(WAIT_TIMES.long);

    // Try to proceed to payment
    try {
      await this.agent.act('Click "Continue to payment", "Proceed", or "Next" button');
      await this.agent.wait(WAIT_TIMES.navigation);
    } catch (e) {
      // May already be showing payment
      await this.agent.act('Scroll down to see the payment section');
    }
  }

  /**
   * Handle payment section
   */
  async handlePaymentSection() {
    console.log('   Payment section - filling card details...');

    // First, scroll down to make sure payment form is visible
    console.log('   Scrolling to payment form...');
    await this.page.evaluate(() => {
      // Look for payment section and scroll to it
      const paymentSection = document.querySelector('[class*="payment"], [data-section="payment"], h2, h3');
      const elements = document.querySelectorAll('h2, h3, h4');
      for (const el of elements) {
        if (el.innerText?.toLowerCase().includes('payment') || el.innerText?.toLowerCase().includes('card')) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      // Fallback: scroll down significantly
      window.scrollTo(0, document.body.scrollHeight * 0.6);
    });
    await this.agent.wait(WAIT_TIMES.long);

    // Check for Stripe iframes
    const hasStripe = await this.checkForStripe();

    if (hasStripe) {
      const filled = await this.fillStripePayment();
      if (filled) {
        await this.agent.saveScreenshot('payment_fields_filled');
        await this.submitOrder();
        return;
      }
    }

    // Fallback: Use Stagehand to fill payment fields visually
    await this.fillPaymentVisually();
    await this.agent.saveScreenshot('payment_fields_filled');
    await this.submitOrder();
  }

  /**
   * Handle unknown checkout section
   */
  async handleUnknownSection() {
    console.log('   Unknown section - using AI to analyze...');

    // Use Claude Haiku to decide
    const decision = await this.agent.decideNextAction();
    console.log(`   AI Decision: ${JSON.stringify(decision)}`);

    if (decision.action === 'fill' && decision.target && decision.value) {
      await this.agent.fill(decision.target, decision.value);
      await this.trySubmit();
    } else if (decision.action === 'click' && decision.target) {
      await this.agent.act(`Click "${decision.target}"`);
    } else {
      // Try scrolling and looking for actionable elements
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.trySubmit();
    }

    await this.agent.wait(WAIT_TIMES.checkout);
  }

  /**
   * Scroll to the payment section of checkout page
   */
  async scrollToPayment() {
    await this.page.evaluate(() => {
      // Look for payment section and scroll to it
      const elements = document.querySelectorAll('h2, h3, h4, [class*="payment"], [data-section="payment"]');
      for (const el of elements) {
        const text = el.innerText?.toLowerCase() || '';
        if (text.includes('payment') || text.includes('card details') || text.includes('add card')) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          return;
        }
      }
      // Fallback: scroll down 60% of the page
      window.scrollTo(0, document.body.scrollHeight * 0.6);
    });
  }

  /**
   * Check if Stripe iframes are present
   */
  async checkForStripe() {
    const count = await this.page.evaluate(() => {
      const iframes = document.querySelectorAll(
        'iframe[name^="__privateStripeFrame"], iframe[src*="stripe"], iframe[title*="Secure"]'
      );
      return iframes.length;
    }).catch(() => 0);

    console.log(`   Stripe iframes found: ${count}`);
    return count > 0;
  }

  /**
   * Fill Stripe payment fields via iframes using frameLocator
   * Stripe uses SEPARATE iframes for each field (card, expiry, cvc)
   */
  async fillStripePayment() {
    console.log('   Attempting Stripe iframe payment...');

    try {
      let filledFields = 0;

      // Get all Stripe iframes on the page
      const iframeCount = await this.page.locator('iframe[name^="__privateStripeFrame"]').count();
      console.log(`   Found ${iframeCount} Stripe iframes`);

      // Strategy 1: Use placeholder-based selectors (most reliable)
      const fieldConfigs = [
        { placeholder: 'Card number', value: PAYMENT_DATA.cardNumber, name: 'card number' },
        { placeholder: 'MM / YY', value: PAYMENT_DATA.expiry, name: 'expiry' },
        { placeholder: 'MM/YY', value: PAYMENT_DATA.expiry, name: 'expiry' },
        { placeholder: 'CVC', value: PAYMENT_DATA.cvv, name: 'CVC' },
        { placeholder: 'CVV', value: PAYMENT_DATA.cvv, name: 'CVV' },
        { placeholder: 'ZIP', value: PAYMENT_DATA.zipCode, name: 'ZIP' },
      ];

      // Try each field config across all iframes
      for (const config of fieldConfigs) {
        try {
          // Use frameLocator to access any iframe containing this placeholder
          const frameLocator = this.page.frameLocator('iframe').locator(`[placeholder="${config.placeholder}"]`);
          const count = await frameLocator.count().catch(() => 0);

          if (count > 0) {
            await frameLocator.first().fill(config.value);
            console.log(`   Filled ${config.name} via placeholder`);
            filledFields++;
          }
        } catch (e) {
          // Try next config
        }
      }

      // Strategy 2: Use data-elements-stable-field-name attribute (Stripe Elements)
      if (filledFields === 0) {
        const dataFieldConfigs = [
          { attr: 'cardNumber', value: PAYMENT_DATA.cardNumber, name: 'card number' },
          { attr: 'cardExpiry', value: PAYMENT_DATA.expiry, name: 'expiry' },
          { attr: 'cardCvc', value: PAYMENT_DATA.cvv, name: 'CVC' },
          { attr: 'postalCode', value: PAYMENT_DATA.zipCode, name: 'ZIP' },
        ];

        for (const config of dataFieldConfigs) {
          try {
            const frameLocator = this.page.frameLocator('iframe').locator(`[data-elements-stable-field-name="${config.attr}"]`);
            const count = await frameLocator.count().catch(() => 0);

            if (count > 0) {
              await frameLocator.first().fill(config.value);
              console.log(`   Filled ${config.name} via data attribute`);
              filledFields++;
            }
          } catch (e) {
            // Try next config
          }
        }
      }

      // Strategy 3: Iterate through each iframe individually
      if (filledFields === 0 && iframeCount > 0) {
        console.log('   Trying individual iframe iteration...');
        for (let i = 0; i < iframeCount; i++) {
          try {
            const frameLocator = this.page.frameLocator(`iframe[name^="__privateStripeFrame"]`).nth(i);
            const input = frameLocator.locator('input').first();
            const count = await input.count().catch(() => 0);

            if (count > 0) {
              const placeholder = await input.getAttribute('placeholder').catch(() => '');
              let value = null;
              let fieldName = 'unknown';

              if (placeholder?.includes('Card') || placeholder?.includes('card')) {
                value = PAYMENT_DATA.cardNumber;
                fieldName = 'card number';
              } else if (placeholder?.includes('MM') || placeholder?.includes('exp')) {
                value = PAYMENT_DATA.expiry;
                fieldName = 'expiry';
              } else if (placeholder?.includes('CVC') || placeholder?.includes('CVV')) {
                value = PAYMENT_DATA.cvv;
                fieldName = 'CVC';
              } else if (placeholder?.includes('ZIP') || placeholder?.includes('Postal')) {
                value = PAYMENT_DATA.zipCode;
                fieldName = 'ZIP';
              }

              if (value) {
                await input.fill(value);
                console.log(`   Filled ${fieldName} in iframe ${i}`);
                filledFields++;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

      console.log(`   Total Stripe fields filled: ${filledFields}`);
      return filledFields > 0;
    } catch (error) {
      console.log(`   Stripe fill error: ${error.message}`);
      return false;
    }
  }

  /**
   * Fill payment fields - tries Stripe iframe first, then Tab navigation
   * Sequence: Card → Tab → MM → Tab → YY → Tab → CVV → Tab → Zip → Place Order
   * Max 3 retry attempts if validation errors occur
   */
  async fillPaymentVisually() {
    console.log('   Filling payment fields...');

    // Select credit/debit card payment option if available
    try {
      await this.agent.act('Click on "Credit or debit card" payment option if visible');
      await this.agent.wait(WAIT_TIMES.medium);
    } catch (e) {
      // Already selected or not needed
    }

    // Try Stripe iframe approach first (most reliable)
    const stripeSuccess = await this.fillStripeIframe();
    if (stripeSuccess) {
      console.log('   Stripe iframe filled successfully');
      return true;
    }

    console.log('   Stripe iframe not available, falling back to Tab navigation...');

    const keyboard = await this.getKeyboard();
    if (!keyboard) {
      console.log('   Keyboard not available - using Stagehand Tab actions');
      return this.fillPaymentWithStagehandTabs();
    }

    // Try up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`   Payment attempt ${attempt}/3`);

      // Step 1: Click card field
      await this.agent.act('Click on the card number input field');
      await this.agent.wait(WAIT_TIMES.payment);

      // Step 2: Clear and type card number (16 digits, no spaces)
      await keyboard.press('Control+a');
      await this.agent.wait(WAIT_TIMES.brief);
      await keyboard.type(PAYMENT_DATA.cardNumber, { delay: 30 });
      await this.agent.wait(WAIT_TIMES.medium);

      // Step 3: Tab to MM, type month
      await keyboard.press('Tab');
      await this.agent.wait(WAIT_TIMES.brief);
      await keyboard.type('12', { delay: 30 });
      await this.agent.wait(WAIT_TIMES.medium);

      // Step 4: Tab to YY, type year
      await keyboard.press('Tab');
      await this.agent.wait(WAIT_TIMES.brief);
      await keyboard.type('28', { delay: 30 });
      await this.agent.wait(WAIT_TIMES.medium);

      // Step 5: Tab to CVV, type CVV
      await keyboard.press('Tab');
      await this.agent.wait(WAIT_TIMES.brief);
      await keyboard.type(PAYMENT_DATA.cvv, { delay: 30 });
      await this.agent.wait(WAIT_TIMES.medium);

      // Step 6: Tab to Zip, type zip code
      await keyboard.press('Tab');
      await this.agent.wait(WAIT_TIMES.brief);
      await keyboard.type(PAYMENT_DATA.zipCode, { delay: 30 });
      await this.agent.wait(WAIT_TIMES.payment);

      // Step 7: Try to click Place Order
      console.log('   Clicking Place Order...');
      const urlBefore = await this.page.url();
      await this.agent.act('Click "Place Order" button');
      await this.agent.wait(WAIT_TIMES.checkout);

      // Check if page changed
      const urlAfter = await this.page.url();
      if (urlAfter !== urlBefore || urlAfter.includes('confirmation')) {
        console.log('   Page changed - order submitted!');
        return true;
      }

      // Page didn't change - check for validation errors
      const error = await this.getValidationError();
      console.log(`   Validation error: ${error || 'None detected'}`);

      // Save screenshot with error info
      await this.agent.saveScreenshot(`payment_error_attempt_${attempt}`);
      this.agent.testNotes = this.agent.testNotes || [];
      this.agent.testNotes.push({
        attempt,
        error: error || 'Place Order did not navigate',
        timestamp: new Date().toISOString()
      });

      if (!error) {
        console.log('   No specific error found, button may be disabled');
      } else {
        // Try to fix the specific error
        console.log(`   Attempting to fix: ${error}`);
        await this.fixValidationError(error, keyboard);
      }
    }

    console.log('   Failed after 3 attempts');
    return false;
  }

  /**
   * Fill payment using Stagehand - clicking directly on each field
   * Tab navigation doesn't work reliably with Stagehand, so we click each field
   */
  async fillPaymentWithStagehandTabs() {
    console.log('   Filling payment by clicking each field directly...');

    // First, analyze the form structure
    const formInfo = await this.analyzePaymentForm();
    console.log(`   Form analysis: ${formInfo.inputs?.length || 0} inputs, ${formInfo.iframes?.length || 0} iframes`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`   Payment attempt ${attempt}/3`);

      // Scroll to payment section before each attempt
      await this.scrollToPayment();
      await this.agent.wait(WAIT_TIMES.medium);

      // STEP 1: Click on card number field and type card number (combined action)
      console.log('     1. Click card field and type card number...');
      await this.agent.act('Click on the card number input field and type 4242424242424242');
      await this.agent.wait(WAIT_TIMES.payment);

      // STEP 2: Click on expiration field and type digits one at a time
      console.log('     2. Click expiration field, type digits slowly...');
      await this.agent.act('Click on the expiration date field showing MM / YY');
      await this.agent.wait(WAIT_TIMES.short);
      await this.agent.act('Press key 1');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Press key 2');
      await this.agent.wait(WAIT_TIMES.short);
      await this.agent.act('Press key 2');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Press key 8');
      await this.agent.wait(WAIT_TIMES.medium);

      // STEP 3: Click on CVV field and type CVV (combined action)
      console.log('     3. Click CVV field and type 123...');
      await this.agent.act('Click on the CVV field and type 123');
      await this.agent.wait(WAIT_TIMES.medium);

      // STEP 4: Click on Zip field and type zip code (combined action)
      console.log('     4. Click Zip field and type 78701...');
      await this.agent.act('Click on the Zip code field and type 78701');
      await this.agent.wait(WAIT_TIMES.payment);

      // Take screenshot before clicking Place Order
      await this.agent.saveScreenshot('before_place_order');

      // CRITICAL: Scroll to payment section again before Place Order
      // Page may have scrolled back up during field filling
      console.log('     Scrolling to Place Order button...');
      await this.scrollToPayment();
      await this.agent.wait(WAIT_TIMES.brief);

      // STEP 5: Try Place Order - wait longer for payment processing
      console.log('     5. Click Place Order...');
      const urlBefore = await this.page.url();
      await this.agent.act('Click the "Place order" button');

      // Wait longer for payment processing (3 seconds)
      await this.agent.wait(3000);

      // Check for success - URL change OR confirmation text on page
      const urlAfter = await this.page.url();
      const hasConfirmationText = await this.checkForConfirmation();

      if (urlAfter !== urlBefore || urlAfter.includes('confirmation') || hasConfirmationText) {
        console.log('   SUCCESS: Order confirmed!');
        return true;
      }

      // Check for SPECIFIC validation errors - don't retry without a real error
      const error = await this.getValidationError();
      console.log(`   Validation error: ${error || 'None detected'}`);
      await this.agent.saveScreenshot(`payment_error_attempt_${attempt}`);

      // Only retry if there's an actual validation error message
      if (!error) {
        // Wait a bit more and check again (payment might still be processing)
        console.log('   No error - checking if payment is still processing...');
        await this.agent.wait(2000);

        const urlNow = await this.page.url();
        const hasConfirmNow = await this.checkForConfirmation();
        if (urlNow !== urlBefore || urlNow.includes('confirmation') || hasConfirmNow) {
          console.log('   SUCCESS: Order confirmed after waiting!');
          return true;
        }

        // Still no change and no error - don't retry, just continue to next attempt
        console.log('   Still processing or stuck - continuing...');
        continue;
      }

      // Only fix if there's a specific error
      if (error) {
        console.log(`   Fixing error: ${error}`);
        await this.fixValidationErrorStagehand(error);
      }
    }

    console.log('   Failed after 3 attempts');
    return false;
  }

  /**
   * Fix validation error using Stagehand (no keyboard)
   * Each step is separate to avoid confusion
   */
  async fixValidationErrorStagehand(error) {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('card')) {
      console.log('   Re-entering card number...');
      await this.agent.act('Click on the card number field');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Select all text (Ctrl+A)');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Type: 4242424242424242');
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('expir')) {
      console.log('   Re-entering expiration as 1228...');
      // Click on the expiration field and type MMYY as single value
      await this.agent.act('Click on the expiration field (MM / YY)');
      await this.agent.wait(WAIT_TIMES.medium);
      await this.agent.act('Select all text (Ctrl+A)');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Type: 1228');
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('cvv') || errorLower.includes('cvc')) {
      console.log('   Re-entering CVV...');
      await this.agent.act('Click on the CVV field');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Select all text (Ctrl+A)');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Type: 123');
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('zip') || errorLower.includes('postal')) {
      console.log('   Re-entering zip code...');
      await this.agent.act('Click on the Zip code field');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Select all text (Ctrl+A)');
      await this.agent.wait(WAIT_TIMES.brief);
      await this.agent.act('Type: 78701');
      await this.agent.wait(WAIT_TIMES.payment);
    }
  }

  /**
   * Get validation error from the page
   */
  async getValidationError() {
    return await this.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();

      // Check for common validation errors
      if (text.includes('invalid card number')) return 'Invalid card number';
      if (text.includes('invalid expiration')) return 'Invalid expiration date';
      if (text.includes('invalid cvv') || text.includes('invalid cvc')) return 'Invalid CVV';
      if (text.includes('invalid zip') || text.includes('invalid postal')) return 'Invalid zip code';
      if (text.includes('card number is required')) return 'Card number required';
      if (text.includes('expiration is required')) return 'Expiration required';
      if (text.includes('cvv is required') || text.includes('cvc is required')) return 'CVV required';
      if (text.includes('zip is required') || text.includes('postal is required')) return 'Zip code required';

      // Check for red error text
      const errors = document.querySelectorAll('.text-red-500, .text-red-600, [class*="error"]');
      for (const el of errors) {
        const errText = el.innerText?.trim();
        if (errText && errText.length > 0 && errText.length < 100) {
          return errText;
        }
      }

      return null;
    }).catch(() => null);
  }

  /**
   * Check if the page shows order confirmation content
   * This catches cases where URL hasn't changed but confirmation is shown
   */
  async checkForConfirmation() {
    return await this.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      // Check for confirmation phrases
      const confirmationPhrases = [
        'congrats',
        'congratulations',
        'order has been placed',
        'order confirmed',
        'thank you for your order',
        'your foundation is set',
        'welcome to the club'
      ];
      return confirmationPhrases.some(phrase => text.includes(phrase));
    }).catch(() => false);
  }

  /**
   * Debug: Analyze the payment form structure
   * This helps understand how many input fields exist and their purposes
   */
  async analyzePaymentForm() {
    return await this.page.evaluate(() => {
      const result = {
        inputs: [],
        iframes: [],
        cardText: '',
        visibleText: ''
      };

      // Find all visible inputs
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input, i) => {
        if (input.offsetParent !== null) { // visible
          result.inputs.push({
            index: i,
            type: input.type,
            name: input.name || '',
            placeholder: input.placeholder || '',
            value: input.value ? `${input.value.substring(0, 20)}...` : '',
            id: input.id || '',
            className: input.className?.substring(0, 50) || ''
          });
        }
      });

      // Find iframes (Stripe)
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe, i) => {
        result.iframes.push({
          index: i,
          name: iframe.name || '',
          src: iframe.src?.substring(0, 50) || '',
          title: iframe.title || ''
        });
      });

      // Get the card input area text
      const cardArea = document.querySelector('[class*="card"], [data-testid*="card"]');
      if (cardArea) {
        result.cardText = cardArea.innerText?.substring(0, 100) || '';
      }

      // Get text around "Add card details"
      const bodyText = document.body.innerText;
      const cardIndex = bodyText.toLowerCase().indexOf('add card');
      if (cardIndex > -1) {
        result.visibleText = bodyText.substring(cardIndex, cardIndex + 200);
      }

      return result;
    }).catch(e => ({ error: e.message }));
  }

  /**
   * Fix a specific validation error
   */
  async fixValidationError(error, keyboard) {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('card')) {
      console.log('   Re-entering card number...');
      await this.agent.act('Click on the card number field');
      await this.agent.wait(WAIT_TIMES.short);
      await keyboard.press('Control+a');
      await keyboard.type(PAYMENT_DATA.cardNumber, { delay: 50 });
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('expir')) {
      console.log('   Re-entering expiration...');
      await this.agent.act('Click on the expiration month field');
      await this.agent.wait(WAIT_TIMES.short);
      await keyboard.type('12', { delay: 50 });
      await keyboard.press('Tab');
      await keyboard.type('28', { delay: 50 });
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('cvv') || errorLower.includes('cvc')) {
      console.log('   Re-entering CVV...');
      await this.agent.act('Click on the CVV field');
      await this.agent.wait(WAIT_TIMES.short);
      await keyboard.press('Control+a');
      await keyboard.type(PAYMENT_DATA.cvv, { delay: 50 });
      await this.agent.wait(WAIT_TIMES.payment);
    } else if (errorLower.includes('zip') || errorLower.includes('postal')) {
      console.log('   Re-entering zip code...');
      await this.agent.act('Click on the Zip code field');
      await this.agent.wait(WAIT_TIMES.short);
      await keyboard.press('Control+a');
      await keyboard.type(PAYMENT_DATA.zipCode, { delay: 50 });
      await this.agent.wait(WAIT_TIMES.payment);
    }
  }

  /**
   * Submit the order
   */
  async submitOrder() {
    console.log('   Submitting order...');
    await this.agent.wait(WAIT_TIMES.long);

    // CRITICAL: Scroll to payment section before clicking Place Order
    console.log('   Scrolling to Place Order button...');
    await this.scrollToPayment();
    await this.agent.wait(WAIT_TIMES.brief);

    // Try direct selectors first
    const clicked = await this.trySubmit();
    if (!clicked) {
      // Fallback to Stagehand
      await this.agent.act('Click "Place Order" or "Complete Purchase" or "Submit" button');
    }

    console.log('   Waiting for order processing...');
    await this.agent.wait(WAIT_TIMES.payment);
  }

  /**
   * Try to click checkout/submit buttons directly
   */
  async trySubmit() {
    for (const selector of CHECKOUT_SELECTORS) {
      try {
        const btn = await this.page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click();
          console.log(`   Clicked: ${selector}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    return false;
  }
}
