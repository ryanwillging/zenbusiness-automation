# Quick Start Guide

Get started with ZenBusiness multi-flow testing in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Internet connection

## Step 1: Install Dependencies

```bash
npm install
```

This installs Playwright and all required dependencies.

## Step 2: Install Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers.

## Step 3: Run Your First Test

Start with a single LLC formation test:

```bash
node zenbusiness-automation/testRunner.js --only-llc
```

You should see:
- Browser window opens
- Automated navigation through ZenBusiness
- Console logs showing progress
- Final report generated

## Step 4: View the Report

Reports are saved in `zenbusiness-automation/reports/`

Open the latest `.md` file to see:
- Complete test execution log
- UX and copy evaluations
- Product decisions
- Issues found
- Recommendations

## Step 5: Run All Scenarios

Ready to run the full suite?

```bash
node zenbusiness-automation/testRunner.js
```

This runs all 5 scenarios:
1. LLC Formation (~5-10 min)
2. DBA Registration (~3-5 min)
3. Corporation Formation (~5-10 min)
4. Nonprofit Formation (~5-10 min)
5. Custom Test Case (~5-10 min)

**Total time: ~25-45 minutes**

## Common Commands

### Run specific scenario
```bash
# Just LLC
node zenbusiness-automation/testRunner.js --only-llc

# Just Corporation
node zenbusiness-automation/testRunner.js --only-corporation
```

### Skip scenarios
```bash
# Skip custom scenarios
node zenbusiness-automation/testRunner.js --skip-custom

# Skip both DBA and Nonprofit
node zenbusiness-automation/testRunner.js --skip-dba --skip-nonprofit
```

### Adjust timing
```bash
# No delay between scenarios (faster)
node zenbusiness-automation/testRunner.js --delay 0

# 10 second delay (safer)
node zenbusiness-automation/testRunner.js --delay 10000
```

### Run multiple custom scenarios
```bash
# Run 5 custom test cases
node zenbusiness-automation/testRunner.js --skip-llc --skip-dba --skip-corporation --skip-nonprofit --custom-count 5
```

## What to Expect

### During Test Execution

You'll see console output like:

```
🚀 ZenBusiness Multi-Flow Testing Automation
================================================================================

Starting test execution at 1/1/2025, 10:00:00 AM

--------------------------------------------------------------------------------
Starting: LLCScenario
--------------------------------------------------------------------------------

🚀 Initializing LLC Formation scenario...
📧 Test email: test_llc_2025-01-01_abc123@zenbusiness.com

📍 Navigating to https://www.dev.zenbusiness.com...
✅ Clicked: Start LLC button
✅ Filled: Email field
✅ Filled: Password field
...
```

### After Completion

You'll get a summary:

```
✅ All Test Scenarios Completed
================================================================================

Total execution time: 1847 seconds
Total scenarios run: 5
Passed: 5
Failed: 0
```

## Understanding Reports

### Individual Report Structure

Each report contains:

1. **Header**: Test metadata, duration, pass/fail
2. **Persona Details**: Generated user info
3. **Step-by-Step Log**: Every action taken
4. **Product Decisions**: What was accepted/declined and why
5. **Issues Found**: Bugs and UX problems
6. **Recommendations**: Suggested improvements

### Summary Report

The `SUMMARY_*.md` file shows:

- Overall statistics
- Comparison table across all scenarios
- Common pain points
- Aggregate recommendations

## Troubleshooting

### Test fails immediately

**Problem**: Browser doesn't launch or crashes

**Solution**:
```bash
npx playwright install
```

### Can't find elements

**Problem**: Selectors don't match current site

**Solution**: The site structure may have changed. Check recent report for exact error location and update selectors in scenario files.

### Payment fails

**Problem**: Payment processing doesn't complete

**Solution**: This is expected on dev/test environments. The test still records this step and continues.

### Slow execution

**Problem**: Tests take very long

**Solution**: Tests are intentionally slowed down (`slowMo: 100`) for visibility. For faster execution, edit `baseScenario.js`:

```javascript
this.browser = await chromium.launch({
  headless: true,  // Run without browser window
  slowMo: 0        // No artificial delays
});
```

## Next Steps

1. **Review your first report** - Understand the format and information provided
2. **Run all scenarios** - Get the complete picture of all flows
3. **Analyze summary report** - Look for patterns and systemic issues
4. **Customize** - Modify personas, add scenarios, adjust logic
5. **Integrate** - Add to CI/CD pipeline for continuous testing

## Tips

- Start with single scenarios to understand the flow
- Review reports after each run
- Adjust delays if your network is slow
- Use `--only-*` flags during development
- Run full suite before major releases

## Getting Help

Check these resources:

1. `README.md` - Complete documentation
2. Individual scenario files - See implementation details
3. Generated reports - Error messages and context
4. Console output - Real-time execution logs

---

Happy testing!
