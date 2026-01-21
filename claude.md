# Project Context

## Project Overview

A comprehensive, autonomous testing framework for ZenBusiness onboarding flows. This tool uses AI-powered browser automation to test multiple business formation scenarios (LLC, DBA, Corporation, Nonprofit) with dynamic persona generation, intelligent decision-making, and detailed reporting.

## Technology Stack

- **Node.js**: JavaScript runtime environment (v18+ recommended)
- **@browserbasehq/stagehand**: AI-powered browser automation framework (primary)
- **Playwright**: Underlying browser engine
- **OpenAI GPT-4o-mini**: Primary model for Stagehand agent mode (~15x cheaper than GPT-4o)
- **@anthropic-ai/sdk**: Claude API for fallback AI decision-making
- **dotenv**: Environment variable management

## Environment Configuration

### Required API Keys

Create a `.env` file in the project root:
```bash
OPENAI_API_KEY=sk-proj-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

Or export directly:
```bash
export OPENAI_API_KEY='sk-proj-...'
export ANTHROPIC_API_KEY='sk-ant-...'
```

**Get your keys from:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

## NPM Scripts

### Test Command
- `npm test` - **Primary**: Fast AI-powered test using Stagehand + GPT-4o-mini
  - Supports goal flags: `npm test -- --goal=minimal|standard|premium|banking`
  - Logs failed runs to `failed-runs.json` for pattern analysis

## Project Structure

```
zenbusiness-automation/
├── fastTest.js                # Test runner with error logging
├── failed-runs.json           # Failed run tracking (auto-generated)
├── utils/
│   ├── fastAgent.js           # Stagehand + GPT-4o-mini agent (~830 lines)
│   ├── config.js              # Centralized constants (payment data, wait times, selectors)
│   ├── pageHandlers.js        # Data-driven page handler registry
│   ├── checkoutHandler.js     # Checkout/payment logic extraction
│   └── personaGenerator.js    # Generates realistic test personas
└── test-runs/                 # AI test runs with screenshots (auto-created)
```

### Test Run Folders

Each test creates a timestamped folder in `test-runs/`:
```
test-runs/
└── fast_llc_1768588362792/
    └── screenshots/
        ├── 1768588545621_payment_fields_filled.png
        ├── 1768588668349_stuck_exit_top.png
        ├── 1768588668349_stuck_exit_middle.png
        ├── 1768588668349_stuck_exit_bottom.png
        └── 1768588675443_final_state.png
