# ZenBusiness Automation Framework

A comprehensive, autonomous testing framework for ZenBusiness onboarding flows using Playwright. Automatically tests multiple business formation scenarios with dynamic persona generation, intelligent decision-making, and AI-powered vision testing.

## Features

- **Multi-Scenario Testing** - Tests LLC, DBA, Corporation, and Nonprofit formation flows
- **Dynamic Persona Generation** - Creates realistic, unique test personas for each run
- **AI-Powered Testing** - Uses Claude's vision API for self-healing, adaptive tests
- **Intelligent Decision-Making** - Makes logical choices based on business context
- **Comprehensive Reporting** - Generates detailed markdown reports with UX evaluations
- **Cross-Scenario Analysis** - Produces summary reports identifying systemic issues

## Prerequisites

- Node.js v18 or higher
- npm

## Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. (Optional) For AI-powered testing, set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

## Quick Start

Run the LLC formation test:
```bash
npm run test:llc
```

Run all scenarios:
```bash
npm test
```

Run AI-powered test (requires API key):
```bash
npm run test:ai
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all test scenarios |
| `npm run test:llc` | Run LLC formation test |
| `npm run test:dba` | Run DBA registration test |
| `npm run test:corp` | Run Corporation formation test |
| `npm run test:nonprofit` | Run Nonprofit formation test |
| `npm run test:fast` | Run all scenarios with no delay |
| `npm run test:ai` | Run AI-powered LLC test |
| `npm run cache:stats` | View cache statistics |
| `npm run cache:show` | Display cached data |
| `npm run cache:clear` | Clear the cache |

## Project Structure

```
.
├── package.json
├── CLAUDE.md                      # AI assistant instructions
├── README.md                      # This file
└── zenbusiness-automation/
    ├── testRunner.js              # Main test orchestrator
    ├── cache-manager.js           # Cache management CLI
    ├── utils/
    │   ├── baseScenario.js        # Base class for scenarios
    │   ├── personaGenerator.js    # Test persona generation
    │   ├── reportGenerator.js     # Markdown report generation
    │   ├── visionAgent.js         # AI-powered vision testing
    │   └── stepCache.js           # Step caching for performance
    ├── scenarios/
    │   ├── llcScenario.js         # LLC formation flow
    │   ├── dbaScenario.js         # DBA registration flow
    │   ├── corporationScenario.js # Corporation formation flow
    │   ├── nonprofitScenario.js   # Nonprofit formation flow
    │   ├── customScenario.js      # Dynamic edge-case scenarios
    │   └── aiLLCScenario.js       # AI-powered LLC scenario
    └── reports/                   # Generated test reports
```

## Test Reports

After running tests, detailed markdown reports are saved to `zenbusiness-automation/reports/`. Each report includes:

- Test metadata and duration
- Step-by-step execution log
- UX and copy evaluations
- Product offer decisions with justification
- Issues found (categorized by severity)
- Recommendations

A summary report is also generated after running multiple scenarios.

## AI-Powered Testing

The framework includes an AI-powered testing mode that uses Claude's vision API to:

- Analyze screenshots and understand page context
- Decide what action to take next
- Adapt to UI changes automatically
- Self-heal when encountering unexpected states

This eliminates brittle selectors and reduces maintenance overhead.

```bash
export ANTHROPIC_API_KEY='your-key'
npm run test:ai
```

## Documentation

- [Detailed Framework Guide](zenbusiness-automation/README.md)
- [AI Testing Setup](zenbusiness-automation/AI_POWERED_SETUP.md)
- [Architecture Overview](zenbusiness-automation/ARCHITECTURE.md)
- [Quick Start Guide](zenbusiness-automation/QUICKSTART.md)
- [Usage Examples](zenbusiness-automation/USAGE_EXAMPLES.md)

## Test Credentials

| Field | Value |
|-------|-------|
| Email | `test_[scenario]_[date]_[id]@zenbusiness.com` |
| Password | `cakeroofQ1!` |
| Card Number | `4242 4242 4242 4242` |
| CVV | `123` |
| Expiry | `12/2028` |

## Troubleshooting

**Playwright browsers not installed**
```bash
npx playwright install
```

**Missing API key error**
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

**Timeout errors**
- Check network connectivity to dev.zenbusiness.com
- Increase timeout values in `zenbusiness-automation/utils/baseScenario.js`

**Selectors not finding elements**
- The site structure may have changed
- Use AI-powered testing (`npm run test:ai`) which adapts automatically

## License

ISC
