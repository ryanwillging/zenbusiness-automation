# ZenBusiness Testing Framework Architecture

## Overview

This framework is built on a modular, extensible architecture designed for autonomous multi-flow testing.

## Project Structure

```
zenbusiness-automation/
│
├── testRunner.js                      # Main orchestrator - runs all scenarios
│
├── config.example.js                  # Configuration template
│
├── utils/                             # Shared utilities
│   ├── personaGenerator.js            # Generates realistic test personas
│   ├── reportGenerator.js             # Creates markdown reports
│   └── baseScenario.js                # Abstract base class for scenarios
│
├── scenarios/                         # Test scenarios
│   ├── llcScenario.js                 # LLC formation flow
│   ├── dbaScenario.js                 # DBA registration flow
│   ├── corporationScenario.js         # Corporation formation flow
│   ├── nonprofitScenario.js           # Nonprofit formation flow
│   └── customScenario.js              # Dynamic scenario generator
│
├── reports/                           # Generated reports (auto-created)
│   ├── LLC_Formation_*.md
│   ├── DBA_Registration_*.md
│   ├── Corporation_Formation_*.md
│   ├── Nonprofit_Formation_*.md
│   ├── Custom_Test_*.md
│   └── SUMMARY_*.md
│
└── docs/
    ├── README.md                      # Complete documentation
    ├── QUICKSTART.md                  # Quick start guide
    ├── CONTRIBUTING.md                # Extension guide
    └── ARCHITECTURE.md                # This file
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Orchestrator                      │
│                    (testRunner.js)                          │
│  - Manages scenario execution                               │
│  - Generates summary reports                                │
│  - Handles delays and sequencing                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Creates and runs
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Scenario Instances                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ LLC         │  │ DBA         │  │ Corporation │   ...   │
│  │ Scenario    │  │ Scenario    │  │ Scenario    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  All inherit from BaseScenario                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Uses
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Base Scenario                          │
│                   (baseScenario.js)                         │
│  - Browser management                                       │
│  - Common helper methods                                    │
│  - UX/Copy evaluation                                       │
│  - Product offer logic                                      │
│  - Error handling                                           │
└──────────┬─────────────────┬──────────────────────┬─────────┘
           │                 │                      │
           │                 │                      │
           ▼                 ▼                      ▼
┌──────────────────┐  ┌─────────────┐  ┌─────────────────────┐
│ Persona          │  │   Test      │  │   Playwright        │
│ Generator        │  │   Logger    │  │   Browser           │
│                  │  │             │  │                     │
│ - Creates users  │  │ - Logs steps│  │ - Chromium          │
│ - Business ideas │  │ - Tracks    │  │ - Page automation   │
│ - Addresses      │  │   issues    │  │ - Element finding   │
│ - Credentials    │  │ - Reports   │  │ - Interactions      │
└──────────────────┘  └─────────────┘  └─────────────────────┘
```

## Data Flow

```
┌────────────┐
│   START    │
└─────┬──────┘
      │
      ▼
┌──────────────────────┐
│ Generate Persona     │ ◄── personaGenerator.js
│ - Random business    │
│ - Unique email       │
│ - Test credentials   │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Initialize Scenario  │ ◄── baseScenario.js
│ - Launch browser     │
│ - Create logger      │
│ - Setup handlers     │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Execute Flow         │ ◄── Specific scenario (llcScenario.js, etc.)
│ - Navigate pages     │
│ - Fill forms         │
│ - Make decisions     │
│ - Handle products    │
└─────┬────────────────┘
      │
      │ (Each step)
      ▼
┌──────────────────────┐
│ Log Step Details     │ ◄── TestLogger (reportGenerator.js)
│ - Actions taken      │
│ - Data input         │
│ - UX evaluation      │
│ - Issues found       │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Complete & Cleanup   │
│ - Close browser      │
│ - Mark result        │
│ - Save report        │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Return Results       │
│ - Pass/Fail          │
│ - Duration           │
│ - Issues count       │
│ - Report path        │
└─────┬────────────────┘
      │
      │ (After all scenarios)
      ▼
┌──────────────────────┐
│ Generate Summary     │ ◄── generateSummaryReport()
│ - Aggregate stats    │
│ - Cross-scenario     │
│ - Recommendations    │
└─────┬────────────────┘
      │
      ▼
┌────────────┐
│    END     │
└────────────┘
```

## Class Hierarchy

```
BaseScenario (abstract)
│
├── LLCScenario
│   │
│   ├── DBAScenario (extends LLC)
│   │
│   ├── CorporationScenario (extends LLC)
│   │
│   ├── NonprofitScenario (extends LLC)
│   │
│   └── CustomScenario (extends LLC)
│
└── [Your Custom Scenarios]
```

## Key Design Patterns

### 1. Template Method Pattern

`BaseScenario` defines the skeleton:

```javascript
async run() {
  try {
    await this.initialize();     // Common setup
    await this.navigateToHome(); // Common navigation
    await this.execute();        // Scenario-specific (abstract)
    await this.cleanup();        // Common cleanup
  } catch (error) {
    // Error handling
  }
}
```

