/**
 * Data-driven page handler registry for ZenBusiness automation
 * Replaces sequential if-else URL matching with O(1) lookup
 */

// Page handler definitions
export const PAGE_HANDLERS = [
  // End state - Velo dashboard (final destination)
  {
    name: 'veloDashboard',
    urlPatterns: ['velo', '/app/', '/dashboard'],
    excludePatterns: ['checkout'],
    isEndState: true
  },

  // Post-checkout confirmation - continue through (NOT an end state anymore)
  {
    name: 'orderConfirmation',
    urlPatterns: ['llc-addons/confirmation', 'confirmation', 'thank-you'],
    excludePatterns: ['velo'],
    handler: 'handlePostCheckoutConfirmation'
  },

  // Post-checkout journey/onboarding flow
  {
    name: 'postCheckoutJourney',
    urlPatterns: ['/f/journey', '/f/'],
    handler: 'handlePostCheckoutJourney'
  },

  // Post-checkout checkout pages (product purchase pages)
  {
    name: 'postCheckoutCheckout',
    urlPatterns: ['llc-addons/checkout'],
    handler: 'handlePostCheckoutCheckout'
  },

  // Post-checkout conclusion page (summary before journey)
  {
    name: 'postCheckoutConclusion',
    urlPatterns: ['llc-addons/conclusion'],
    handler: 'handlePostCheckoutConclusion'
  },

  // Post-checkout upsells (decline these)
  {
    name: 'postCheckoutUpsell',
    urlPatterns: ['llc-addons/business-kit', 'llc-addons/website', 'llc-addons/'],
    excludePatterns: ['confirmation', 'checkout', 'conclusion'],
    handler: 'handleUpsell',
    config: { upsellKey: 'postCheckout', defaultAccept: false, label: 'Post-Checkout Upsell' }
  },

  // Banking application (post-checkout)
  {
    name: 'bankingApplication',
    urlPatterns: ['banking-application', 'bank-account', 'open-account'],
    handler: 'handleBankingApplication'
  },

  // Form pages
  {
    name: 'businessState',
    urlPatterns: ['business-state', '/shop/llc/?'],
    excludePatterns: ['business-name'],
    handler: 'handleBusinessState'
  },
  {
    name: 'businessName',
    urlPatterns: ['business-name'],
    handler: 'handleBusinessName'
  },
  {
    name: 'contactInfo',
    urlPatterns: ['contact-info'],
    handler: 'handleContactInfo'
  },
  {
    name: 'existingBusiness',
    urlPatterns: ['existing-business', 'designator'],
    handler: 'handleExistingBusiness'
  },
  {
    name: 'businessExperience',
    urlPatterns: ['business-experience', 'business-stage'],
    handler: 'handleBusinessExperience'
  },
  {
    name: 'industry',
    urlPatterns: ['industry'],
    handler: 'handleIndustry'
  },
  {
    name: 'accountCreation',
    urlPatterns: ['sign-up', 'create-account', 'register'],
    excludePatterns: ['registered-agent'],
    handler: 'handleAccountCreation'
  },

  // Package selection
  {
    name: 'packageSelection',
    urlPatterns: ['package-selection', 'pricing', 'packages'],
    handler: 'handlePackageSelection'
  },

  // Upsell pages - use generic handler with config
  {
    name: 'registeredAgent',
    urlPatterns: ['registered-agent'],
    handler: 'handleUpsell',
    config: { upsellKey: 'registeredAgent', defaultAccept: true, label: 'Registered Agent' }
  },
  {
    name: 'compliance',
    urlPatterns: ['worry-free-compliance', 'compliance'],
    excludePatterns: ['compliance-monitoring'],
    handler: 'handleUpsell',
    config: { upsellKey: 'complianceMonitoring', defaultAccept: false, label: 'Compliance' }
  },
  {
    name: 'ein',
    urlPatterns: ['employer-identification-number', 'ein'],
    handler: 'handleUpsell',
    config: { upsellKey: 'einService', defaultAccept: false, label: 'EIN' }
  },
  {
    name: 'operatingAgreement',
    urlPatterns: ['operating-agreement'],
    handler: 'handleUpsell',
    config: { upsellKey: 'operatingAgreement', defaultAccept: false, label: 'Operating Agreement' }
  },
  {
    name: 'moneyPro',
    urlPatterns: ['money-pro', 'money'],
    excludePatterns: ['money-back'],
    handler: 'handleUpsell',
    config: { upsellKey: 'moneyPro', defaultAccept: false, label: 'Money Pro' }
  },
  {
    name: 'rushFiling',
    urlPatterns: ['rush-filing', 'rush'],
    handler: 'handleUpsell',
    config: { upsellKey: 'rushFiling', defaultAccept: false, label: 'Rush Filing' }
  },
  {
    name: 'banking',
    urlPatterns: ['banking', 'bank'],
    excludePatterns: ['banking-application', 'bank-account'],
    handler: 'handleUpsell',
    config: { upsellKey: 'businessBanking', defaultAccept: false, label: 'Banking' }
  },
  {
    name: 'genericUpsell',
    urlPatterns: ['upsell', 'add-on', 'upgrade'],
    handler: 'handleUpsell'
  },

  // Checkout (lowest priority for URL matching)
  {
    name: 'checkout',
    urlPatterns: ['checkout'],
    handler: 'handleCheckout'
  }
];

/**
 * Find the appropriate handler for a URL
 * @param {string} url - The current page URL
 * @returns {Object|null} - Handler config or null if no match
 */
export function findHandler(url) {
  for (const pageConfig of PAGE_HANDLERS) {
    // Check if URL matches any pattern
    const matches = pageConfig.urlPatterns.some(pattern => url.includes(pattern));
    if (!matches) continue;

    // Check exclusion patterns
    if (pageConfig.excludePatterns) {
      const excluded = pageConfig.excludePatterns.some(pattern => url.includes(pattern));
      if (excluded) continue;
    }

    return pageConfig;
  }
  return null;
}

/**
 * Check if URL represents an end state
 * @param {string} url - The current page URL
 * @returns {boolean}
 */
export function isEndState(url) {
  const handler = findHandler(url);
  return handler?.isEndState === true;
}

/**
 * Get handler name for logging
 * @param {string} url - The current page URL
 * @returns {string}
 */
export function getHandlerName(url) {
  const handler = findHandler(url);
  return handler?.name || 'unknown';
}
