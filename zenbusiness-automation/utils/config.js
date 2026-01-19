/**
 * Centralized configuration constants for ZenBusiness automation
 */

// Test payment data
export const PAYMENT_DATA = {
  cardNumber: '4242424242424242',
  expiry: '12/28',
  expiryStripe: '1228', // MMYY format for Stripe
  cvv: '123',
  zipCode: '78701'
};

// Test credentials
export const TEST_CREDENTIALS = {
  password: 'cakeroofQ1!'
};

// Wait time constants (in milliseconds)
// Fast for general navigation, slower for payment to avoid errors
export const WAIT_TIMES = {
  brief: 100,      // Was 200 - minimal pause
  short: 150,      // Was 300 - quick pause
  medium: 300,     // Was 500 - standard pause
  long: 500,       // Was 1000 - longer pause
  navigation: 500, // Was 2000 - after page navigation
  checkout: 1000,  // Was 3000 - checkout transitions
  payment: 2000    // Was 5000 - payment fields (keep longer for accuracy)
};

// Default test goals
export const DEFAULT_TEST_GOALS = {
  packagePreference: 'starter',
  upsellStrategy: 'decline_all',
  upsells: {
    complianceMonitoring: false,
    einService: false,
    operatingAgreement: false,
    registeredAgent: true,
    rushFiling: false,
    businessBanking: false,
    moneyPro: false
  }
};

// CTA button selectors (in priority order)
export const CTA_SELECTORS = [
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

// Checkout button selectors
export const CHECKOUT_SELECTORS = [
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

// Field configuration - unified selector and value mapping
export const FIELD_CONFIG = {
  email: {
    selectors: ['input[type="email"]', 'input[name*="email"]', '[placeholder*="email" i]'],
    getValue: (persona) => persona.email
  },
  password: {
    selectors: ['input[type="password"]', 'input[name*="password"]'],
    getValue: () => TEST_CREDENTIALS.password
  },
  firstName: {
    selectors: ['input[name*="first"]', '[placeholder*="first" i]'],
    getValue: (persona) => persona.firstName
  },
  lastName: {
    selectors: ['input[name*="last"]', '[placeholder*="last" i]'],
    getValue: (persona) => persona.lastName
  },
  fullName: {
    selectors: ['input[name*="name"]', '[placeholder*="name" i]'],
    getValue: (persona) => persona.fullName
  },
  phone: {
    selectors: ['input[type="tel"]', 'input[name*="phone"]', '[placeholder*="phone" i]'],
    getValue: (persona) => persona.phone
  },
  businessName: {
    selectors: ['input[name*="business"]', 'input[name*="company"]', '[placeholder*="business" i]'],
    getValue: (_, businessDetails) => businessDetails?.businessName
  },
  address: {
    selectors: ['input[name*="address"]', 'input[name*="street"]', '[placeholder*="address" i]'],
    getValue: (persona) => persona.address?.street || '123 Main Street'
  },
  city: {
    selectors: ['input[name*="city"]', '[placeholder*="city" i]'],
    getValue: (persona) => persona.address?.city || 'Las Vegas'
  },
  zip: {
    selectors: ['input[name*="zip"]', 'input[name*="postal"]', '[placeholder*="zip" i]'],
    getValue: (persona) => persona.address?.zip || '89101'
  },
  state: {
    selectors: ['select[name*="state"]', '[aria-label*="state" i]'],
    getValue: (persona) => persona.state
  },
  cardNumber: {
    selectors: ['input[name*="card"]', 'input[name*="number"]', '[placeholder*="card" i]'],
    getValue: () => PAYMENT_DATA.cardNumber
  },
  cvv: {
    selectors: ['input[name*="cvv"]', 'input[name*="cvc"]', '[placeholder*="cvv" i]'],
    getValue: () => PAYMENT_DATA.cvv
  },
  expiry: {
    selectors: ['input[name*="exp"]', '[placeholder*="exp" i]', '[placeholder*="mm" i]'],
    getValue: () => PAYMENT_DATA.expiry
  }
};

// County dropdown selectors
export const COUNTY_SELECTORS = [
  'select[name*="county"]',
  'select[id*="county"]',
  '[data-testid*="county"] select',
  'select[aria-label*="county" i]',
  '.county-select select',
  '[class*="county"] [role="combobox"]',
  'button:has-text("Select county")',
  'button:has-text("Select your county")',
  '[placeholder*="county" i]'
];

// Stripe iframe selectors
export const STRIPE_SELECTORS = [
  'iframe[name*="__privateStripeFrame"]',
  'iframe[title*="card" i]',
  'iframe[title*="Secure" i]',
  'iframe[src*="stripe"]',
  'iframe[src*="js.stripe.com"]',
  'iframe[class*="stripe"]',
  '[data-stripe] iframe',
  '.StripeElement iframe'
];

/**
 * Get field value from persona based on field description
 */
export function getFieldValue(fieldDescription, persona, businessDetails) {
  const d = fieldDescription.toLowerCase();

  // Check each field config for a match
  for (const [key, config] of Object.entries(FIELD_CONFIG)) {
    if (d.includes(key.toLowerCase()) ||
        (key === 'firstName' && d.includes('first name')) ||
        (key === 'lastName' && d.includes('last name')) ||
        (key === 'fullName' && d.includes('full name')) ||
        (key === 'businessName' && (d.includes('business') || d.includes('company'))) ||
        (key === 'cardNumber' && d.includes('card') && d.includes('number')) ||
        (key === 'expiry' && (d.includes('expir') || d.includes('mm/yy'))) ||
        (key === 'cvv' && (d.includes('cvv') || d.includes('cvc') || d.includes('security')))) {
      return config.getValue(persona, businessDetails);
    }
  }

  return null;
}

/**
 * Get selectors for a field based on description
 */
export function getFieldSelectors(fieldDescription) {
  const d = fieldDescription.toLowerCase();
  const selectors = [];

  for (const [key, config] of Object.entries(FIELD_CONFIG)) {
    const keyLower = key.toLowerCase();
    if (d.includes(keyLower) ||
        (key === 'firstName' && d.includes('first')) ||
        (key === 'lastName' && d.includes('last')) ||
        (key === 'businessName' && (d.includes('business') || d.includes('company'))) ||
        (key === 'cardNumber' && d.includes('card')) ||
        (key === 'cvv' && (d.includes('cvv') || d.includes('cvc')))) {
      selectors.push(...config.selectors);
    }
  }

  // Generic fallback
  if (selectors.length === 0) {
    selectors.push('input:visible', 'textarea:visible');
  }

  return selectors;
}
