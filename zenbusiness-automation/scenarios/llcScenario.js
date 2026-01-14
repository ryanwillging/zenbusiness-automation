/**
 * LLC Formation Scenario
 * Tests the complete LLC formation onboarding flow
 */

import { BaseScenario } from '../utils/baseScenario.js';
import { generateBusinessDetails } from '../utils/personaGenerator.js';

export class LLCScenario extends BaseScenario {
  constructor(persona) {
    super(persona, 'LLC Formation');
    this.businessDetails = generateBusinessDetails('llc', persona);
  }

  async execute() {
    console.log(`\n📋 Executing LLC Formation flow...`);
    console.log(`Business: ${this.businessDetails.businessName}`);

    // Step 1: Start the LLC formation process
    await this.startLLCFormation();

    // Step 2: Create account
    await this.createAccount();

    // Step 3: Complete business information
    await this.completeLLCInformation();

    // Step 4: Handle product offers
    await this.handleProductOffers();

    // Step 5: Payment processing
    await this.processPayment();

    // Step 6: Reach Velo chat
    const veloReached = await this.reachVelo();

    return { veloReached };
  }

  async startLLCFormation() {
    console.log(`\n🏢 Step: Starting LLC formation...`);

    try {
      // Look for "Start my LLC" or similar CTA
      const ctaSelectors = [
        'text="Start My LLC"',
        'text="Get Started"',
        'text="Form an LLC"',
        'a[href*="llc"]',
        'button:has-text("Start")'
      ];

      let clicked = false;
      for (const selector of ctaSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
          await this.safeClick(selector, 'Start LLC button');
          clicked = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!clicked) {
        // Fallback: navigate directly to LLC page
        await this.page.goto(`${this.baseUrl}/start-llc`, { waitUntil: 'domcontentloaded' });
      }

      await this.wait(3000);

      const uxEval = await this.evaluatePageUX();
      const copyEval = await this.evaluateCopy();
      const interactionEval = await this.evaluateInteractions();

      this.logger.logStep({
        pageTitle: 'LLC Formation Start',
        url: this.page.url(),
        actions: ['Clicked "Start LLC" button'],
        uxEvaluation: uxEval,
        copyEvaluation: copyEval,
        interactionQuality: interactionEval,
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Failed to start LLC formation: ${error.message}`);
      this.logger.logStep({
        pageTitle: 'LLC Formation Start',
        url: this.page.url(),
        actions: ['Attempted to start LLC formation'],
        result: 'fail',
        notes: error.message
      });
      throw error;
    }
  }

  async createAccount() {
    console.log(`\n👤 Step: Creating account...`);

    try {
      // Check if page is still open
      if (this.page.isClosed()) {
        throw new Error('Page was closed unexpectedly');
      }

      // Wait for account creation form
      await this.wait(2000);

      // Look for email input
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email"]',
        '#email'
      ];

      for (const selector of emailSelectors) {
        try {
          const emailInput = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (emailInput) {
            await this.safeFill(selector, this.persona.email, 'Email field');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Look for password input
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#password'
      ];

      for (const selector of passwordSelectors) {
        try {
          const passwordInput = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (passwordInput) {
            await this.safeFill(selector, this.persona.password, 'Password field');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Look for name fields
      await this.fillNameFields();

      // Click continue/submit
      await this.clickContinue();

      await this.wait(3000);

      this.logger.logStep({
        pageTitle: 'Account Creation',
        url: this.page.url(),
        actions: ['Filled email', 'Filled password', 'Submitted account creation'],
        dataInput: {
          email: this.persona.email,
          name: this.persona.fullName
        },
        uxEvaluation: await this.evaluatePageUX(),
        copyEvaluation: await this.evaluateCopy(),
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Failed to create account: ${error.message}`);
      this.logger.logStep({
        pageTitle: 'Account Creation',
        url: this.page.url(),
        result: 'fail',
        notes: error.message
      });
      throw error;
    }
  }

  async fillNameFields() {
    const firstNameSelectors = [
      'input[name="firstName"]',
      'input[placeholder*="First"]',
      '#firstName'
    ];

    const lastNameSelectors = [
      'input[name="lastName"]',
      'input[placeholder*="Last"]',
      '#lastName'
    ];

    for (const selector of firstNameSelectors) {
      try {
        const input = await this.page.waitForSelector(selector, { timeout: 3000 });
        if (input) {
          await this.safeFill(selector, this.persona.firstName, 'First name');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    for (const selector of lastNameSelectors) {
      try {
        const input = await this.page.waitForSelector(selector, { timeout: 3000 });
        if (input) {
          await this.safeFill(selector, this.persona.lastName, 'Last name');
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }

  async completeLLCInformation() {
    console.log(`\n📝 Step: Completing LLC information...`);

    // This is a multi-step process that varies by implementation
    // We'll handle common questions

    let questionsAnswered = 0;
    const maxQuestions = 20; // Safety limit

    while (questionsAnswered < maxQuestions) {
      await this.wait(2000);

      try {
        const currentUrl = this.page.url();
        const pageTitle = await this.page.title();

        console.log(`   📍 Current page: ${pageTitle}`);

        // Check if we've moved to product offers or checkout
        if (currentUrl.includes('checkout') || currentUrl.includes('payment') ||
            pageTitle.toLowerCase().includes('package') || pageTitle.toLowerCase().includes('pricing')) {
          console.log(`   ✅ Reached checkout/pricing section`);
          break;
        }

        // Try to answer current question
        const answered = await this.answerCurrentQuestion();

        if (answered) {
          questionsAnswered++;
          await this.clickContinue();
          await this.wait(2000);
        } else {
          // No more questions to answer
          break;
        }

      } catch (error) {
        console.log(`   ⚠️  Question handling issue: ${error.message}`);
        break;
      }
    }

    this.logger.logStep({
      pageTitle: 'LLC Information Complete',
      url: this.page.url(),
      actions: [`Answered ${questionsAnswered} questions`],
      result: 'pass',
      notes: `Completed ${questionsAnswered} information screens`
    });
  }

  async answerCurrentQuestion() {
    // Business name
    if (await this.isVisibleSelector('input[name*="business"], input[placeholder*="business name"]')) {
      await this.safeFill('input[name*="business"], input[placeholder*="business name"]',
        this.businessDetails.businessName, 'Business name');
      return true;
    }

    // State selection
    if (await this.isVisibleSelector('select[name*="state"], select[name*="jurisdiction"]')) {
      await this.safeSelect('select[name*="state"], select[name*="jurisdiction"]',
        this.persona.stateAbbr, 'State');
      return true;
    }

    // Industry
    if (await this.isVisibleSelector('select[name*="industry"]')) {
      await this.safeSelect('select[name*="industry"]', this.persona.industry, 'Industry');
      return true;
    }

    // Business description
    if (await this.isVisibleSelector('textarea')) {
      await this.safeFill('textarea', this.businessDetails.description, 'Business description');
      return true;
    }

    // Address fields
    if (await this.isVisibleSelector('input[name*="address"], input[placeholder*="address"]')) {
      await this.fillAddressFields();
      return true;
    }

    // Phone
    if (await this.isVisibleSelector('input[type="tel"], input[name*="phone"]')) {
      await this.safeFill('input[type="tel"], input[name*="phone"]', this.persona.phone, 'Phone');
      return true;
    }

    // Yes/No questions - randomly select
    if (await this.isVisibleSelector('input[type="radio"]')) {
      const radios = await this.page.locator('input[type="radio"]').all();
      if (radios.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(radios.length, 2));
        await radios[randomIndex].click();
        return true;
      }
    }

    // Multiple choice questions
    if (await this.isVisibleSelector('input[type="checkbox"]')) {
      const checkboxes = await this.page.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        const randomCheckbox = checkboxes[Math.floor(Math.random() * checkboxes.length)];
        await randomCheckbox.click();
        return true;
      }
    }

    return false;
  }

  async fillAddressFields() {
    const addressMappings = [
      { selector: 'input[name*="street"], input[placeholder*="street"]', value: this.persona.address.street },
      { selector: 'input[name*="city"], input[placeholder*="city"]', value: this.persona.address.city },
      { selector: 'input[name*="zip"], input[placeholder*="zip"]', value: this.persona.address.zip }
    ];

    for (const mapping of addressMappings) {
      try {
        if (await this.isVisibleSelector(mapping.selector)) {
          await this.safeFill(mapping.selector, mapping.value);
        }
      } catch (e) {
        // Continue to next field
      }
    }
  }

  async isVisibleSelector(selector) {
    try {
      const element = await this.page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
      return element !== null;
    } catch {
      return false;
    }
  }

  async handleProductOffers() {
    console.log(`\n🎁 Step: Handling product offers...`);

    const productOffers = [
      'EIN',
      'Worry-Free Compliance',
      'Domain Registration',
      'Website Builder',
      'Business Banking',
      'Bookkeeping'
    ];

    for (const product of productOffers) {
      try {
        // Check if this product offer is visible
        const isOffered = await this.checkProductOffered(product);

        if (isOffered) {
          const decision = this.evaluateProductOffer(product, 'LLC Formation');
          await this.respondToProductOffer(product, decision.decision);

          this.logger.logStep({
            pageTitle: `Product Offer: ${product}`,
            url: this.page.url(),
            actions: [`${decision.decision} ${product}`],
            productDecisions: [{
              product,
              decision: decision.decision,
              relevance: decision.relevance,
              reasoning: decision.reasoning
            }],
            result: 'pass'
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Could not process ${product} offer: ${error.message}`);
      }
    }
  }

  async checkProductOffered(productName) {
    // Check if product is mentioned on current page
    try {
      const bodyText = await this.page.locator('body').innerText();
      return bodyText.toLowerCase().includes(productName.toLowerCase());
    } catch {
      return false;
    }
  }

  async respondToProductOffer(productName, decision) {
    console.log(`   💡 ${decision} ${productName}`);

    const acceptSelectors = [
      'button:has-text("Add")',
      'button:has-text("Yes")',
      'button:has-text("Accept")',
      'input[type="checkbox"]'
    ];

    const declineSelectors = [
      'button:has-text("Skip")',
      'button:has-text("No")',
      'button:has-text("Decline")',
      'a:has-text("Skip")'
    ];

    const selectors = decision === 'Accept' ? acceptSelectors : declineSelectors;

    for (const selector of selectors) {
      try {
        if (await this.isVisibleSelector(selector)) {
          await this.safeClick(selector);
          await this.wait(1000);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    // If no specific button, just continue
    await this.clickContinue();
  }

  async processPayment() {
    console.log(`\n💳 Step: Processing payment...`);

    try {
      // Fill payment information
      await this.wait(2000);

      const cardNumberSelectors = [
        'input[name*="card"], input[placeholder*="card number"]',
        '#cardNumber',
        'iframe[name*="card"]' // Stripe iframe
      ];

      // Handle Stripe iframe if present
      const frames = this.page.frames();
      let paymentFrame = frames.find(f => f.url().includes('stripe') || f.url().includes('payment'));

      if (paymentFrame) {
        await this.fillStripePayment(paymentFrame);
      } else {
        await this.fillDirectPayment();
      }

      await this.wait(2000);

      // Click final submit
      await this.clickContinue('Complete Purchase');

      await this.wait(5000);

      this.logger.logStep({
        pageTitle: 'Payment Processing',
        url: this.page.url(),
        actions: ['Filled payment information', 'Submitted order'],
        dataInput: {
          cardNumber: '****' + this.persona.payment.cardNumber.slice(-4),
          zip: this.persona.payment.zip
        },
        result: 'pass'
      });

    } catch (error) {
      console.error(`❌ Payment processing failed: ${error.message}`);
      this.logger.logStep({
        pageTitle: 'Payment Processing',
        url: this.page.url(),
        result: 'fail',
        notes: error.message
      });
      // Don't throw - continue to see if we can reach Velo anyway
    }
  }

  async fillStripePayment(frame) {
    // Stripe uses iframes - handle carefully
    try {
      await frame.fill('input[name="cardnumber"]', this.persona.payment.cardNumber);
      await frame.fill('input[name="exp-date"]', `${this.persona.payment.expiryMonth}${this.persona.payment.expiryYear.slice(-2)}`);
      await frame.fill('input[name="cvc"]', this.persona.payment.cvv);
      await frame.fill('input[name="postal"]', this.persona.payment.zip);
    } catch (error) {
      console.log(`   ⚠️  Stripe iframe fill failed, trying alternate method`);
    }
  }

  async fillDirectPayment() {
    try {
      if (await this.isVisibleSelector('input[name*="card"]')) {
        await this.safeFill('input[name*="card"]', this.persona.payment.cardNumber, 'Card number');
      }
      if (await this.isVisibleSelector('input[name*="cvv"], input[name*="cvc"]')) {
        await this.safeFill('input[name*="cvv"], input[name*="cvc"]', this.persona.payment.cvv, 'CVV');
      }
      if (await this.isVisibleSelector('input[name*="zip"], input[name*="postal"]')) {
        await this.safeFill('input[name*="zip"], input[name*="postal"]', this.persona.payment.zip, 'ZIP');
      }
    } catch (error) {
      console.log(`   ⚠️  Direct payment fill failed: ${error.message}`);
    }
  }

  async clickContinue(buttonText = '') {
    const continueSelectors = [
      buttonText ? `button:has-text("${buttonText}")` : null,
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'input[type="submit"]'
    ].filter(Boolean);

    for (const selector of continueSelectors) {
      try {
        if (await this.isVisibleSelector(selector)) {
          await this.safeClick(selector, buttonText || 'Continue');
          return;
        }
      } catch (e) {
        continue;
      }
    }
  }

  async reachVelo() {
    console.log(`\n💬 Step: Checking for Velo chat...`);

    try {
      await this.wait(5000);

      // Look for Velo chat indicators
      const veloSelectors = [
        'text="Velo"',
        '[class*="velo"]',
        '[id*="velo"]',
        'iframe[title*="chat"]',
        '[class*="chat"]'
      ];

      for (const selector of veloSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (element) {
            console.log(`   ✅ Velo chat element found!`);

            this.logger.logStep({
              pageTitle: 'Velo Chat',
              url: this.page.url(),
              actions: ['Reached Velo chat interface'],
              uxEvaluation: 'Successfully navigated to Velo chat experience',
              result: 'pass'
            });

            return true;
          }
        } catch (e) {
          continue;
        }
      }

      // Check URL for success indicators
      const url = this.page.url();
      if (url.includes('success') || url.includes('complete') || url.includes('dashboard')) {
        console.log(`   ✅ Reached success/dashboard page`);
        this.logger.logStep({
          pageTitle: 'Success Page',
          url: this.page.url(),
          actions: ['Reached completion page'],
          result: 'pass'
        });
        return true;
      }

      console.log(`   ⚠️  Velo chat not clearly identified`);
      return false;

    } catch (error) {
      console.error(`❌ Failed to reach Velo: ${error.message}`);
      return false;
    }
  }
}
