# Usage Examples

Real-world examples of how to use the ZenBusiness testing framework.

## Basic Usage

### 1. Run a Single Scenario

Test just the LLC formation flow:

```bash
npm run test:zenbusiness:llc
```

Expected output:
```
🚀 Initializing LLC Formation scenario...
📧 Test email: test_llc_2025-11-30_xyz789@zenbusiness.com
📍 Navigating to https://www.dev.zenbusiness.com...
✅ Clicked: Start LLC button
...
✅ LLC Formation completed successfully!
📄 Report saved: reports/LLC_Formation_xyz789_1701373200000.md
```

### 2. Run All Scenarios

Execute the complete test suite:

```bash
npm run test:zenbusiness
```

This will run all 5 scenarios sequentially with 5-second delays between them.

### 3. Run Fast (No Delays)

For quick testing during development:

```bash
npm run test:zenbusiness:fast
```

## Advanced Usage

### Skip Specific Scenarios

Skip DBA and Nonprofit tests:

```bash
node zenbusiness-automation/testRunner.js --skip-dba --skip-nonprofit
```

### Run Multiple Custom Scenarios

Test edge cases with 5 different custom scenarios:

```bash
node zenbusiness-automation/testRunner.js --skip-llc --skip-dba --skip-corporation --skip-nonprofit --custom-count 5
```

### Adjust Delay Between Tests

Use a 10-second delay (useful for slower networks):

```bash
node zenbusiness-automation/testRunner.js --delay 10000
```

## CI/CD Integration

### GitHub Actions

```yaml
name: ZenBusiness E2E Tests

on:
  push:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium
    
    - name: Run tests
      run: npm run test:zenbusiness
    
    - name: Upload reports
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-reports
        path: zenbusiness-automation/reports/
        retention-days: 30
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm install'
                sh 'npx playwright install chromium'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm run test:zenbusiness'
            }
        }
        
        stage('Archive Reports') {
            steps {
                archiveArtifacts artifacts: 'zenbusiness-automation/reports/**/*.md'
                publishHTML([
                    reportDir: 'zenbusiness-automation/reports',
                    reportFiles: 'SUMMARY_*.md',
                    reportName: 'Test Summary'
                ])
            }
        }
    }
}
```

## Development Workflows

### Testing a New Feature

1. Run baseline test:
```bash
npm run test:zenbusiness:llc
```

2. Make your changes to the site

3. Run test again:
```bash
npm run test:zenbusiness:llc
```

4. Compare reports to identify changes

### Pre-Release Testing

Before a major release, run the full suite:

```bash
# Run all scenarios with no delays for speed
npm run test:zenbusiness:fast
```

Review the summary report for any failures or critical issues.

### Debugging a Specific Flow

1. Edit `utils/baseScenario.js` to disable headless mode:
```javascript
this.browser = await chromium.launch({
  headless: false,  // See the browser
  slowMo: 500       // Slow down for observation
});
```

2. Run the specific scenario:
```bash
npm run test:zenbusiness:corp
```

3. Watch the browser automation in real-time

### Adding a New Business Type

1. Edit `utils/personaGenerator.js`:
```javascript
const businessTypes = {
  // ... existing types
  partnership: [
    'law firm',
    'medical practice',
    'consulting partnership'
  ]
};
```

2. Create new scenario file `scenarios/partnershipScenario.js`

3. Test it:
```bash
node zenbusiness-automation/testRunner.js --only-partnership
```

## Report Analysis

### Reading Individual Reports

Open any report from `zenbusiness-automation/reports/`:

```bash
# macOS
open zenbusiness-automation/reports/LLC_Formation_*.md

# Linux
xdg-open zenbusiness-automation/reports/LLC_Formation_*.md

# Windows
start zenbusiness-automation/reports/LLC_Formation_*.md
```

Key sections to review:
- **Final Result**: Pass/fail status
- **Issues Found**: Critical, major, minor issues
- **Product Decisions**: What was accepted/declined and why
- **Recommendations**: UX and copy improvements

### Reading Summary Reports

