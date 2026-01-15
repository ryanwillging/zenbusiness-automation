# ZenBusiness Multi-Flow Testing Automation

## 🎯 What Is This?

A **fully autonomous, multi-scenario testing framework** for ZenBusiness onboarding flows. This tool automatically walks through complete business formation processes (LLC, DBA, Corporation, Nonprofit) from start to finish, making intelligent decisions, evaluating product offers, and producing comprehensive reports.

## ✨ Key Features

- **5+ Business Formation Scenarios**: LLC, DBA, Corporation, Nonprofit, and custom edge cases
- **Autonomous Execution**: Runs completely independently without human intervention
- **Intelligent Decision-Making**: Makes context-aware choices based on business type
- **Dynamic Persona Generation**: Creates unique, realistic test users for each run
- **Product Evaluation**: Decides on add-on products with detailed justification
- **Comprehensive Reporting**: Markdown reports with UX/copy analysis and recommendations
- **Robust Error Handling**: Retry logic and graceful failure recovery
- **Flexible Configuration**: Run all scenarios or select specific ones

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install
```

### 2. Run Your First Test

```bash
npm run test:zenbusiness:llc
```

This runs the LLC formation scenario and generates a detailed report.

### 3. View the Report

Reports are saved in `zenbusiness-automation/reports/`

Open the latest `.md` file to see complete test execution details.

### 4. Run All Scenarios

```bash
npm run test:zenbusiness
```

This runs all 5 scenarios and produces a summary report.

**Total time: ~25-45 minutes**

## 📋 Available Commands

### Quick Commands (npm scripts)

```bash
npm run test:zenbusiness              # Run all scenarios
npm run test:zenbusiness:llc          # Run LLC only
npm run test:zenbusiness:dba          # Run DBA only
npm run test:zenbusiness:corp         # Run Corporation only
npm run test:zenbusiness:nonprofit    # Run Nonprofit only
npm run test:zenbusiness:fast         # Run all with no delays (faster)
```

### Advanced Commands

```bash
# Skip specific scenarios
node zenbusiness-automation/testRunner.js --skip-dba --skip-nonprofit

# Run multiple custom scenarios
node zenbusiness-automation/testRunner.js --custom-count 5

# Adjust delay between scenarios
node zenbusiness-automation/testRunner.js --delay 10000

# Run only custom scenarios
node zenbusiness-automation/testRunner.js --only-custom --custom-count 3
```

## 📚 Documentation

Complete documentation is available in `zenbusiness-automation/`:

| Document | Purpose |
|----------|---------|
| **README.md** | Complete user guide with all features and options |
| **QUICKSTART.md** | Get started in 5 minutes |
| **ARCHITECTURE.md** | Technical architecture and design patterns |
| **CONTRIBUTING.md** | How to extend and customize the framework |
| **USAGE_EXAMPLES.md** | Real-world usage examples and workflows |
| **PROJECT_SUMMARY.md** | Project overview and statistics |
| **config.example.js** | Configuration template |

## 🎭 Test Scenarios

### 1. LLC Formation
- Complete onboarding flow
- Business information collection
- Multi-step form navigation
- Product offer evaluation
- Payment processing
- Velo chat verification

### 2. DBA Registration
- Trade name registration
- Sole proprietor flow
- Simplified product offerings

### 3. Corporation Formation
- C-Corp and S-Corp support
- Multiple founder handling
- Ownership distribution
- Investor-focused products

### 4. Nonprofit Formation
- 501(c)(3) structure
- Mission statement
- Board configuration
- Donor-focused products

### 5. Custom Scenarios
- Multi-state businesses
- International founders
- Complex ownership
- Existing business conversions
- Series LLCs

## 📊 What You Get

### Individual Scenario Reports

Each test produces a detailed markdown report with:

- ✅ Test metadata (timestamp, duration, result)
- 👤 Persona details (name, email, business)
- 📝 Step-by-step execution log
- 🎨 UX evaluation (layout, clarity, hierarchy)
- ✍️ Copy evaluation (persuasiveness, friction)
- 🖱️ Interaction quality (buttons, forms, flows)
- 📦 Product decisions with reasoning
- 🐛 Issues found (categorized by severity)
- 💡 Recommendations for improvement

### Summary Report

After all scenarios complete, you get:

- 📈 Aggregate statistics
- 📊 Pass/fail comparison table
- 🔍 Cross-scenario analysis
- ⚠️ Common pain points
- 🎯 Systemic issue identification
- 💡 Overall recommendations

## 🏗️ Project Structure

```
zenbusiness-automation/
├── testRunner.js              # Main orchestrator
├── utils/
│   ├── personaGenerator.js    # Creates test personas
│   ├── reportGenerator.js     # Generates reports
│   └── baseScenario.js        # Base scenario class
├── scenarios/
│   ├── llcScenario.js         # LLC formation
│   ├── dbaScenario.js         # DBA registration
│   ├── corporationScenario.js # Corporation formation
│   ├── nonprofitScenario.js   # Nonprofit formation
│   └── customScenario.js      # Custom test cases
└── reports/                   # Generated reports
```

## 🎓 How It Works

1. **Generate Persona**: Creates a unique test user with realistic details
2. **Initialize Browser**: Launches Playwright browser instance
3. **Navigate & Fill**: Automatically completes all forms
4. **Make Decisions**: Intelligently selects appropriate options
5. **Evaluate Products**: Decides on add-ons based on business context
6. **Process Payment**: Submits test payment information
7. **Verify Completion**: Confirms reaching Velo chat
8. **Generate Report**: Creates detailed markdown documentation
9. **Cleanup**: Closes browser and saves results

## 💡 Example Output

```
🚀 ZenBusiness Multi-Flow Testing Automation
================================================================================