Each scenario implements `execute()` with its specific logic.

### 2. Strategy Pattern

Product offer decisions use a strategy pattern:

```javascript
evaluateProductOffer(productName, businessType) {
  // Strategy varies by business type
  const strategy = productRelevance[productName][businessType];
  return makeDecision(strategy);
}
```

### 3. Observer Pattern

TestLogger observes scenario execution:

```javascript
scenario.execute() {
  // Perform action
  this.logger.logStep(details);  // Notify logger
  this.logger.logIssue(severity); // Log issues
}
```

### 4. Factory Pattern

Persona generation uses factory pattern:

```javascript
function generatePersona(scenarioType) {
  // Create appropriate persona based on type
  return new Persona(scenarioType);
}
```

## State Management

### Scenario State

```javascript
{
  browser: BrowserInstance,
  context: BrowserContext,
  page: Page,
  logger: TestLogger,
  persona: PersonaObject,
  businessDetails: BusinessObject
}
```

### Logger State

```javascript
{
  steps: [],
  issues: { critical: [], major: [], minor: [] },
  productDecisions: [],
  startTime: Date,
  endTime: Date,
  finalResult: boolean
}
```

## Execution Flow

### Sequential Execution

```
Orchestrator
  ├─→ Scenario 1 (complete) ─→ Delay ─→
  ├─→ Scenario 2 (complete) ─→ Delay ─→
  ├─→ Scenario 3 (complete) ─→ Delay ─→
  └─→ Generate Summary
```

### Parallel Potential

While currently sequential, the architecture supports parallel execution:

```javascript
const results = await Promise.all([
  scenario1.run(),
  scenario2.run(),
  scenario3.run()
]);
```

## Error Handling Strategy

### Layered Error Handling

```
┌─────────────────────────────────────┐
│ Orchestrator Level                  │
│ - Catches catastrophic failures     │
│ - Ensures all scenarios attempt     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ Scenario Level                      │
│ - Catches execution failures        │
│ - Logs issues                       │
│ - Returns results                   │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│ Helper Method Level                 │
│ - Retry logic (3 attempts)          │
│ - Element waiting                   │
│ - Graceful degradation              │
└─────────────────────────────────────┘
```

## Retry Mechanism

```javascript
async safeClick(selector) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.page.click(selector);
      return true;  // Success
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.wait(retryDelay);
    }
  }
}
```

## Report Generation Pipeline

```
Scenario Execution
      │
      │ Logs each step
      ▼
TestLogger.logStep()
      │
      │ Accumulates data
      ▼
TestLogger.complete()
      │
      │ Generates markdown
      ▼
TestLogger.generateReport()
      │
      │ Saves to disk
      ▼
Individual Report File
      │
      │ After all scenarios
      ▼
generateSummaryReport()
      │
      │ Aggregates results
      ▼
Summary Report File
```

## Extension Points

### 1. New Scenarios

Extend `BaseScenario` and implement `execute()`.

### 2. Custom Persona Types

Add to `personaGenerator.js` business types.

### 3. Additional Evaluations

Override evaluation methods in scenarios.

### 4. Custom Reporting

Extend `TestLogger` class.

### 5. Product Logic

Override `evaluateProductOffer()` method.

## Performance Considerations

### Browser Reuse

Currently creates new browser per scenario. Could be optimized:

```javascript
// Potential optimization
class TestOrchestrator {
  async runAll() {
    this.browser = await chromium.launch();

    for (const scenario of scenarios) {
      scenario.browser = this.browser;
      await scenario.run();
    }

    await this.browser.close();
  }
}
```

### Parallel Execution

Scenarios are independent and can run in parallel:

```javascript
const results = await Promise.allSettled([
  this.runScenario('llc', LLCScenario),
  this.runScenario('dba', DBAScenario),
  // ...
]);
```

### Headless Mode

Set `headless: true` for faster execution without GUI.

## Dependencies

```
playwright (^1.40.0)
  ├── Chromium
  ├── Firefox (optional)
  └── WebKit (optional)

Node.js (18+)
  ├── fs (file system)
  ├── path (path handling)
  └── ES Modules support
```

## Configuration Management

Currently hardcoded, but designed for config file support:

```javascript
// Future enhancement
import config from './config.js';

export class BaseScenario {
  constructor(persona, scenarioName) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timing.pageLoadTimeout;
    // ...
  }
}
```

## Security Considerations

1. **Test Credentials**: Uses non-production credentials
2. **Isolated Execution**: Each scenario uses unique email
3. **Browser Isolation**: Fresh context per scenario
4. **No Secrets in Code**: Credentials in config (example file)
5. **Report Sanitization**: Redacts sensitive data in reports

## Future Enhancements

1. **Visual Regression**: Screenshot comparison
2. **Performance Metrics**: Load time tracking
3. **Network Monitoring**: API call validation
4. **A/B Testing Support**: Multiple flow variants
5. **AI-Powered Analysis**: Automated issue detection
6. **Real-time Dashboard**: Live test monitoring
7. **Historical Tracking**: Trend analysis over time

---

This architecture provides a solid foundation for comprehensive, maintainable, and extensible E2E testing.