The summary report aggregates all test results:

```bash
open zenbusiness-automation/reports/SUMMARY_*.md
```

Look for:
- **Overall pass/fail statistics**
- **Common pain points** across scenarios
- **Cross-scenario comparison** table
- **Aggregate recommendations**

## Customization Examples

### Custom Product Decision Logic

Override product evaluation in a scenario:

```javascript
// scenarios/customLLCScenario.js
import { LLCScenario } from './llcScenario.js';

export class CustomLLCScenario extends LLCScenario {
  evaluateProductOffer(productName, businessType) {
    // Always accept EIN
    if (productName === 'EIN') {
      return {
        decision: 'Accept',
        relevance: 'High',
        reasoning: 'Custom logic: Always get EIN'
      };
    }
    
    // Use default logic for others
    return super.evaluateProductOffer(productName, businessType);
  }
}
```

### Custom Persona Generation

Create personas with specific characteristics:

```javascript
import { generatePersona } from './utils/personaGenerator.js';

const persona = generatePersona('llc');

// Override specific fields
persona.state = 'Delaware';
persona.industry = 'Technology';
persona.businessIdea = 'SaaS platform';

const scenario = new LLCScenario(persona);
await scenario.run();
```

### Custom Reporting Format

Extend the logger to add custom metrics:

```javascript
import { TestLogger } from './utils/reportGenerator.js';

class CustomTestLogger extends TestLogger {
  constructor(scenarioName, persona) {
    super(scenarioName, persona);
    this.loadTimes = [];
  }
  
  logLoadTime(page, duration) {
    this.loadTimes.push({ page, duration });
  }
  
  generateReport() {
    let report = super.generateReport();
    
    // Add custom section
    report += `\n## Load Times\n\n`;
    this.loadTimes.forEach(lt => {
      report += `- ${lt.page}: ${lt.duration}ms\n`;
    });
    
    return report;
  }
}
```

## Troubleshooting Examples

### Problem: Test Fails to Find Element

**Diagnosis:**
```bash
npm run test:zenbusiness:llc
# Error: Timeout waiting for selector...
```

**Solution:**
1. Check if the selector has changed on the site
2. Increase timeout in `utils/baseScenario.js`:
```javascript
await this.page.waitForSelector(selector, { 
  timeout: 30000  // Increase from 10000
});
```

### Problem: Payment Processing Fails

**Diagnosis:**
Report shows "Payment processing failed"

**Solution:**
This is often expected in dev/test environments. Check:
1. Test card number is correct: `4242424242424242`
2. Payment form accepts test cards
3. Check browser console for errors

### Problem: Slow Execution

**Diagnosis:**
Tests take very long to complete

**Solution:**
1. Enable headless mode:
```javascript
headless: true
```

2. Remove slow motion:
```javascript
slowMo: 0
```

3. Reduce delays:
```bash
npm run test:zenbusiness:fast
```

## Best Practices

### 1. Regular Regression Testing

Run tests daily or before each deployment:

```bash
# In cron: Daily at 2 AM
0 2 * * * cd /path/to/project && npm run test:zenbusiness
```

### 2. Keep Selectors Updated

Review failed tests and update selectors as needed:

```javascript
// Bad: Too specific, breaks easily
await this.page.click('div.container > div:nth-child(3) > button');

// Good: Semantic, more stable
await this.page.click('button:has-text("Continue")');
await this.page.click('[data-testid="continue-button"]');
```

### 3. Review Reports After Each Run

Always check the generated reports, even for passing tests:
- UX insights
- Copy suggestions
- Performance observations

### 4. Version Control Reports

Optionally commit successful test reports to track changes:

```bash
git add zenbusiness-automation/reports/baseline_*.md
git commit -m "Add baseline test reports"
```

### 5. Use Summary Reports for Trends

Compare summary reports over time to identify:
- Improving or declining test health
- New issues introduced
- Performance trends

---

For more examples and use cases, see:
- `README.md` - Complete documentation
- `ARCHITECTURE.md` - Technical details
- `CONTRIBUTING.md` - Extension guide