```

**Screenshot naming convention:**
- `[timestamp]_[event].png` - Single screenshot
- `[timestamp]_[event]_top/middle/bottom.png` - Multi-position (full page capture)

**When screenshots are captured:**
- `payment_fields_filled` - After filling card details
- `stuck_exit` - When test gets stuck (captures top/middle/bottom of page)
- `final_state` - At end of test run
- `order_confirmation` - On successful checkout

### Key Files

- **fastAgent.js**: The primary automation tool (~830 lines). Uses Stagehand's `agent()` mode with GPT-4o-mini for autonomous multi-step navigation. Includes:
  - Data-driven page handler routing via `pageHandlers.js`
  - CAPTCHA detection and manual completion waiting (1 min timeout)
  - Automatic persona data injection into agent instructions
  - Step-by-step mode with URL-based page detection

- **checkoutHandler.js**: Extracted checkout logic (~1000 lines). Handles:
  - Section detection (account, summary, payment)
  - Payment field filling with multiple strategies (see Payment Strategy below)
  - Stripe iframe FrameLocator API support
  - Card error detection and retry logic
  - Place Order button state checking

- **config.js**: Centralized constants including:
  - `PAYMENT_DATA` - test card number, expiry, CVV, zip
  - `WAIT_TIMES` - timing constants (faster for nav, slower for payment)
  - `FIELD_CONFIG` - form field selectors and value mappings

- **pageHandlers.js**: Data-driven page handler registry replacing if-else chains:
  - O(1) URL pattern matching
  - Handler configs with upsell settings
  - End state detection (confirmation pages)

- **fastTest.js**: Test runner with error logging:
  - Saves failed runs to `failed-runs.json`
  - Reviews error patterns after failures
  - Supports goal flags (minimal, standard, premium, banking)

- **personaGenerator.js**: Generates test personas with:
  - Fixed phone number: `513-236-3066`
  - Email format: `ryan.willging+zbtest[YYYYMMDD]_[count]@zenbusiness.com`
  - Daily test counter for unique emails
  - Random names, states, and business details

## Architecture

### Current (Stagehand-based)

1. **Agent Mode (Primary)**: Stagehand's `agent()` with GPT-4o-mini handles autonomous navigation
2. **URL-Based Handlers**: Known pages are detected by URL and handled directly:
   - `/business-name` → Fill business name field
   - `/contact-info` → Fill first name, last name, email, phone
   - `/business-experience` → Select first/beginner option
   - `/business-stage` → Select first option
3. **AI Fallback**: Unknown pages analyzed by AI to determine next action
4. **CAPTCHA Detection**: Pauses for manual completion when detected

### URL-Based Page Detection

The fastAgent uses URL patterns to handle known pages efficiently:

```javascript
if (currentUrl.includes('business-name')) {
  // Fill business name directly
}
if (currentUrl.includes('contact-info')) {
  // Fill all contact fields
}
if (currentUrl.includes('business-experience')) {
  // Select first option
}
```

This is faster than AI analysis for known page types.

## ZenBusiness LLC Flow

The typical URL progression for LLC formation:

1. `dev.zenbusiness.com/` → Click "Get started"
2. `/shop/llc/business-state` → Select state (some states require county)
3. `/shop/llc/business-name` → Enter business name
4. `/shop/llc/contact-info` → Enter first name, last name, email, phone
5. `/shop/llc/business-experience` → Select experience level
6. `/shop/llc/business-stage` → Select business stage
7. `/shop/llc/industry` → Skip or select industry
8. `/shop/llc/registered-agent` → Select registered agent option
9. `/shop/llc/package-selection` → Select STARTER package
10. `/shop/llc/worry-free-compliance` → Decline upsell
11. `/shop/llc/employer-identification-number` → Decline EIN upsell
12. `/shop/llc/bank-of-america` → Decline banking upsell
13. `/shop/llc/money-pro` → Decline Money Pro upsell
14. `/shop/llc/operating-agreement` → Decline operating agreement upsell
15. `/shop/llc/rush-filing` → Decline rush filing upsell
16. `/shop/llc/checkout` → Multi-step checkout (see Checkout Flow below)
17. `/shop/llc-addons/confirmation` → Order placed (NOT end state - continues to onboarding)
18. `/shop/llc-addons/business-license-report` → Post-checkout upsell (decline or buy based on goals)
19. `/shop/llc-addons/checkout` → Post-checkout product checkout (if user clicked "Add" on upsell)
20. `/shop/llc-addons/business-kit` → Post-checkout upsell (decline)
21. `/shop/llc-addons/conclusion` → Post-checkout summary - click Continue/Get Started
22. `/f/journey` → Post-checkout onboarding flow (see Journey Flow below)
23. `/app/` or `velo` or `dashboard` → **END STATE**: Velo dashboard

## Checkout Flow

The checkout page (`/shop/llc/checkout`) is a multi-step form on a single URL. Sections include:

### Section 1: Account Creation
- Email is **pre-filled** from the contact-info page - do NOT re-enter it
- Password field → Use `cakeroofQ1!` (only field that needs filling)
- Click "Save and continue"
- **WARNING**: If you try to fill email, it may go into the password field instead

### Section 2: Business Info Review
- Shows cart summary (Your cart ✓)
- Shows business info (Business info ✓)
- Usually auto-advances or click "Next"

### Section 3: Payment
- Payment method selector: Apple Pay, Google Pay, **Credit or debit card**
- **CRITICAL**: Click directly on each field - Tab navigation doesn't work with Stagehand!
- Card fields (all required):
  - Card number: Click field, type `4242424242424242` (16 digits)
  - Expiration: Click field, type digits **one at a time** (`1`, `2`, `2`, `8`) with waits between
  - CVV: Click field, type `123`
  - **Zip code: `78701`** (separate field below card row)
- Click "Place order" button

**Why digit-by-digit expiration?** The field auto-formats as you type (adds `/` after MM). Typing `1228` all at once doesn't trigger the formatting correctly.

### Payment Strategy Priority

The checkout handler tries these methods in order:

1. **Stripe FrameLocator API** (if iframes detected)
   ```javascript
   const stripeFrame = page.frameLocator('iframe').first();
   await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
   await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28');
   await stripeFrame.locator('[placeholder="CVC"]').fill('123');
   ```

2. **Click-based Stagehand act()** (Primary - Most Reliable for ZenBusiness)
   ```javascript
   await act('Click on the card number input field and type 4242424242424242');
   await act('Click on the expiration date field');
   await act('Press key 1'); await act('Press key 2'); // MM
   await act('Press key 2'); await act('Press key 8'); // YY
   await act('Click on the CVV field and type 123');
   await act('Click on the Zip code field and type 78701');
   ```

**Important**: Tab navigation (`act('Press Tab key')`) does NOT work reliably with Stagehand. Always click directly on fields.

### Checkout Gotchas
- All checkout sections share the same URL - can't detect section by URL
- Must scroll down to see payment section (not visible at top of page)
- **CRITICAL**: Scroll to payment section BEFORE EACH payment attempt (page may scroll back up)
- **COMBINED CARD FIELD**: Card number, expiry, and CVV appear as ONE visual row
  - Despite appearance, you CAN click each segment separately
  - **DO NOT use Tab navigation** - it doesn't work with Stagehand
  - Click directly on each field, type the value, then click the next field
- Zip code is a SEPARATE field below the card row
- "Place order" button stays disabled until all validation passes
- **Only retry on explicit errors**: Don't re-fill fields unless a validation error message is visible

### Known Payment Field Issues (CRITICAL)

**Card Number Truncation/Corruption**:
- Card number may show only 15 digits instead of 16
- Example: `4242 4242 4242 424` instead of `4242 4242 4242 4242`
- **Cause**: Auto-formatting interferes with typing, or field doesn't receive all keystrokes
- **Detection**: Check for "Invalid card number" error text
- **Fix**: Click field, select all (Ctrl+A), delete, then retype

**Expiration Not Formatting**:
- Expiration shows `28 /` or similar malformed value
- **Cause**: Typing "1228" all at once doesn't trigger auto-formatting
- **Fix**: Type each digit separately with waits: `1`, `2`, `2`, `8`

**Data in Wrong Field**:
- All payment data ends up in card field: `4242 4242 4242 4242 1228 123`
- **Cause**: Tab navigation failed, subsequent values typed into same field
- **Detection**: Card field contains "12", "/", or length > 25 chars
- **Fix**: Don't use Tab - click directly on each field before typing

## Post-Checkout Journey Flow

After checkout, users go through an onboarding flow at `/f/journey`. This is a **single-page application** where the URL stays the same but content changes.

### Journey Page Characteristics
- URL is always `/f/journey` regardless of which question is displayed
- Pages have THREE different input types:
  1. **Card-style multiple choice** - White rectangular cards with radio circles
  2. **List/menu selection** - Text items (NAICS codes, industries)
  3. **Text input fields** - DBA name, business details, etc.
- The "Next" button is **disabled** until input is provided
- Must fill/select FIRST, then click Next

### Common Journey Questions
- "What company indicator do you want to use?" (LLC, L.L.C., Limited Liability Company) - **Card selection**
- "What is your business industry?" (Agriculture, Mining, etc.) - **List selection**
- "What would you like your DBA name to be?" - **Text input**
- "How much revenue do you expect to make in your first year?" ($0, <$25k, etc.) - **Card selection**
- "Do you plan to have employees in the future?" (Yes/No options) - **Card selection**

### Journey Handler Strategy
```javascript
// First, check for text input fields
const hasTextInput = await page.evaluate(() => {
  const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  for (const input of inputs) {
    if (input.offsetParent !== null && !input.value && !input.disabled) return true;
  }
  return false;
});

