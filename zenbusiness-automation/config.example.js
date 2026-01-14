/**
 * Configuration Example
 * Copy this to config.js and customize as needed
 */

export const config = {
  // Base URL for testing
  baseUrl: 'https://www.dev.zenbusiness.com',

  // Browser configuration
  browser: {
    headless: false,      // Set to true for CI/CD
    slowMo: 100,          // Milliseconds to slow down actions (0 for full speed)
    timeout: 30000,       // Default timeout for operations
    viewport: {
      width: 1920,
      height: 1080
    }
  },

  // Test credentials
  credentials: {
    password: 'cakeroofQ1!',
    testCard: {
      number: '4242424242424242',
      cvv: '123',
      expiryMonth: '12',
      expiryYear: '2028'
    }
  },

  // Scenario configuration
  scenarios: {
    runLLC: true,
    runDBA: true,
    runCorporation: true,
    runNonprofit: true,
    runCustom: true,
    customScenarioCount: 1
  },

  // Timing configuration
  timing: {
    delayBetweenScenarios: 5000,    // Milliseconds between scenarios
    retryAttempts: 3,                // Number of retry attempts for actions
    retryDelay: 2000,                // Milliseconds between retries
    pageLoadTimeout: 30000,          // Timeout for page loads
    elementTimeout: 10000            // Timeout for finding elements
  },

  // Reporting configuration
  reporting: {
    reportsDirectory: './zenbusiness-automation/reports',
    generateScreenshots: false,      // Capture screenshots at each step
    verboseLogging: true,            // Detailed console output
    saveFailedOnly: false            // Only save reports for failed tests
  },

  // Product offer decisions (override default logic)
  productOffers: {
    // Use 'auto' for intelligent selection, 'accept', or 'decline'
    EIN: 'auto',
    'Worry-Free Compliance': 'auto',
    'Domain Registration': 'auto',
    'Website Builder': 'auto',
    'Business Banking': 'auto',
    'Bookkeeping': 'auto'
  },

  // Persona customization
  persona: {
    // Override default state selection
    preferredStates: ['CA', 'NY', 'DE', 'TX', 'FL'],

    // Override default industries
    preferredIndustries: [
      'Technology',
      'Healthcare',
      'Professional Services'
    ],

    // Custom name lists (optional)
    customFirstNames: [],
    customLastNames: [],

    // Custom business name prefixes/suffixes
    customBusinessPrefixes: [],
    customBusinessSuffixes: []
  },

  // Advanced options
  advanced: {
    // Capture network requests
    captureNetworkLogs: false,

    // Take video recording of tests
    recordVideo: false,

    // Enable trace for debugging
    enableTrace: false,

    // Custom user agent
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',

    // Locale and timezone
    locale: 'en-US',
    timezone: 'America/Los_Angeles'
  }
};

export default config;
