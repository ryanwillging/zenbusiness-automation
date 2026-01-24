# AI Navigation Improvement Strategies

## Problem Statement
AI agents struggle with complex pages that have:
- Many interactive elements (dashboards, admin panels)
- Visual-only indicators (cards without labels, icons)
- Dynamic content (SPAs that change without URL changes)
- Nested scrollable areas
- Modals/overlays that block content

## Strategy 1: Viewport Awareness & Intelligent Scrolling

### Current Issue
- AI processes viewport chunks but may miss content below fold
- Journey pages have options that require scrolling to see

### Solution: Pre-scroll Strategy
```javascript
async analyzePageWithFullContext() {
  // 1. Capture viewport dimensions
  const viewport = await this.page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollHeight: document.body.scrollHeight
  }));

  // 2. If page is tall, take strategic screenshots
  if (viewport.scrollHeight > viewport.height * 1.5) {
    console.log('   Page has significant content below fold');

    // Option A: Full page screenshot (simple but large)
    const screenshot = await this.page.screenshot({ fullPage: true });

    // Option B: Multiple viewport screenshots with context
    // Scroll to each section, capture, send with position context
    const sections = await this.capturePageSections();
    return sections;
  }

  return await this.page.screenshot({ fullPage: false });
}

async capturePageSections() {
  const sections = [];
  const viewportHeight = await this.page.evaluate(() => window.innerHeight);
  const totalHeight = await this.page.evaluate(() => document.body.scrollHeight);

  // Capture every 1.5 viewports (30% overlap for context)
  for (let y = 0; y < totalHeight; y += viewportHeight * 0.7) {
    await this.page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await this.wait(200); // Let content settle
    const screenshot = await this.page.screenshot({ type: 'png' });
    sections.push({
      screenshot: screenshot.toString('base64'),
      position: y,
      isTopSection: y === 0,
      isBottomSection: (y + viewportHeight) >= totalHeight
    });
  }

  // Reset scroll position
  await this.page.evaluate(() => window.scrollTo(0, 0));
  return sections;
}
```

**Benefits:**
- ✅ AI sees ALL interactive elements
- ✅ Maintains spatial context
- ⚠️ Uses more tokens for large pages

## Strategy 2: Element Annotation (Visual Markers)

### Concept
Overlay numbered markers on interactive elements, then ask AI to select by number.

### Implementation
```javascript
async annotateInteractiveElements() {
  // Inject visual markers into the page
  const elements = await this.page.evaluate(() => {
    const interactives = [];
    let index = 1;

    // Find all clickable elements
    const selectors = [
      'button',
      'a[href]',
      'input',
      'select',
      '[role="button"]',
      '[onclick]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.offsetParent !== null) { // Visible only
          // Create marker
          const marker = document.createElement('div');
          marker.textContent = index;
          marker.style.cssText = `
            position: absolute;
            background: red;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 50%;
            z-index: 999999;
            font-size: 12px;
          `;

          // Position marker on element
          const rect = el.getBoundingClientRect();
          marker.style.left = (rect.left + window.scrollX) + 'px';
          marker.style.top = (rect.top + window.scrollY) + 'px';
          document.body.appendChild(marker);

          // Store element reference
          interactives.push({
            index: index,
            tag: el.tagName,
            text: el.textContent?.slice(0, 50),
            type: el.type || el.getAttribute('role'),
            selector: this.getUniqueSelector(el)
          });

          index++;
        }
      });
    });

    return interactives;
  });

  return elements;
}

async selectElementByVision() {
  // 1. Annotate elements with numbers
  const elements = await this.annotateInteractiveElements();

  // 2. Take screenshot with markers visible
  const screenshot = await this.page.screenshot({ fullPage: true });

  // 3. Ask AI which number to click
  const response = await this.anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: screenshot.toString('base64')
          }
        },
        {
          type: 'text',
          text: `Each interactive element has a red numbered marker.

Task: ${this.currentTask}

Which number should I click? Return ONLY the number.

Example: 5`
        }
      ]
    }]
  });

  const number = parseInt(response.content[0].text.trim());
  const element = elements.find(el => el.index === number);

  // 4. Click the selected element by its selector
  if (element) {
    await this.page.click(element.selector);
    console.log(`   Clicked element #${number}: ${element.text}`);
  }

  // 5. Remove markers
  await this.page.evaluate(() => {
    document.querySelectorAll('[style*="z-index: 999999"]').forEach(el => el.remove());
  });
}
```

**Benefits:**
- ✅ Eliminates ambiguity ("click the first button" → "click #3")
- ✅ Works even with poor accessibility labels
- ✅ Easy for AI to parse
- ⚠️ Requires marker injection (adds latency)

## Strategy 3: Semantic Region Detection

### Concept
Divide page into semantic regions (header, nav, main content, sidebar, footer) and guide AI to the right section.

### Implementation
```javascript
async identifyPageRegions() {
  return await this.page.evaluate(() => {
    const regions = {
      header: document.querySelector('header, [role="banner"], nav'),
      main: document.querySelector('main, [role="main"], #content, .content'),
      sidebar: document.querySelector('aside, [role="complementary"], .sidebar'),
      footer: document.querySelector('footer, [role="contentinfo"]'),
      modal: document.querySelector('[role="dialog"], .modal[style*="display: block"]')
    };

    const regionData = {};
    Object.entries(regions).forEach(([name, element]) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        regionData[name] = {
          exists: true,
          visible: element.offsetParent !== null,
          bounds: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          text: element.textContent?.slice(0, 100)
        };
      }
    });

    return regionData;
  });
}