if (hasTextInput) {
  // Fill text input with business name
  await act(`Type "${businessName}" into the text input field`);
} else {
  // Try selection strategies: list items, card options, radio buttons
  await act('Click the first list item option or white card containing the first answer');
}

await wait(300);
await act('Click the "Next" button');
```

### Stuck Detection for Journey
- Normal pages: 5 attempts on same URL before marking as stuck
- Journey pages: **15 attempts** (URL stays same, content changes)
- Checkout pages: 10 attempts

### Journey End State
The journey ends when reaching Velo dashboard:
- URL contains `velo`, `/app/`, or `dashboard`
- This is the final destination for the test

## Model Selection

### GPT-4o-mini (Primary - Stagehand)
- **Use for**: Stagehand agent mode, autonomous navigation
- **Pros**: ~15x cheaper than GPT-4o, good for browser actions
- **Config**: `modelName: 'gpt-4o-mini'` with `OPENAI_API_KEY`

### Claude Haiku (Fallback - Vision)
- **Use for**: Screenshot analysis, `decideNextAction()` fallback
- **Pros**: Fast responses, good for simple decisions
- **Config**: `claude-3-5-haiku-latest` with `ANTHROPIC_API_KEY`

### Why GPT-4o-mini over Claude for Stagehand?
Stagehand's agent mode has better compatibility with OpenAI models. Claude Haiku isn't in Stagehand's supported agent model list. GPT-4o-mini is ~15x cheaper than GPT-4o while still handling browser actions well.

## Design Decisions

- **GPT-4o-mini for Stagehand**: Better agent mode compatibility than Claude models, ~15x cheaper than GPT-4o
- **URL-based page detection**: Faster than AI analysis for known pages
- **Stagehand over raw Playwright**: AI-powered `act()` and `agent()` methods handle dynamic UI better than hardcoded selectors
- **dotenv for config**: Keeps API keys out of code and version control
- **AgentQL removed**: Was incompatible with Stagehand's browser context ("Unsupported event: crash" error)
- **ES Modules**: Uses modern `import/export` syntax
- **Dynamic personas**: Generates realistic test data for each run to avoid duplicate account issues
- **Fixed phone/email**: Uses real formats that pass ZenBusiness validation

## Stagehand Limitations & Gotchas

### Page API Differences
Stagehand wraps Playwright's page object, but not all methods work:
- ❌ `page.$$()` - Not a function
- ❌ `page.frames()` - Returns objects without expected methods
- ❌ `page.locator().all()` - Not supported
- ✅ `page.evaluate()` - Works for DOM queries
- ✅ `page.locator().count()` - Works
- ✅ `page.frameLocator()` - Works for iframe access

### Stripe/Payment Iframes
ZenBusiness uses Stripe Elements in iframes. Use Playwright's FrameLocator API:

```javascript
const stripeFrame = page.frameLocator('iframe').first();
await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28');
await stripeFrame.locator('[placeholder="CVC"]').fill('123');
```

**Selector fallbacks** (tried in order):
- `iframe[name*="__privateStripeFrame"]`
- `iframe[src*="stripe"]`
- `iframe[title*="Secure card"]`
- `iframe` (first iframe as last resort)

### State Selection
The state dropdown can report success but not actually persist:
- After `select()`, verify no "State is required" error
- If validation error present, retry with explicit click sequence
- Some states (NY, TX) require county selection on same page

### Action Reporting
Stagehand may report actions as successful even when they fail:
- Always verify results visually via screenshots
- Check for validation errors after form fills
- Don't trust "✅ Done" without checking page state

### Empty Response Retries
GPT-4o-mini may return empty `{}` responses when it can't identify elements:
- The code retries up to 3 times before failing
- Common when asking to "Press Tab key" on unfamiliar UI
- Log message: `Empty response (attempt 1/3) - retrying...`
- If all 3 attempts fail, falls back to next payment strategy

### Keyboard Access
Stagehand wraps Playwright pages, so direct keyboard access requires finding the underlying page:
- ❌ `page.keyboard` - Usually undefined on Stagehand-wrapped pages
- ✅ `page._page.keyboard` - Internal Playwright page reference
- ✅ `stagehand.context.pages()[0]._page.keyboard` - From context
- **Fallback**: Use Stagehand `act('Press Tab key')` if keyboard unavailable

## Test Credentials

- **Email Format**: `ryan.willging+zbtest[YYYYMMDD]_[count]@zenbusiness.com`
- **Phone**: `513-236-3066`
- **Password**: `cakeroofQ1!`
- **Test Card**:
  - Number: `4242424242424242`
  - Expiry: `12/28` (MM/YY with slash)
  - CVV: `123`
  - **Zip Code: `78701`** (required for payment!)

## Common Tasks

### Running a quick test (recommended)
```bash
# Ensure .env file has API keys, then:
npm test

