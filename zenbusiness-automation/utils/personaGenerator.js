import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Persona and Credential Generator
 * Generates realistic test personas with credentials for each test scenario
 */

// Counter file for tracking daily test counts
const COUNTER_FILE = path.join(__dirname, '..', '.test-counter.json');

/**
 * Gets today's date in YYYYMMDD format
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Gets and increments the daily test counter
 */
function getTestCount() {
  const today = getTodayDate();
  let counterData = { date: today, count: 0 };

  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      if (data.date === today) {
        counterData = data;
      }
    }
  } catch (e) {
    // If file doesn't exist or is corrupted, start fresh
  }

  counterData.count++;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counterData, null, 2));

  return counterData.count;
}

const firstNames = [
  'Sarah', 'Michael', 'Jennifer', 'David', 'Jessica', 'James', 'Ashley', 'Robert',
  'Emily', 'William', 'Samantha', 'Christopher', 'Amanda', 'Daniel', 'Melissa',
  'Matthew', 'Lauren', 'Anthony', 'Nicole', 'Kevin', 'Rachel', 'Brian', 'Stephanie'
];

const lastNames = [
  'Anderson', 'Baker', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris',
  'Jackson', 'Kim', 'Lee', 'Martinez', 'Nelson', 'Ortiz', 'Patel', 'Quinn',
  'Robinson', 'Smith', 'Taylor', 'Underwood', 'Valdez', 'Wilson', 'Young', 'Zhang'
];

const businessTypes = {
  llc: [
    'coffee roastery', 'boutique fitness studio', 'digital marketing agency',
    'artisan bakery', 'eco-friendly cleaning service', 'mobile app development',
    'pet grooming service', 'organic skincare line', 'craft brewery',
    'virtual assistant service', 'landscaping company', 'photography studio'
  ],
  dba: [
    'freelance graphic design', 'consulting service', 'handmade jewelry',
    'personal training', 'web design', 'event planning', 'mobile detailing',
    'catering service', 'tutoring service', 'pet sitting'
  ],
  corporation: [
    'SaaS platform', 'fintech startup', 'biotech research', 'AI-powered analytics',
    'e-commerce platform', 'renewable energy solutions', 'healthtech innovation',
    'edtech platform', 'blockchain technology', 'robotics manufacturing'
  ],
  nonprofit: [
    'community education center', 'animal rescue organization',
    'youth mentorship program', 'environmental conservation',
    'food security initiative', 'arts education foundation',
    'homeless outreach', 'mental health advocacy', 'literacy program'
  ]
};

const industries = [
  'Technology', 'Healthcare', 'Retail', 'Food & Beverage', 'Professional Services',
  'Education', 'Real Estate', 'Manufacturing', 'Entertainment', 'Hospitality'
];

const usStates = [
  { name: 'California', abbr: 'CA', zip: '90210' },
  { name: 'New York', abbr: 'NY', zip: '10001' },
  { name: 'Texas', abbr: 'TX', zip: '75001' },
  { name: 'Florida', abbr: 'FL', zip: '33101' },
  { name: 'Delaware', abbr: 'DE', zip: '19901' },
  { name: 'Nevada', abbr: 'NV', zip: '89101' },
  { name: 'Wyoming', abbr: 'WY', zip: '82001' },
  { name: 'Colorado', abbr: 'CO', zip: '80201' },
  { name: 'Washington', abbr: 'WA', zip: '98101' },
  { name: 'Oregon', abbr: 'OR', zip: '97201' }
];

/**
 * Generates a unique persona for a test scenario
 * @param {string} scenarioType - Type of business scenario (llc, dba, corporation, nonprofit)
 * @param {string} goalType - Test goal type: 'minimal', 'standard', 'premium', 'rush', or 'random'
 * @returns {Object} Persona object with all necessary details
 */
export function generatePersona(scenarioType, goalType = 'minimal') {
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 8);

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const state = usStates[Math.floor(Math.random() * usStates.length)];
  const industry = industries[Math.floor(Math.random() * industries.length)];

  const businessIdeas = businessTypes[scenarioType] || businessTypes.llc;
  const businessIdea = businessIdeas[Math.floor(Math.random() * businessIdeas.length)];

  // Get today's date and test count for email
  const today = getTodayDate();
  const testCount = getTestCount();
  const email = `ryan.willging+zbtest${today}_${testCount}@zenbusiness.com`;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    password: 'cakeroofQ1!',
    phone: '513-236-3066',
    businessIdea,
    industry,
    state: state.name,
    stateAbbr: state.abbr,
    address: {
      street: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Maple', 'Pine', 'Cedar'][Math.floor(Math.random() * 5)]} Street`,
      city: ['Springfield', 'Riverside', 'Madison', 'Georgetown', 'Franklin'][Math.floor(Math.random() * 5)],
      state: state.name,
      stateAbbr: state.abbr,
      zip: state.zip
    },
    payment: {
      cardNumber: '4242424242424242',
      cvv: '123',
      zip: state.zip,
      expiryMonth: '12',
      expiryYear: '2028'
    },
    background: generateBackground(scenarioType, businessIdea),
    motivation: generateMotivation(scenarioType),
    testGoals: generateTestGoals(goalType),
    timestamp: new Date().toISOString(),
    uniqueId
  };
}

