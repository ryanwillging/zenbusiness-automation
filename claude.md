# Project Context

## Project Overview

A comprehensive, autonomous testing framework for ZenBusiness onboarding flows. This tool uses AI-powered browser automation to test multiple business formation scenarios (LLC, DBA, Corporation, Nonprofit) with dynamic persona generation, intelligent decision-making, and detailed reporting.

## Technology Stack

- **Node.js**: JavaScript runtime environment (v18+ recommended)
- **@browserbasehq/stagehand**: AI-powered browser automation framework (primary)
- **Playwright**: Underlying browser engine
- **@anthropic-ai/sdk**: Claude API for AI decision-making
- **Claude Haiku**: Recommended model (faster, higher rate limits)
- **Claude Sonnet**: Alternative model (more capable, lower rate limits)
- **zod**: Schema validation for extracted data

## Environment Configuration

### Required API Key
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```
Get your API key from: https://console.anthropic.com/

## NPM Scripts

### Test Scenarios
- `npm run test:turbo` - **Recommended**: Fast AI-powered test using Stagehand + Haiku
- `npm test` - Run all ZenBusiness scenarios (legacy)
- `npm run test:llc` - Run only LLC formation test (legacy)
- `npm run test:dba` - Run only DBA registration test (legacy)
- `npm run test:corp` - Run only Corporation formation test (legacy)
- `npm run test:nonprofit` - Run only Nonprofit formation test (legacy)
- `npm run test:fast` - Run with no delay between scenarios (legacy)
- `npm run test:ai` - Run AI-powered LLC test using vision agent (legacy)

### Cache Management
- `npm run cache:stats` - View cache statistics
- `npm run cache:show` - Display cached data
- `npm run cache:clear` - Clear the cache

## Project Structure

```
zenbusiness-automation/
├── fastTest.js                # Fast test runner using Stagehand (recommended)
├── testRunner.js              # Legacy orchestrator for running scenarios
├── cache-manager.js           # Cache management CLI
├── learnings.json             # Accumulated learnings from test runs (auto-generated)
├── utils/
│   ├── fastAgent.js           # Stagehand + Haiku agent (primary automation tool)
│   ├── baseScenario.js        # Base class all scenarios extend (legacy)
│   ├── personaGenerator.js    # Generates realistic test personas
│   ├── reportGenerator.js     # Creates markdown test reports
│   ├── visionAgent.js         # Vision-based testing using Claude (legacy)
│   ├── stepCache.js           # Caches steps for performance
│   └── testAnalyzer.js        # Analyzes test results and updates learnings
├── scenarios/
│   ├── llcScenario.js         # LLC formation test flow
│   ├── dbaScenario.js         # DBA registration test flow
│   ├── corporationScenario.js # Corporation formation test flow
│   ├── nonprofitScenario.js   # Nonprofit formation test flow
│   ├── customScenario.js      # Dynamic edge-case scenarios
│   └── aiLLCScenario.js       # AI-powered LLC scenario (legacy)
├── reports/                   # Generated test reports (auto-created)
└── test-runs/                 # AI test runs with screenshots (auto-created)
```

### Key Files

- **fastAgent.js**: The primary automation tool. Uses Stagehand's `agent()` mode for autonomous multi-step navigation with Claude Haiku. Includes:
  - Automatic persona data injection into agent instructions
  - CAPTCHA detection and manual completion waiting
  - Fallback to step-by-step mode if agent mode fails
  - Form filling with automatic field detection

- **fastTest.js**: Simple test runner that initializes FastAgent and runs LLC formation flow.

- **personaGenerator.js**: Generates random but realistic test personas with names, emails, addresses, phone numbers, and business details.

### Documentation
- `zenbusiness-automation/README.md` - Detailed framework documentation
- `zenbusiness-automation/AI_POWERED_SETUP.md` - AI testing setup guide
- `zenbusiness-automation/ARCHITECTURE.md` - Framework architecture details

## Architecture

### Current (Stagehand-based)
1. `FastAgent` uses Stagehand's `agent()` method for autonomous browser control
2. Claude Haiku analyzes the page and decides actions autonomously
3. Persona data is injected into agent instructions for accurate form filling
4. CAPTCHA pages are detected and wait for manual completion

### Legacy (Playwright-based)
1. `BaseScenario` provides common functionality (browser setup, navigation, reporting)
2. Specific scenarios extend `BaseScenario` and implement their flow logic
3. `VisionAgent` uses screenshot analysis to decide actions

## Model Selection

### Claude Haiku (Recommended)
- **Use for**: Regular testing, fast iteration
- **Pros**: 3-5x faster responses, higher rate limits, lower cost
- **Cons**: May need more attempts on complex UI elements
- **Config**: `anthropic/claude-haiku-4-5-20251001`

### Claude Sonnet
- **Use for**: Complex scenarios, debugging, when Haiku struggles
- **Pros**: More capable reasoning, better at complex decisions
- **Cons**: Slower, hits rate limits faster (30k tokens/min)
- **Config**: `anthropic/claude-sonnet-4-5-20250929`

To switch models, edit `fastAgent.js` line ~42 and ~59.

## Design Decisions

- **Stagehand over raw Playwright**: Stagehand's AI-powered `act()` and `agent()` methods handle dynamic UI better than hardcoded selectors
- **Haiku over Sonnet**: Haiku's speed and higher rate limits make it better for iterative testing
- **AgentQL removed**: Was incompatible with Stagehand's browser context ("Unsupported event: crash" error)
- **ES Modules**: Uses modern `import/export` syntax
- **Dynamic personas**: Generates realistic test data for each run to avoid duplicate account issues

## Test Credentials

- **Email Format**: `ryan.willging+zbtest[YYYYMMDD]_[count]@zenbusiness.com`
- **Phone**: `513-236-3066`
- **Password**: `cakeroofQ1!`
- **Test Card**: `4242 4242 4242 4242` (CVV: 123, Expiry: 12/2028)

## Common Tasks

### Running a quick test (recommended)
```bash
export ANTHROPIC_API_KEY='your-key'
npm run test:turbo
```

### Running legacy tests
```bash
npm run test:llc
```

### Viewing test reports
Reports are saved to `zenbusiness-automation/reports/` as markdown files.

## Troubleshooting

### "Credit balance is too low" error
Your Anthropic account needs more credits. Add credits at https://console.anthropic.com/

### Rate limit errors (30,000 tokens/min)
- **Solution 1**: Wait 60 seconds and retry
- **Solution 2**: Switch to Claude Haiku (higher limits)
- **Solution 3**: Contact Anthropic for rate limit increase

### "Missing API key" error
Set the `ANTHROPIC_API_KEY` environment variable:
```bash
export ANTHROPIC_API_KEY='your-key'
```

### CAPTCHA blocking automation
The test will automatically detect CAPTCHA and wait. Complete the CAPTCHA manually in the browser window, then the test will continue.

### Playwright browsers not installed
Run `npx playwright install` to install required browsers.

### Stagehand initialization errors
Ensure you have the correct model format:
```javascript
model: {
  modelName: 'anthropic/claude-haiku-4-5-20251001',
  apiKey: process.env.ANTHROPIC_API_KEY
}
```

### Dropdown selection issues
Haiku sometimes struggles with custom dropdowns. The agent will typically recover by:
1. Clicking to open dropdown
2. Typing to filter options
3. Clicking the filtered result

### Timeout errors
Increase timeout values or check network connectivity to dev.zenbusiness.com.

## Learned Patterns

This section is automatically updated based on test run analysis.

### State Dropdown (ZenBusiness)
- Custom combobox, not native `<select>`
- Type state name to filter, then click result
- Some states (NY) require additional county selection

### Contact Info Page
- Fields: first name, last name, email, phone
- Haiku can fill all fields in a single action using `fillForm`

### CAPTCHA Detection
- URL contains `/t/validate`
- Or page contains `iframe[title*="reCAPTCHA"]`