# With goal flags:
npm test -- --goal=minimal   # Cheapest path (default)
npm test -- --goal=standard  # Sensible options
npm test -- --goal=premium   # Accept all upsells
npm test -- --goal=banking   # Focus on banking flow
```

## Troubleshooting

### "OpenAI API key is missing" error
Set the `OPENAI_API_KEY` in your `.env` file or environment:
```bash
export OPENAI_API_KEY='sk-proj-...'
```

### "Anthropic API key is missing" error
Set the `ANTHROPIC_API_KEY` in your `.env` file or environment:
```bash
export ANTHROPIC_API_KEY='sk-ant-...'
```

### "Credit balance is too low" error
Your API account needs more credits. Add credits at the provider's console.

### Rate limit errors
- **Solution 1**: Wait 60 seconds and retry
- **Solution 2**: Check your API plan limits
- **Solution 3**: Contact provider for rate limit increase

### CAPTCHA blocking automation
The test will automatically detect CAPTCHA and wait up to 1 minute. Complete the CAPTCHA manually in the browser window, then the test will continue.

### Time Tracking
The test output shows two time metrics:
- **Total time**: Wall-clock time from start to finish
- **Automation time (excluding CAPTCHA)**: Actual automation time without CAPTCHA wait

This allows comparing test performance across runs with different CAPTCHA wait times.

### Playwright browsers not installed
Run `npx playwright install` to install required browsers.

### Stagehand initialization errors
Ensure you have the correct model format in fastAgent.js:
```javascript
this.stagehand = new Stagehand({
  env: 'LOCAL',
  modelName: 'gpt-4o-mini',
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY
  },
  // ...
});
```

### Dropdown selection issues
GPT-4o-mini typically handles dropdowns well. If issues occur, the agent will:
1. Click to open dropdown
2. Type to filter options
3. Click the filtered result

### Timeout errors
Increase timeout values or check network connectivity to dev.zenbusiness.com.

### Test stuck on same page
If the test keeps clicking Continue without navigating:
1. Check if a required field is missing (validation error)
2. Check browser console for JavaScript errors
3. The URL-based handler may need updating for new page types

## Debugging Tips

### When Test Gets Stuck
1. **Check the screenshots** in `test-runs/fast_llc_[timestamp]/screenshots/`
2. Look at `stuck_exit_top.png`, `stuck_exit_middle.png`, `stuck_exit_bottom.png` for full page view
3. Look for **validation errors** (red text, "required" messages, red borders)
4. Check if a field is empty that should be filled

### Common Stuck Causes
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "State is required" error | State dropdown didn't persist | Add verification after select() |
| "Invalid card number" | Data from other fields leaked in | Click each field directly, don't use Tab |
| "Invalid card number" after retry | Page scrolled away from payment | Scroll to payment before each attempt |
| "Invalid expiration date" | Typed "1228" all at once | Type digits one at a time (1, 2, 2, 8) |
| Email in password field | Tried to fill pre-filled email | Only fill password on account section |
| "Place order" disabled | Missing zip code | Fill zip code field (78701) |
| Same URL, no progress | Validation error blocking | Check screenshot for red error text |
| AI returns "wait" action | Can't determine next step | Page may need scrolling or new handler |
| Journey stuck on `/f/journey` | Option not selected, Next disabled | Click option card first, then Next |
| Journey stuck after 5 attempts | SPA URL doesn't change | Increase stuck limit to 15 for journey |
| Journey stuck with text input | Page has input field, not cards | Detect input fields, fill with business name |
| Journey stuck with list selection | NAICS/industry list, not cards | Click first list item option |
| Stuck at `llc-addons/conclusion` | Need to click Continue | Add handler to click Continue/Get Started |
| Stuck at `llc-addons/checkout` | Post-checkout product checkout | Decline via "No thanks" or "Skip" link |

### Screenshot Analysis
When debugging, always:
1. Check ALL scroll positions (top/middle/bottom) - payment form may be below fold
2. Look for disabled buttons (greyed out = validation failing)
3. Check field values - data may be in wrong field
4. Look for error messages near form fields

### Adding Console Logging
To debug fastAgent.js issues:
```javascript
// Log what AI sees
console.log('AI Decision:', JSON.stringify(decision));