/**
 * Generates a realistic background story for the persona
 */
function generateBackground(scenarioType, businessIdea) {
  const backgrounds = {
    llc: `Experienced professional looking to start a ${businessIdea} business. Has industry knowledge and is ready to formalize the business structure.`,
    dba: `Sole proprietor operating a ${businessIdea} business and needs to register a trade name for brand recognition.`,
    corporation: `Entrepreneur launching a ${businessIdea} with plans for investor funding and significant growth. Needs corporate structure for scalability.`,
    nonprofit: `Community leader passionate about ${businessIdea}. Seeking 501(c)(3) status to attract donors and grants.`
  };

  return backgrounds[scenarioType] || backgrounds.llc;
}

/**
 * Generates motivation for starting the business
 */
function generateMotivation(scenarioType) {
  const motivations = {
    llc: 'Personal liability protection and professional credibility',
    dba: 'Establish brand identity while maintaining simple business structure',
    corporation: 'Attract investors and position for rapid growth',
    nonprofit: 'Make a meaningful impact in the community with tax-exempt status'
  };

  return motivations[scenarioType] || 'Build a successful business';
}

/**
 * Test goal presets - defines what the test is trying to accomplish
 */
const testGoalPresets = {
  // Minimal path - cheapest option but with registered agent
  minimal: {
    name: 'Minimal Purchase',
    description: 'Test the cheapest path through checkout with registered agent',
    packagePreference: 'starter',
    upsellStrategy: 'selective',
    upsells: {
      rushFiling: false,
      registeredAgent: true,       // Essential for compliance
      operatingAgreement: false,
      einService: false,
      businessBanking: false,
      website: false,
      businessEmail: false,
      complianceMonitoring: false,
      annualReport: false,
      businessLicenseSearch: false
    }
  },

  // Standard path - select reasonable options for a real business
  standard: {
    name: 'Standard Business Setup',
    description: 'Typical customer selecting sensible options',
    packagePreference: 'pro',
    upsellStrategy: 'selective',
    upsells: {
      rushFiling: false,           // Not urgent
      registeredAgent: true,       // Important for compliance
      operatingAgreement: true,    // Recommended for LLCs
      einService: true,            // Need for banking/taxes
      businessBanking: false,      // Will do separately
      website: false,              // Has own solution
      businessEmail: false,        // Has own solution
      complianceMonitoring: true,  // Peace of mind
      annualReport: false,         // Can handle ourselves
      businessLicenseSearch: false // Will research ourselves
    }
  },

  // Premium path - buy everything
  premium: {
    name: 'Premium Full Service',
    description: 'Customer wanting full-service experience',
    packagePreference: 'premium',
    upsellStrategy: 'accept_all',
    upsells: {
      rushFiling: true,
      registeredAgent: true,
      operatingAgreement: true,
      einService: true,
      businessBanking: true,
      website: true,
      businessEmail: true,
      complianceMonitoring: true,
      annualReport: true,
      businessLicenseSearch: true
    }
  },

  // ZenBusiness Banking path - customer wants banking services
  banking: {
    name: 'ZenBusiness Banking Customer',
    description: 'Pro customer who wants ZenBusiness Banking and will apply for an account',
    packagePreference: 'pro',
    upsellStrategy: 'selective',
    primaryGoal: 'banking',
    upsells: {
      rushFiling: false,
      registeredAgent: true,       // Needed for business
      operatingAgreement: true,    // Needed for banking
      einService: true,            // Required for banking
      businessBanking: true,       // PRIMARY GOAL - ZenBusiness Banking
      website: false,
      businessEmail: false,
      complianceMonitoring: false,
      annualReport: false,
      businessLicenseSearch: false
    },
    postCheckout: {
      applyForBanking: true,       // After checkout, apply for ZB Banking account
      completeApplication: true    // Fill out the banking application
    }
  }
};

/**
 * Generates checkout goals and upsell preferences
 * @param {string} goalType - 'minimal', 'standard', 'premium', 'rush', or 'random'
 */