🚀 Initializing LLC Formation scenario...
📧 Test email: test_llc_2025-11-30_abc123@zenbusiness.com

📍 Navigating to https://www.dev.zenbusiness.com...
✅ Clicked: Start LLC button
✅ Filled: Email field
✅ Filled: Password field

📝 Completing LLC information...
✅ Filled: Business name
✅ Selected: State
✅ Filled: Business description

🎁 Handling product offers...
💡 Accept EIN - LLCs typically need an EIN for tax purposes
💡 Accept Worry-Free Compliance - LLCs need annual report filing
💡 Decline Website Builder - Many LLCs build custom websites

💳 Processing payment...
✅ Filled payment information
✅ Submitted order

💬 Checking for Velo chat...
✅ Velo chat element found!

✅ LLC Formation completed successfully!
📄 Report saved: reports/LLC_Formation_abc123_1701373200000.md
```

## 🔧 Configuration

Copy `config.example.js` to `config.js` and customize:

```javascript
export const config = {
  baseUrl: 'https://www.dev.zenbusiness.com',
  browser: {
    headless: false,
    slowMo: 100,
    timeout: 30000
  },
  scenarios: {
    runLLC: true,
    runDBA: true,
    runCorporation: true,
    runNonprofit: true,
    runCustom: true
  }
};
```

## 🛠️ Customization

### Add a New Scenario

1. Create `scenarios/myScenario.js`
2. Extend `BaseScenario` class
3. Implement `execute()` method
4. Register in `testRunner.js`

See `CONTRIBUTING.md` for detailed instructions.

### Customize Product Logic

Override `evaluateProductOffer()` in your scenario:

```javascript
evaluateProductOffer(productName, businessType) {
  if (productName === 'My Product') {
    return {
      decision: 'Accept',
      relevance: 'High',
      reasoning: 'Custom logic here'
    };
  }
  return super.evaluateProductOffer(productName, businessType);
}
```

## 🐛 Troubleshooting

### Tests fail to find elements
- Site structure may have changed
- Update selectors in scenario files
- Check reports for exact error location

### Slow execution
- Enable headless mode: `headless: true`
- Remove slow motion: `slowMo: 0`
- Use fast mode: `npm run test:zenbusiness:fast`

### Payment processing fails
- This is often expected in dev environments
- Verify test card: `4242424242424242`
- Check browser console for errors

See `USAGE_EXAMPLES.md` for more troubleshooting scenarios.

## 📦 What's Included

- **~3,600 lines of code** across 14 files
- **5 test scenarios** (LLC, DBA, Corporation, Nonprofit, Custom)
- **3 utility modules** (persona, reporting, base scenario)
- **6 documentation files** (README, quickstart, architecture, etc.)
- **Complete test infrastructure** ready to use

## 🎯 Use Cases

1. **Regression Testing**: Verify flows still work after changes
2. **Feature Testing**: Test new features across all scenarios
3. **Performance Monitoring**: Track load times and bottlenecks
4. **UX Analysis**: Get feedback on user experience at scale
5. **Copy Testing**: Evaluate messaging effectiveness
6. **CI/CD Integration**: Automated testing in pipelines
7. **Documentation**: Self-updating flow documentation

## ⚙️ Requirements

- Node.js 18 or higher
- npm or yarn
- Internet connection
- ~1GB disk space for Playwright browsers

## 📝 License

ISC

## 🤝 Contributing

See `CONTRIBUTING.md` for guidelines on:
- Adding new scenarios
- Customizing persona generation
- Extending reporting
- Best practices
- Code style

## 📞 Support

For help:
1. Check the documentation in `zenbusiness-automation/`
2. Review generated reports for error details
3. Examine console output for real-time logs
4. Verify selectors against current site structure

## 🎉 Getting Started

```bash
# 1. Install dependencies
npm install
npx playwright install

# 2. Run your first test
npm run test:zenbusiness:llc

# 3. Check the report
open zenbusiness-automation/reports/*.md

# 4. Run all scenarios
npm run test:zenbusiness

# 5. Review summary
open zenbusiness-automation/reports/SUMMARY_*.md
```

---

**Built with Playwright** | **Autonomous Testing** | **Production Ready**

For complete documentation, see `zenbusiness-automation/README.md`