// Log page state
const pageText = await this.page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('Page content:', pageText);

// Log validation errors
const errors = await this.page.evaluate(() => {
  return [...document.querySelectorAll('[class*="error"], .text-red-500')].map(e => e.textContent);
});
console.log('Validation errors:', errors);
```

## Learned Patterns

This section is automatically updated based on test run analysis.

### State Dropdown (ZenBusiness)
- Custom combobox, not native `<select>`
- Type state name to filter, then click result
- Some states (NY) require additional county selection

### Contact Info Page
- Fields: first name, last name, email, phone
- All fields required before Continue button works
- Phone must be valid US format (513-236-3066 works)

### CAPTCHA Detection
- URL contains `/t/validate`
- Or page contains `iframe[title*="reCAPTCHA"]`
- 1 minute timeout for manual completion

### Business Experience/Stage Pages
- Multiple choice questions
- First option typically works ("Just getting started", etc.)
- Agent mode handles these automatically

### Checkout Page
- Single URL with multiple sections (account, business review, payment)
- Account section: Email is pre-filled, only enter password
- Must scroll down to see payment section
- Payment fields: card number, expiry (MM/YY), CVV, **zip code**
- **Click directly on each field** - Tab navigation doesn't work with Stagehand
- Type expiration digits one at a time (1, 2, 2, 8) for proper auto-formatting
- Zip is a separate input field below the card row
- "Place order" button disabled until all fields valid
- Only retry fields when explicit validation error is shown

### Upsell Pages
- 6+ upsell pages between package selection and checkout
- All have "No thanks" or "Skip" links
- URLs: worry-free-compliance, employer-identification-number, bank-of-america, money-pro, operating-agreement, rush-filing
- Can be declined with simple click actions

### Post-Checkout Upsells
- Appear after order confirmation at `/llc-addons/*`
- Pages: `business-license-report`, `business-kit`
- Decline these to continue to journey flow
- Uses button-style matching: primary black button = accept, secondary white/outline = decline

### Post-Checkout Checkout (`llc-addons/checkout`)
- Full checkout page for post-checkout product purchases (e.g., Business License Report $149)
- Appears if user clicks "Add" on a post-checkout upsell
- Handler decides to complete purchase or decline based on `testGoals.upsells.postCheckoutProducts`
- Decline strategies: "No thanks", "Skip", "Maybe later" links

### Post-Checkout Conclusion (`llc-addons/conclusion`)
- Summary page after all post-checkout upsells
- Must click "Continue", "Get Started", or "Next" to proceed to journey
- Not an end state - continues to `/f/journey`

### Post-Checkout Journey (`/f/journey`)
- Single-page app - URL stays the same for all questions
- **Three input types**:
  1. Card-style multiple choice (white cards with radio circles)
  2. List/menu selection (NAICS codes, industries - text items in a list)
  3. Text input fields (DBA name, business details)
- **Must fill/select** before Next button becomes enabled
- Detection priority: Check for empty text inputs first, then try selection strategies
- Questions: company indicator, DBA name, industry (NAICS), revenue expectations, employee plans
- Allow 15 attempts on same URL (vs 5 for normal pages)
- Ends at Velo dashboard (`/app/`, `velo`, or `dashboard` in URL)