export function generateTestGoals(goalType = 'random') {
  if (goalType === 'random') {
    const types = Object.keys(testGoalPresets);
    goalType = types[Math.floor(Math.random() * types.length)];
  }

  const preset = testGoalPresets[goalType] || testGoalPresets.standard;

  return {
    goalType,
    ...preset,
    // Generate human-readable instructions for the AI agent
    agentInstructions: generateUpsellInstructions(preset)
  };
}

/**
 * Generates instructions for AI agent based on upsell preferences
 */
function generateUpsellInstructions(preset) {
  const instructions = [];

  instructions.push(`Package: Select the "${preset.packagePreference.toUpperCase()}" package/tier.`);

  if (preset.upsellStrategy === 'decline_all') {
    instructions.push('Upsells: DECLINE all optional add-ons and upsells. Click "No thanks", "Skip", or "Continue without".');
  } else if (preset.upsellStrategy === 'accept_all') {
    instructions.push('Upsells: ACCEPT all optional add-ons and upsells. Click "Yes", "Add", or select the upgrade option.');
  } else {
    // Selective - list specific decisions
    const accept = [];
    const decline = [];

    for (const [upsell, shouldBuy] of Object.entries(preset.upsells)) {
      const readableName = upsell.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
      if (shouldBuy) {
        accept.push(readableName);
      } else {
        decline.push(readableName);
      }
    }

    if (accept.length > 0) {
      instructions.push(`ACCEPT these upsells: ${accept.join(', ')}`);
    }
    if (decline.length > 0) {
      instructions.push(`DECLINE these upsells: ${decline.join(', ')}`);
    }
  }

  // Add primary goal emphasis
  if (preset.primaryGoal === 'banking') {
    instructions.push('\nPRIMARY GOAL: ZenBusiness Banking');
    instructions.push('- When you see ZenBusiness Banking or business banking option, ALWAYS select it');
    instructions.push('- After checkout, look for option to apply for ZenBusiness Banking account');
    instructions.push('- Complete the banking application if prompted');
  }

  // Add post-checkout instructions
  if (preset.postCheckout?.applyForBanking) {
    instructions.push('\nPOST-CHECKOUT:');
    instructions.push('- After order confirmation, look for "Apply for Banking" or "Open Bank Account" option');
    instructions.push('- Click to start the ZenBusiness Banking application');
    instructions.push('- Fill out the banking application form with the persona data');
  }

  return instructions.join('\n');
}

/**
 * Generates multiple founders for corporation scenarios
 */
export function generateFounders(count = 2) {
  const founders = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const state = usStates[Math.floor(Math.random() * usStates.length)];

    founders.push({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      title: i === 0 ? 'CEO' : i === 1 ? 'CTO' : 'COO',
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      ownership: i === 0 ? 50 : count === 2 ? 50 : Math.floor(100 / count),
      address: {
        street: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Maple', 'Pine', 'Cedar'][Math.floor(Math.random() * 5)]} Street`,
        city: ['Springfield', 'Riverside', 'Madison', 'Georgetown', 'Franklin'][Math.floor(Math.random() * 5)],
        state: state.name,
        zip: state.zip
      }
    });
  }

  return founders;
}

/**
 * Generates realistic business details based on scenario type
 */
export function generateBusinessDetails(scenarioType, persona) {
  const details = {
    businessName: generateBusinessName(persona.businessIdea),
    description: `A ${persona.businessIdea} focused on delivering exceptional value to customers`,
    employees: Math.floor(Math.random() * 10) + 1,
    revenue: scenarioType === 'corporation' ? 'Over $1M' : scenarioType === 'nonprofit' ? 'N/A - Donations' : 'Under $100K',
    fundingNeeds: scenarioType === 'corporation' ? 'Seeking Series A' : scenarioType === 'nonprofit' ? 'Grant funding' : 'Bootstrapped',
    operationalStatus: Math.random() > 0.5 ? 'Already operating' : 'Planning to start',
    hasEIN: Math.random() > 0.7,
    needsBusinessLicense: Math.random() > 0.5
  };

  return details;
}

/**
 * Generates a business name based on the business idea
 */
function generateBusinessName(businessIdea) {
  const prefixes = ['Prime', 'Elite', 'Apex', 'Summit', 'Pioneer', 'Stellar', 'Zenith'];
  const suffixes = ['Solutions', 'Group', 'Ventures', 'Enterprises', 'Co.', 'LLC', 'Inc.'];

  // Sometimes use business idea as name, sometimes generate a creative name
  if (Math.random() > 0.5) {
    const words = businessIdea.split(' ');
    const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return capitalizedWords.join(' ');
  } else {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
  }
}
