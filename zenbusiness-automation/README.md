# ZenBusiness Multi-Flow Testing Automation

A comprehensive, autonomous testing framework for ZenBusiness onboarding flows using Playwright. This tool automatically tests multiple business formation scenarios (LLC, DBA, Corporation, Nonprofit) with dynamic persona generation, intelligent decision-making, and detailed reporting.

## Features

- **Multi-Scenario Testing**: Automatically tests 5+ different business formation flows
- **Dynamic Persona Generation**: Creates realistic, unique test personas for each run
- **Intelligent Answer Selection**: Makes logical decisions based on business context
- **Product Offer Evaluation**: Evaluates and decides on add-on products with justification
- **Comprehensive Reporting**: Generates detailed markdown reports for each test
- **Cross-Scenario Analysis**: Produces summary reports identifying systemic issues
- **Error Handling**: Robust retry logic and graceful failure handling
- **Flexible Configuration**: Run all scenarios or select specific ones

## Scenarios

### 1. LLC Formation
Tests the complete LLC formation flow with realistic business details, automatic form filling, and product offer evaluation.

### 2. DBA Registration
Tests DBA/trade name registration for sole proprietors with appropriate product selections.

### 3. Corporation Formation
Tests C-Corp and S-Corp formation with multiple founders, ownership distribution, and investor-focused options.

### 4. Nonprofit Formation
Tests 501(c)(3) nonprofit formation with mission statements, charitable purposes, and appropriate add-ons.

### 5. Custom Test Cases
Dynamically generated scenarios that stress edge cases like:
- Multi-state businesses
- International founders
- Complex ownership structures
- Existing business conversions
- Series LLCs

## Installation

1. Ensure you have Node.js installed (v18+ recommended)

2. Install dependencies:
```bash
npm install playwright
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Usage

### Run All Scenarios

```bash
node zenbusiness-automation/testRunner.js
```

This runs all configured test scenarios in sequence:
- LLC Formation
- DBA Registration
- Corporation Formation
- Nonprofit Formation
- 1 Custom Test Case

### Run Specific Scenarios

Run only LLC formation:
```bash
node zenbusiness-automation/testRunner.js --only-llc
```

Run only DBA:
```bash
node zenbusiness-automation/testRunner.js --only-dba
```

Run only Corporation:
```bash
node zenbusiness-automation/testRunner.js --only-corporation
```

Run only Nonprofit:
```bash
node zenbusiness-automation/testRunner.js --only-nonprofit
```

### Skip Specific Scenarios

Skip LLC formation:
```bash
node zenbusiness-automation/testRunner.js --skip-llc
```

Skip custom scenarios:
```bash
node zenbusiness-automation/testRunner.js --skip-custom
```

### Configure Custom Scenarios

Run 3 custom test cases:
```bash
node zenbusiness-automation/testRunner.js --custom-count 3
```

### Adjust Timing

Change delay between scenarios (in milliseconds):
```bash
node zenbusiness-automation/testRunner.js --delay 10000
```

Run with no delay:
```bash
node zenbusiness-automation/testRunner.js --delay 0
```

## Architecture

```
zenbusiness-automation/
├── testRunner.js                 # Main orchestrator
├── utils/
│   ├── personaGenerator.js       # Generates test personas
│   ├── reportGenerator.js        # Creates markdown reports
│   └── baseScenario.js           # Base class for all scenarios
├── scenarios/
│   ├── llcScenario.js            # LLC formation test
│   ├── dbaScenario.js            # DBA registration test
│   ├── corporationScenario.js    # Corporation formation test
│   ├── nonprofitScenario.js      # Nonprofit formation test
│   └── customScenario.js         # Dynamic scenario generator
└── reports/
    └── [generated reports]        # Test reports (auto-created)
