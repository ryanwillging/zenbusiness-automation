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
- **zod**: Schema validation for extracted data

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

### Test Scenarios
- `npm run test:turbo` - **Recommended**: Fast AI-powered test using Stagehand + GPT-4o-mini
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
│   ├── fastAgent.js           # Stagehand + GPT-4o-mini agent (primary automation tool)
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

- **fastAgent.js**: The primary automation tool. Uses Stagehand's `agent()` mode with GPT-4o-mini for autonomous multi-step navigation. Includes:
  - URL-based page detection for known ZenBusiness pages
  - Automatic persona data injection into agent instructions
  - CAPTCHA detection and manual completion waiting (3 min timeout)
  - Fallback to step-by-step mode if agent mode fails
  - Form filling with automatic field detection

- **fastTest.js**: Simple test runner that initializes FastAgent and runs LLC formation flow. Loads environment variables via dotenv.

- **personaGenerator.js**: Generates test personas with:
  - Fixed phone number: `513-236-3066`
  - Email format: `ryan.willging+zbtest[YYYYMMDD]_[count]@zenbusiness.com`
  - Daily test counter for unique emails
  - Random names, states, and business details

### Documentation
- `zenbusiness-automation/README.md` - Detailed framework documentation
- `zenbusiness-automation/AI_POWERED_SETUP.md` - AI testing setup guide
- `zenbusiness-automation/ARCHITECTURE.md` - Framework architecture details

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

### Legacy (Playwright-based)
1. `BaseScenario` provides common functionality (browser setup, navigation, reporting)
2. Specific scenarios extend `BaseScenario` and implement their flow logic
3. `VisionAgent` uses screenshot analysis to decide actions

## ZenBusiness LLC Flow

The typical URL progression for LLC formation:

1. `dev.zenbusiness.com/` → Click "Get started"
2. `/shop/llc/business-state` → Select state
3. `/shop/llc/business-name` → Enter business name
4. `/shop/llc/contact-info` → Enter first name, last name, email, phone
5. `/shop/llc/business-experience` → Select experience level
6. `/shop/llc/business-stage` → Select business stage
7. `/shop/llc/industry` → Select industry
8. `/shop/llc/registered-agent` → Select registered agent option
9. `/shop/llc/package-selection` → **STOP** (pricing page)

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

## Test Credentials

- **Email Format**: `ryan.willging+zbtest[YYYYMMDD]_[count]@zenbusiness.com`
- **Phone**: `513-236-3066`
- **Password**: `cakeroofQ1!`
- **Test Card**: `4242 4242 4242 4242` (CVV: 123, Expiry: 12/2028)

## Common Tasks

### Running a quick test (recommended)
```bash
# Ensure .env file has API keys, then:
npm run test:turbo
```

### Running legacy tests
```bash
npm run test:llc
```

### Viewing test reports
Reports are saved to `zenbusiness-automation/reports/` as markdown files.

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
The test will automatically detect CAPTCHA and wait up to 3 minutes. Complete the CAPTCHA manually in the browser window, then the test will continue.

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
- 3 minute timeout for manual completion

### Business Experience/Stage Pages
- Multiple choice questions
- First option typically works ("Just getting started", etc.)
- Agent mode handles these automatically