async analyzeWithRegionContext() {
  const regions = await this.identifyPageRegions();
  const screenshot = await this.page.screenshot({ fullPage: false });

  // Tell AI which region to focus on
  const prompt = `Page has these regions: ${Object.keys(regions).filter(k => regions[k]?.exists).join(', ')}

Focus on the MAIN region. ${this.currentTask}

What should I click in the main content area?`;

  // Send to AI with region context...
}
```

**Benefits:**
- ✅ Reduces cognitive load (AI focuses on relevant area)
- ✅ Improves reliability on complex dashboards
- ✅ Prevents clicking navigation when we want main content

## Strategy 4: Progressive Disclosure Pattern

### Concept
Don't overwhelm AI with everything at once. Show high-level first, then drill down.

### Implementation
```javascript
async navigateComplexDashboard(goal) {
  // Level 1: Get overview
  const overview = await this.analyzePageSections();

  // Level 2: Identify relevant section
  const section = await this.identifyRelevantSection(goal, overview);

  // Level 3: Focus on that section with detail
  await this.scrollToSection(section);
  await this.wait(500);

  // Level 4: Analyze focused view
  const detailScreenshot = await this.page.screenshot({
    fullPage: false,
    clip: section.bounds // Crop to just this section
  });

  // Level 5: Make decision with focused context
  const action = await this.analyzeWithVision(detailScreenshot, goal);

  return action;
}

async identifyRelevantSection(goal, overview) {
  // Use cheap AI call to determine which section to focus on
  const response = await this.anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Goal: ${goal}

Sections visible: ${overview.map(s => s.description).join(', ')}

Which section number should I focus on? Return only the number.`
    }]
  });

  const sectionNumber = parseInt(response.content[0].text.trim());
  return overview[sectionNumber - 1];
}
```

**Benefits:**
- ✅ More cost-effective (cheap call to route, detailed call to act)
- ✅ Better accuracy (focused context)
- ✅ Scales to very large dashboards

## Strategy 5: Hybrid DOM + Vision Approach

### Concept
Use DOM for structure, vision for disambiguation.

### Implementation
```javascript
async intelligentElementSelection(description) {
  // Step 1: Use DOM to find candidates
  const candidates = await this.page.evaluate((desc) => {
    const elements = [];

    // Find elements matching description
    document.querySelectorAll('button, a, [role="button"]').forEach((el, idx) => {
      if (el.textContent.toLowerCase().includes(desc.toLowerCase())) {
        const rect = el.getBoundingClientRect();
        elements.push({
          index: idx,
          text: el.textContent.trim(),
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          selector: /* generate unique selector */
        });
      }
    });

    return elements;
  }, description);

  // Step 2: If multiple candidates, use vision to disambiguate
  if (candidates.length > 1) {
    console.log(`   Found ${candidates.length} candidates, using vision to select...`);

    // Annotate ONLY the candidates
    await this.highlightElements(candidates);
    const screenshot = await this.page.screenshot({ fullPage: false });

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot.toString('base64') } },
          {
            type: 'text',
            text: `Multiple "${description}" buttons found (highlighted).

Which one should I click for: ${this.currentTask}?

Candidates:
${candidates.map((c, i) => `${i + 1}. "${c.text}"`).join('\n')}

Return only the number.`
          }
        ]
      }]
    });

    const choice = parseInt(response.content[0].text.trim());
    await this.removeHighlights();
    return candidates[choice - 1];
  }

  // Step 3: Single candidate, click directly
  return candidates[0];
}
```

**Benefits:**
- ✅ Best of both worlds: DOM speed + vision accuracy
- ✅ Only uses expensive vision when needed
- ✅ Robust to UI changes

## Strategy 6: Continuous Learning (Advanced)

### Concept
Build a knowledge base of successful selector strategies for each page type.

### Implementation
```javascript
// Store successful patterns
const selectorKnowledgeBase = {
  '/f/journey': {
    'company-indicator': {
      successRate: 0.95,
      selector: 'label:has(input[type="radio"]):first-of-type',
      fallback: 'claude-vision'
    },
    'industry-selection': {
      successRate: 0.80,
      selector: 'li[role="option"]:first-child',
      fallback: 'scroll-and-vision'
    }
  }
};

async smartSelect(pageType, elementType) {
  const knowledge = selectorKnowledgeBase[pageType]?.[elementType];

  if (knowledge && knowledge.successRate > 0.85) {
    // Try proven strategy first
    try {
      await this.page.click(knowledge.selector);
      return true;
    } catch {
      // Failed, use fallback
      return await this[knowledge.fallback]();
    }
  }

  // No knowledge, use vision
  return await this.analyzeWithVision();
}
```

## Recommended Implementation Order

1. **Phase 1** (Immediate): Full-page screenshots for journey pages ✅ (Just implemented)
2. **Phase 2** (Next session): Element annotation for disambiguation
3. **Phase 3** (Week 2): Semantic region detection for dashboards
4. **Phase 4** (Future): Progressive disclosure for complex flows
5. **Phase 5** (Advanced): Learning system for continuous improvement

## Cost Comparison

| Strategy | Cost per page | Speed | Reliability |
|----------|---------------|-------|-------------|
| Current (GPT-4o-mini DOM) | ~$0.0001 | ⚡⚡⚡ | ⚠️⚠️ |
| Claude Haiku fullPage | ~$0.0003 | ⚡⚡ | ✅✅✅ |
| Element annotation | ~$0.0005 | ⚡ | ✅✅✅✅ |
| Region-focused | ~$0.0002 | ⚡⚡ | ✅✅✅ |
| Progressive disclosure | ~$0.0004 | ⚡ | ✅✅✅✅ |

**Recommendation for ZenBusiness:**
- Journey pages: Claude Haiku fullPage (reliable, moderate cost)
- Dashboards: Element annotation (best for many options)
- Forms: Keep GPT-4o-mini DOM (fast, cheap, works well)
