# 🤖 AI-Powered Autonomous Testing

## What Changed?

You now have **TWO testing approaches**:

### 1. **Deterministic Testing** (Original)
- Uses hardcoded selectors
- Fast and free
- Breaks when UI changes
- Good for stable flows

### 2. **AI-Powered Testing** (NEW! ✨)
- Uses Claude Vision API
- Adapts to UI changes automatically
- Self-healing and intelligent
- Costs ~$0.50-1.00 per run

## Quick Start: AI-Powered Testing

### Step 1: Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

### Step 2: Set API Key

Get your key from https://console.anthropic.com/

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

### Step 3: Run AI Test

```bash
npm run test:zenbusiness:ai
```

## How It Works

The AI agent:
1. **Takes a screenshot** of the current page
2. **Sends it to Claude** with your persona and objective
3. **Claude analyzes** and decides: "I see a 'Continue' button, I'll click it"
4. **Executes the action**
5. **Repeats** until the flow is complete

### Example Output

```
🚀 Starting autonomous flow: Complete LLC formation...

📍 Step 1/50
🤖 Claude's Decision:
   Reasoning: I can see a "Start My LLC" button prominently displayed. This is the entry point.
   Action: click
   Selector: button:has-text("Start My LLC")
   Description: Click the Start My LLC button

📍 Step 2/50
🤖 Claude's Decision:
   Reasoning: There's an email input field in the signup form. I'll use the persona's email.
   Action: fill
   Selector: input[type="email"]
   Value: test_llc_2025-12-01_xyz@zenbusiness.com
   Description: Enter email address

... continues autonomously for 30-50 steps ...

✅ Objective completed in 42 steps!
```

## Why This Solves Your Problem

**Your Issue**: "We cannot deterministically identify the variables we need to complete"

**AI Solution**: The agent doesn't use predetermined selectors. Instead:
- It **sees** the page like a human
- It **understands** what's being asked
- It **adapts** to whatever UI it encounters
- It **reasons** about what action makes sense

## Files Created

### Core AI Framework
- `utils/visionAgent.js` - The AI vision agent (232 lines)
- `scenarios/aiLLCScenario.js` - AI-powered LLC scenario (75 lines)

### Documentation
- `AI_POWERED_SETUP.md` - Complete setup guide
- `AI_AGENT_README.md` - This file

## Cost Breakdown

Per test run:
- ~50 screenshots @ Claude 3.5 Sonnet vision rates
- Estimated: **$0.50 - $1.00 per full flow**

Compare to:
- Manual QA: $50-100 per test (human time)
- Broken deterministic tests: Hours of debugging

## When to Use Each Approach

### Use Deterministic Testing When:
- ✅ UI is stable and rarely changes
- ✅ Speed is critical (CI/CD pipelines)
- ✅ Running hundreds of tests
- ✅ Cost must be zero

### Use AI-Powered Testing When:
- ✅ UI changes frequently
- ✅ Flow is complex and varied
- ✅ You can't predict selectors
- ✅ You want self-healing tests
- ✅ Quality > Speed

## Hybrid Approach (Recommended)

Use AI-powered testing as a **fallback**:

```javascript
try {
  // Try deterministic approach first (fast, free)
  await this.deterministicFill('input[name="email"]', this.persona.email);
} catch (error) {
  // Fall back to AI agent (adaptive, costs money)
  const action = await visionAgent.decideNextAction('Fill the email field');
  await visionAgent.executeAction(action);
}
```

## Product Decision Example

The AI agent automatically evaluates add-ons:

```
🤖 Claude's Decision:
   Reasoning: I see an EIN (Employer Identification Number) offer. For an LLC, this is highly relevant for tax purposes and business banking. I'll accept this.
   Action: click
   Selector: button:has-text("Add EIN")
   Description: Accept the EIN add-on service
```

It's been instructed to:
- Accept: EIN, Compliance, Domain (for LLC)
- Decline: Website Builder (LLCs often build custom sites)

## Commands

```bash
# AI-powered LLC test
npm run test:zenbusiness:ai

# Or directly
node zenbusiness-automation/testRunner.js --ai-llc

# Check if API key is set
echo $ANTHROPIC_API_KEY
```

## Troubleshooting

### "Missing API key"
```bash
export ANTHROPIC_API_KEY='your-key'
```

### "Module not found: @anthropic-ai/sdk"
```bash
npm install @anthropic-ai/sdk
```

### AI makes wrong decisions
Edit the system prompt in `utils/visionAgent.js` to provide better instructions.

### Costs too much
- Use deterministic for most tests
- Use AI only for critical/changing flows
- Reduce `maxSteps` from 50 to 30

## Next Steps

1. **Try it**: `npm run test:zenbusiness:ai`
2. **Compare**: Run deterministic and AI side-by-side
3. **Optimize**: Adjust prompts based on results
4. **Scale**: Use AI for new features, deterministic for regression

## The Power of AI Testing

This is a **fundamentally different approach** to test automation:

**Traditional**: "Click the button with ID `submit-btn-123`"
**AI-Powered**: "Progress through the onboarding flow"

The AI figures out the details. You just describe what you want to achieve.

---

**Questions?** Check `zenbusiness-automation/AI_POWERED_SETUP.md` for detailed setup.

**Ready?** Run `npm install @anthropic-ai/sdk` and set your API key!
