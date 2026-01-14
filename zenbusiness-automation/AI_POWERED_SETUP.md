# AI-Powered Testing Setup

The framework now includes **AI-powered autonomous testing** using Claude's vision API. The AI agent can see the page, understand what to do, and adapt to any UI changes automatically.

## Setup

### 1. Install Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

### 2. Set Your API Key

Get your Anthropic API key from: https://console.anthropic.com/

Then set it as an environment variable:

```bash
# macOS/Linux
export ANTHROPIC_API_KEY='your-api-key-here'

# Or add to your ~/.zshrc or ~/.bashrc
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.zshrc
```

### 3. Run AI-Powered Test

```bash
# Run the AI-powered LLC scenario
node zenbusiness-automation/testRunner.js --ai-llc
```

## How It Works

The AI-powered scenario:

1. **Takes a screenshot** of the current page
2. **Sends it to Claude** with context about the persona and objective
3. **Claude analyzes** the screenshot and decides what action to take
4. **Executes the action** (click, fill, select, etc.)
5. **Repeats** until the flow is complete

### Example Flow

```
📍 Step 1/50
🤖 Claude's Decision:
   Reasoning: I can see a "Start My LLC" button on the homepage. This is the entry point for LLC formation.
   Action: click
   Description: Click the "Start My LLC" button

📍 Step 2/50
🤖 Claude's Decision:
   Reasoning: I see an email input field. I'll fill it with the persona's email address.
   Action: fill
   Description: Enter email address in the signup form

... continues autonomously ...
```

## Advantages of AI-Powered Testing

✅ **Adapts to UI changes** - No need to update selectors
✅ **Understands context** - Makes intelligent decisions based on what it sees
✅ **Self-healing** - Can recover from unexpected UI states
✅ **Natural language** - You define objectives, not step-by-step instructions
✅ **Screenshot evidence** - Visual proof of each step

## Cost Considerations

- Uses Claude 3.5 Sonnet with vision
- ~50 screenshots per full flow
- Estimated cost: ~$0.50-1.00 per test run
- Much cheaper than manual QA time!

## Comparison: Deterministic vs AI-Powered

| Feature | Deterministic | AI-Powered |
|---------|--------------|------------|
| Speed | Faster | Slower (API calls) |
| Cost | Free | ~$0.50-1.00/run |
| Adaptability | Brittle | Very adaptive |
| Maintenance | High | Low |
| Debugging | Easier | Harder |
| Reliability | Breaks on UI changes | Self-healing |

## Configuration

You can adjust the AI agent in `utils/visionAgent.js`:

```javascript
// Max steps before giving up
await agent.runAutonomousFlow(objective, 50);

// Change the model
model: 'claude-3-5-sonnet-20241022'

// Adjust the system prompt for different behavior
const systemPrompt = `...`
```

## Product Decision Logic

The AI agent is instructed to make smart decisions about product add-ons:

- **For LLC**: Accept EIN, Compliance, Domain. Decline Website Builder.
- **For Corporation**: Accept EIN, Compliance, Banking. Decline Website Builder.
- **For Nonprofit**: Accept EIN, Compliance. Decline for-profit products.
- **For DBA**: Decline most add-ons (simple structure).

You can customize this in the system prompt.

## Troubleshooting

### API Key Not Found
```
Error: Missing API key
```
Solution: Set `ANTHROPIC_API_KEY` environment variable

### Rate Limits
```
Error: Rate limit exceeded
```
Solution: Add delays between runs or upgrade your API tier

### Invalid JSON Response
```
Error: Could not parse action decision
```
Solution: Claude occasionally returns malformed JSON. The agent will retry.

## Using AI for Other Scenarios

You can create AI-powered versions of any scenario:

```javascript
import { VisionAgent } from '../utils/visionAgent.js';

export class AICorporationScenario extends BaseScenario {
  async execute() {
    const agent = new VisionAgent(this.page, this.persona, this.businessDetails);

    const objective = `Complete corporation formation...`;

    const result = await agent.runAutonomousFlow(objective, 50);

    return { veloReached: result.success };
  }
}
```

## Best Practices

1. **Start with deterministic** for simple, stable flows
2. **Use AI for complex** or frequently changing flows
3. **Combine both** - deterministic for speed, AI as fallback
4. **Monitor costs** - Track API usage in high-volume scenarios
5. **Review screenshots** - Check the visual evidence after failures

## Future Enhancements

- Cache screenshots for debugging
- Fine-tune prompts per business type
- Add retry logic for API failures
- Parallel decision-making for faster execution
- Training data generation from successful runs

---

**Ready to try it?**

```bash
export ANTHROPIC_API_KEY='your-key'
npm install @anthropic-ai/sdk
node zenbusiness-automation/testRunner.js --ai-llc
```