```

## Test Credentials

All scenarios use standardized test credentials:

**Email Format**: `test_[scenario]_[date]_[uniqueID]@zenbusiness.com`

**Password**: `cakeroofQ1!`

**Test Card**:
- Number: `4242 4242 4242 4242`
- CVV: `123`
- Expiry: `12/2028`
- ZIP: Matches scenario's selected state

## Reports

### Individual Scenario Reports

Each test scenario generates a detailed markdown report including:

- Test metadata (timestamp, duration, persona)
- Step-by-step execution log
- UX evaluation for each page
- Copy/content evaluation
- Interaction quality assessment
- Product offer decisions with justification
- Issues found (Critical/P0, Major/P1, Minor/P2)
- Recommendations
- Final assessment

Reports are saved to: `zenbusiness-automation/reports/`

Example: `LLC_Formation_abc123_1234567890.md`

### Summary Report

After all scenarios complete, a summary report is generated with:

- Overall pass/fail statistics
- Cross-scenario comparison table
- Common pain points
- Systemic issues
- Aggregate recommendations

Example: `SUMMARY_1234567890.md`

## Product Offer Evaluation

The framework intelligently evaluates each product offer based on business type:

| Product | LLC | DBA | Corporation | Nonprofit |
|---------|-----|-----|-------------|-----------|
| EIN | ✅ Accept | ❌ Decline | ✅ Accept | ✅ Accept |
| Worry-Free Compliance | ✅ Accept | ❌ Decline | ✅ Accept | ✅ Accept |
| Domain Registration | ✅ Accept | ✅ Accept | ✅ Accept | ✅ Accept |
| Website Builder | ✅ Accept | ✅ Accept | ❌ Decline | ✅ Accept |
| Business Banking | ✅ Accept | ❌ Decline | ✅ Accept | ✅ Accept |
| Bookkeeping | ✅ Accept | ❌ Decline | ✅ Accept | ✅ Accept |

Each decision includes detailed reasoning in the test report.

## Headless Mode

For CI/CD integration, edit `baseScenario.js`:

```javascript
this.browser = await chromium.launch({
  headless: true,  // Change to true
  slowMo: 0        // Remove slow motion
});
```

## Extending the Framework

### Add a New Scenario

1. Create a new file in `scenarios/`:

```javascript
import { BaseScenario } from '../utils/baseScenario.js';

export class MyCustomScenario extends BaseScenario {
  constructor(persona) {
    super(persona, 'My Custom Scenario');
  }

  async execute() {
    // Implement your test flow
    await this.navigateToHome();
    // ... your logic
    return { veloReached: true };
  }
}
```

2. Import and add to `testRunner.js`:

```javascript
import { MyCustomScenario } from './scenarios/myCustomScenario.js';

// In runAll():
await this.runScenario('llc', MyCustomScenario);
```

### Customize Persona Generation

Edit `utils/personaGenerator.js` to add:
- New business types
- Additional states
- More industries
- Custom name lists

### Modify Reporting

Edit `utils/reportGenerator.js` to:
- Add custom evaluation metrics
- Change report format
- Add additional analysis

## Best Practices

1. **Run scenarios sequentially** to avoid race conditions
2. **Review reports** after each run to identify issues
3. **Adjust delays** if pages are slow to load
4. **Use specific scenarios** during development to save time
5. **Check browser console** for JavaScript errors
6. **Verify selectors** if tests fail consistently

## Troubleshooting

### Scenario Fails Immediately

- Check network connection to dev.zenbusiness.com
- Verify Playwright browsers are installed: `npx playwright install`
- Increase timeout values in baseScenario.js

### Can't Find Elements

- The site structure may have changed
- Update selectors in scenario files
- Check if page is fully loaded before interacting

### Payment Processing Fails

- Verify test card number: 4242 4242 4242 4242
- Check if payment form uses iframe (Stripe)
- Review payment processing logs in report

### Velo Not Reached

- Check final URL in report
- Look for redirect or error messages
- Verify all required steps were completed

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run ZenBusiness Tests
  run: |
    npm install
    npx playwright install
    node zenbusiness-automation/testRunner.js
  continue-on-error: true

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: zenbusiness-automation/reports/
```

## License

ISC

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review generated reports for error details
3. Examine browser console output
4. Verify selector accuracy against current site

---

**Built with Playwright** | **Autonomous Testing** | **Multi-Flow Capable**
