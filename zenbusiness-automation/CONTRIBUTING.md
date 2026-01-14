# Contributing to ZenBusiness Testing Automation

Thank you for your interest in extending and improving this testing framework!

## Adding New Scenarios

### 1. Create a New Scenario File

Create a new file in `scenarios/` directory:

```javascript
// scenarios/myNewScenario.js
import { BaseScenario } from '../utils/baseScenario.js';
import { generateBusinessDetails } from '../utils/personaGenerator.js';

export class MyNewScenario extends BaseScenario {
  constructor(persona) {
    super(persona, 'My New Scenario Name');
    this.businessDetails = generateBusinessDetails('llc', persona);
  }

  async execute() {
    console.log(`\n📋 Executing My New Scenario...`);

    // Step 1: Your custom logic
    await this.customStep1();

    // Step 2: More custom logic
    await this.customStep2();

    // Step 3: Check if Velo is reached
    const veloReached = await this.reachVelo();

    return { veloReached };
  }

  async customStep1() {
    console.log(`\n🔧 Step 1: Custom action...`);

    try {
      // Your implementation
      await this.safeClick('button.my-selector', 'My Button');

      this.logger.logStep({
        pageTitle: 'My Custom Page',
        url: this.page.url(),
        actions: ['Clicked my button'],
        uxEvaluation: await this.evaluatePageUX(),
        result: 'pass'
      });

    } catch (error) {
      this.logger.logStep({
        pageTitle: 'My Custom Page',
        url: this.page.url(),
        result: 'fail',
        notes: error.message
      });
      throw error;
    }
  }

  async customStep2() {
    // Implement additional steps
  }
}
```

### 2. Register in Test Orchestrator

Edit `testRunner.js` and add your scenario:

```javascript
// Import your scenario
import { MyNewScenario } from './scenarios/myNewScenario.js';

// In the TestOrchestrator class, add option
constructor(options = {}) {
  this.options = {
    runLLC: true,
    runDBA: true,
    runMyNew: true,  // Add this
    // ...
  };
}

// In runAll(), add execution
if (this.options.runMyNew) {
  await this.runScenario('llc', MyNewScenario);
  await this.delay();
}
```

### 3. Add CLI Support

Add command-line flags in `testRunner.js`:

```javascript
const options = {
  runMyNew: !args.includes('--skip-mynew'),
  // ...
};

if (args.includes('--only-mynew')) {
  options.runMyNew = true;
  // Set others to false
}
```

### 4. Update Documentation

Add your scenario to `README.md` and `QUICKSTART.md`.

## Extending Persona Generation

### Add New Business Types

Edit `utils/personaGenerator.js`:

```javascript
const businessTypes = {
  llc: [...],
  dba: [...],
  myNewType: [
    'custom business idea 1',
    'custom business idea 2',
    'custom business idea 3'
  ]
};
```

### Add New States

```javascript
const usStates = [
  { name: 'New State', abbr: 'NS', zip: '12345' },
  // ...
];
```

### Custom Name Generation

```javascript
const firstNames = [
  'NewName1',
  'NewName2',
  // ...
];
```

## Customizing Product Evaluation

### Override Product Logic

Edit `baseScenario.js` in the `evaluateProductOffer()` method:

```javascript
evaluateProductOffer(productName, businessType) {
  const productRelevance = {
    'New Product': {
      llc: { relevant: true, reasoning: 'Why it is relevant' },
      dba: { relevant: false, reasoning: 'Why it is not relevant' },
      // ...
    }
  };
  // ...
}
```

### Add Business-Specific Logic

Create a subclass with custom evaluation:

```javascript
export class MyScenario extends BaseScenario {
  evaluateProductOffer(productName, businessType) {
    // Custom logic for specific products
    if (productName === 'Special Product') {
      return {
        decision: 'Accept',
        relevance: 'High',
        reasoning: 'Custom reasoning'
      };
    }

    // Fall back to parent class
    return super.evaluateProductOffer(productName, businessType);
  }
}
```

## Enhancing Reports

### Add Custom Metrics

Edit `utils/reportGenerator.js`:

```javascript
export class TestLogger {
  constructor(scenarioName, persona) {
    // ...
    this.customMetrics = {
      metric1: 0,
      metric2: []
    };
  }

  trackCustomMetric(name, value) {
    this.customMetrics[name] = value;
  }

  generateReport() {
    // Add custom section
    report += `## Custom Metrics\n\n`;
    report += `- Metric 1: ${this.customMetrics.metric1}\n`;
    // ...
  }
}
```

### Add Screenshot Capture

In any scenario:

```javascript
async customStep() {
  // Take screenshot
  const screenshot = await this.page.screenshot({
    path: `./screenshots/step_${Date.now()}.png`
  });

  this.logger.logStep({
    pageTitle: 'Current Page',
    url: this.page.url(),
    screenshots: [`step_${Date.now()}.png`],
    result: 'pass'
  });
}
```

## Helper Methods in BaseScenario

Use these built-in methods:

### Safe Element Interactions

```javascript
// Safe click with retry
await this.safeClick(selector, description);

// Safe fill with retry
await this.safeFill(selector, value, description);

// Safe select from dropdown
await this.safeSelect(selector, value, description);

// Check if element is visible
const isVisible = await this.isVisibleSelector(selector);
```

### Evaluation Methods

```javascript
// Evaluate page UX
const uxEval = await this.evaluatePageUX();

// Evaluate copy/content
const copyEval = await this.evaluateCopy();

// Evaluate interactions
const interactionEval = await this.evaluateInteractions();
```

### Logging

```javascript
// Log a step
this.logger.logStep({
  pageTitle: 'Page Name',
  url: this.page.url(),
  actions: ['Action 1', 'Action 2'],
  dataInput: { field1: 'value1' },
  uxEvaluation: 'UX feedback',
  copyEvaluation: 'Copy feedback',
  result: 'pass' // or 'fail'
});

// Log an issue
this.logger.logIssue('critical', 'Description', 'Location');
this.logger.logIssue('major', 'Description', 'Location');
this.logger.logIssue('minor', 'Description', 'Location');

// Log product decision
this.logger.logProductDecision(
  'Product Name',
  'Accept', // or 'Decline'
  'Reasoning',
  'High' // or 'Low'
);
```

## Advanced Patterns

### Handling Multi-Step Forms

```javascript
async fillMultiStepForm() {
  let step = 1;
  const maxSteps = 10;

  while (step <= maxSteps) {
    const hasNext = await this.answerCurrentQuestion();

    if (!hasNext) break;

    await this.clickContinue();
    await this.wait(2000);
    step++;
  }
}
```

### Handling Dynamic Selectors

```javascript
async findDynamicElement(baseSelector, alternates) {
  const selectors = [baseSelector, ...alternates];

  for (const selector of selectors) {
    try {
      const element = await this.page.waitForSelector(
        selector,
        { timeout: 3000 }
      );
      if (element) return selector;
    } catch (e) {
      continue;
    }
  }

  throw new Error('Element not found');
}
```

### Handling Iframes

```javascript
async fillIframeForm(iframeName) {
  const frames = this.page.frames();
  const targetFrame = frames.find(f =>
    f.url().includes(iframeName)
  );

  if (targetFrame) {
    await targetFrame.fill('input[name="field"]', 'value');
  }
}
```

### Conditional Logic

```javascript
async handleConditionalStep() {
  const pageText = await this.page.locator('body').innerText();

  if (pageText.includes('Special Question')) {
    await this.handleSpecialCase();
  } else {
    await this.handleNormalCase();
  }
}
```

## Testing Your Changes

### 1. Test Locally

Run your new scenario:

```bash
node zenbusiness-automation/testRunner.js --only-mynew
```

### 2. Check Reports

Verify the generated report has:
- All steps logged
- Correct UX/copy evaluations
- Product decisions
- No critical errors

### 3. Run Integration

Test with other scenarios:

```bash
node zenbusiness-automation/testRunner.js
```

### 4. Verify Summary

Check the summary report for:
- Your scenario in the results table
- No systemic issues introduced
- Proper cross-scenario analysis

## Code Style

Follow these conventions:

### Naming

- Classes: PascalCase (e.g., `MyNewScenario`)
- Methods: camelCase (e.g., `executeCustomStep`)
- Files: camelCase (e.g., `myNewScenario.js`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Structure

- Keep methods focused and single-purpose
- Use try/catch for error handling
- Always log steps and issues
- Comment complex logic
- Use async/await (not .then())

### Logging

- Use emoji prefixes for visibility: 🚀 🔧 ✅ ❌ ⚠️
- Log before and after major actions
- Include descriptive messages
- Report errors with context

## Submitting Changes

1. Test thoroughly
2. Update documentation
3. Add examples if introducing new patterns
4. Describe changes in pull request
5. Include sample report output

## Questions?

- Check existing scenarios for examples
- Review `baseScenario.js` for available methods
- Examine generated reports for data structure
- Look at `reportGenerator.js` for logging options

Happy contributing!
