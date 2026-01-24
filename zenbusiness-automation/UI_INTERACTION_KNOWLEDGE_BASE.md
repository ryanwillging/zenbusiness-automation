# UI Interaction Knowledge Base

A comprehensive guide to interacting with common UI elements based on industry best practices, W3C ARIA patterns, and modern React component libraries.

**Purpose:** Query this knowledge base before attempting generic element interactions. Patterns are ordered by reliability (try specific patterns first, generic last).

**Last Updated:** 2026-01-24

---

## Table of Contents

1. [Combobox / Searchable Dropdown](#combobox--searchable-dropdown)
2. [Native Select Dropdown](#native-select-dropdown)
3. [Modal Dialogs](#modal-dialogs)
4. [Radio Button Groups](#radio-button-groups)
5. [Card-Style Selection](#card-style-selection)
6. [Text Input Fields](#text-input-fields)
7. [Listbox / Menu Selection](#listbox--menu-selection)
8. [Buttons](#buttons)

---

## Combobox / Searchable Dropdown

### Identification
- ARIA: `role="combobox"`
- Visual: Dropdown with search/filter capability, shows "Please select" or placeholder
- Common in: Industry codes (NAICS), state/county selection, tag selection
- Libraries: Material-UI Autocomplete, Ant Design Select (search mode), Chakra Combobox

### Interaction Pattern

#### Method 1: Type-to-Filter (Most Common)
```javascript
// 1. Click the combobox trigger to open
await page.click('[role="combobox"]');

// 2. Type text to filter options
await page.keyboard.type('Agriculture');

// 3. Wait for filtered results to appear
await page.waitForSelector('[role="option"]');

// 4. Click first filtered option
await page.click('[role="option"]:first-child');
```

**Stagehand equivalent:**
```javascript
await act('Click the dropdown, type "Agriculture", then click the first option that appears');
```

#### Method 2: Arrow Key Navigation
```javascript
await page.click('[role="combobox"]');
await page.keyboard.press('ArrowDown'); // Navigate to first option
await page.keyboard.press('Enter'); // Select
```

#### Method 3: Direct Option Click (if visible)
```javascript
// Some comboboxes show options on click without needing search
await page.click('[role="combobox"]');
await page.click('[role="option"]:first-child');
```

### Detection Strategy
```javascript
// Check for combobox in DOM
const isCombobox = await page.evaluate(() => {
  const element = document.querySelector('[role="combobox"], input[aria-autocomplete]');
  if (!element) return false;

  // Check for "Please select" placeholder
  const text = element.textContent || element.value || element.placeholder || '';
  return text.toLowerCase().includes('please select') ||
         text.toLowerCase().includes('select') ||
         text === '';
});
```

### Troubleshooting
- **Empty after typing:** Wait longer for async options to load
- **Option not clickable:** Try `await page.keyboard.press('Enter')` instead
- **Dropdown closes immediately:** Element might have `blur` event - use `await page.keyboard.press('ArrowDown')` to keep focus

### Sources
- [Combobox Pattern | WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Chakra UI Combobox](https://chakra-ui.com/docs/components/combobox)
- [Ant Design Select](https://ant.design/components/select/)

---

## Native Select Dropdown

### Identification
- HTML: `<select>` element
- No ARIA role needed (semantic HTML)
- Visual: Native browser dropdown styling
- Common in: Simple state/country pickers, month/year selectors

### Interaction Pattern

#### Method 1: selectOption() (Best for Playwright)
```javascript
// Select by visible label
await page.selectOption('select#state', { label: 'California' });

// Select by value attribute
await page.selectOption('select#state', { value: 'CA' });

// Select by index
await page.selectOption('select#state', { index: 4 });

// Multiple selection
await page.selectOption('select#states', [
  { value: 'CA' },
  { value: 'NY' }
]);
```

**Stagehand equivalent:**
```javascript
// Stagehand may not support selectOption, use act instead
await act('Select "California" from the state dropdown');
```

#### Method 2: Click-and-Select
```javascript
await page.click('select#state');
await page.click('option[value="CA"]');
```

### Detection Strategy
```javascript
const isNativeSelect = await page.evaluate(() => {
  return document.querySelectorAll('select').length > 0;
});
```

### Troubleshooting
- **Option not visible:** Native selects hide options until opened - use `selectOption()` instead of clicking
- **Value doesn't persist:** Check for JavaScript that resets the field - verify after selection

### Sources
- [Playwright Select Option](https://www.browserstack.com/guide/playwright-select-option)
- [Handling Dropdowns in Playwright](https://www.testmu.ai/learning-hub/handling-alerts-and-dropdowns-in-playwright/)

---

## Modal Dialogs

### Identification
- ARIA: `role="dialog"` or `role="alertdialog"` with `aria-modal="true"`
- Visual: Overlay covering page content, backdrop darkening background
- Common in: Confirmations, help popups ("How can we help?"), login forms

### Interaction Pattern

#### Method 1: Close Button (Most Common)
```javascript
// Try multiple close button patterns
const closeSelectors = [
  'button[aria-label*="close" i]',
  'button[aria-label*="dismiss" i]',
  '[role="dialog"] button:has(svg)', // Icon close buttons
  '[role="dialog"] .close',
  '[role="dialog"] [data-dismiss]'
];

for (const selector of closeSelectors) {
  const button = await page.locator(selector).first();
  if (await button.isVisible({ timeout: 1000 })) {
    await button.click();
    break;
  }
}
```

**Stagehand equivalent:**
```javascript
await act('Click the X button or close button in the top-right corner of the modal');
```

#### Method 2: Escape Key
```javascript
await page.keyboard.press('Escape');
```

#### Method 3: Backdrop Click (if dismissible)
```javascript
// Click outside the dialog content
await page.click('[role="dialog"]', { position: { x: 5, y: 5 } });
```

### Detection Strategy
```javascript
const hasModal = await page.evaluate(() => {
  // Check for visible modal
  const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
  if (!modal) return false;

  // Verify it's actually visible
  return modal.offsetParent !== null;
});
```

### Focus Management
- Modals trap focus inside (Tab cycles through modal elements only)
- Initial focus should be on first interactive element or static element at top
- Focus returns to trigger element on close

### Troubleshooting
- **Modal blocks interaction:** Always check for modals before other interactions
- **Multiple modals stacked:** Close in reverse order (newest first)
- **Persistent after close:** Verify with screenshot - modal might have animation delay

### Sources
- [Modal Dialog Pattern | WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Modal Dialog Example | W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/)
- [ARIA Modal Dialogs | Deque](https://www.deque.com/blog/aria-modal-alert-dialogs-a11y-support-series-part-2/)

---

## Radio Button Groups

### Identification
- ARIA: `role="radiogroup"` containing `role="radio"` elements
- HTML: `<input type="radio">` with shared `name` attribute
- Visual: Circles/buttons where only one can be selected
- Common in: Yes/No questions, multiple choice, single-select options

### Interaction Pattern

#### Method 1: Click Label (Most Reliable)
```javascript
// Click the <label> associated with radio input
await page.click('label:has(input[type="radio"]):first-of-type');
```

**Stagehand equivalent:**
```javascript
await act('Click the first radio button option');
```

#### Method 2: Click Radio Input
```javascript
await page.click('input[type="radio"]:first-of-type');
```

#### Method 3: Arrow Key Navigation (Keyboard Users)
```javascript
// Focus radio group
await page.click('[role="radiogroup"]');
// Navigate with arrows
await page.keyboard.press('ArrowDown'); // Next option
await page.keyboard.press('Space'); // Select (optional, auto-selects on arrow)
```

### Detection Strategy
```javascript
const hasRadioButtons = await page.evaluate(() => {
  const radios = document.querySelectorAll('input[type="radio"], [role="radio"]');
  return radios.length > 0 && radios[0].offsetParent !== null;
});
```

### Troubleshooting
- **Click doesn't register:** Click label instead of input (larger hit area)
- **Wrong option selected:** Use `:first-of-type` or filter by text content
- **Selection doesn't persist:** Check for JavaScript validation - might require other fields first

---

## Card-Style Selection

### Identification
- Visual: Large rectangular cards/buttons with content (text, icons)
- Often contain radio input or act as button
- Common in: Package selection, feature choices, onboarding questions
- Libraries: Custom implementations, Chakra UI Card + Radio, Material-UI CardActionArea

### Interaction Pattern

#### Method 1: Click Card Container
```javascript
// Cards are usually clickable containers
await page.click('[class*="card"][class*="option"]:first-of-type');
```

**Stagehand equivalent:**
```javascript
await act('Click the first white card option');
```

#### Method 2: Click Radio Inside Card
```javascript
// Some cards wrap a radio input
await page.click('[class*="card"]:first-of-type input[type="radio"]');
```

#### Method 3: Click by Text Content
```javascript
// Select card containing specific text
await page.click('text="Starter Package"');
```

### Detection Strategy
```javascript
const hasCards = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="card"], [class*="option"]');
  // Check if cards have interactive elements inside
  for (const card of cards) {
    if (card.querySelector('input[type="radio"]') ||
        card.hasAttribute('onclick') ||
        card.role === 'button') {
      return true;
    }
  }
  return false;
});
```

### Troubleshooting
- **Card not clickable:** Try clicking radio inside instead
- **Multiple cards match:** Filter by text content or position (first, last)
- **Click registers but no selection:** Card might need double-click or have nested button

---

## Text Input Fields

### Identification
- HTML: `<input type="text">`, `<input>` (no type), `<textarea>`
- ARIA: No specific role (semantic HTML preferred)
- Visual: Rectangular boxes with cursor on focus
- Common in: Forms, search bars, name/email fields

### Interaction Pattern

#### Method 1: fill() (Playwright - Best)
```javascript
// fill() clears existing value then types
await page.fill('input[name="email"]', 'user@example.com');
```

**Stagehand equivalent:**
```javascript
await act('Type "user@example.com" into the email field');
```

#### Method 2: type() / keyboard.type()
```javascript
// type() appends without clearing
await page.click('input[name="email"]'); // Focus first
await page.keyboard.type('user@example.com');
```

#### Method 3: pressSequentially() (Realistic Typing)
```javascript
// Types with delays between characters (more human-like)
await page.locator('input[name="email"]').pressSequentially('user@example.com', {
  delay: 100 // ms between keystrokes
});
```

### Auto-Complete Handling
```javascript
// Disable autocomplete interference
await page.fill('input[name="email"]', ''); // Clear first
await page.fill('input[name="email"]', 'user@example.com');
await page.keyboard.press('Escape'); // Dismiss autocomplete suggestions
```

### Detection Strategy
```javascript
const hasEmptyTextInput = await page.evaluate(() => {
  const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  for (const input of inputs) {
    if (!input.value && input.offsetParent !== null && !input.disabled) {
      return true;
    }
  }
  return false;
});
```

### Troubleshooting
- **Value doesn't persist:** Field might have validation on blur - click another element after filling
- **Wrong field filled:** Be specific with selectors (use name, id, or aria-label)
- **Characters missing:** Use `fill()` instead of `type()` for better reliability

### Sources
- [Playwright Input Actions](https://playwright.dev/docs/input)

---

## Listbox / Menu Selection

### Identification
- ARIA: `role="listbox"` containing `role="option"` elements
- Visual: Vertical list of selectable items (not a table)
- Common in: NAICS codes, category selection, filterable lists
- Libraries: Material-UI List, Ant Design Menu

### Interaction Pattern

#### Method 1: Click Option
```javascript
// Click first visible option
await page.click('[role="option"]:first-child');
```

**Stagehand equivalent:**
```javascript
await act('Click the first item in the list');
```

#### Method 2: Type-to-Filter then Click
```javascript
// If listbox supports filtering
await page.click('[role="listbox"]');
await page.keyboard.type('Agr'); // Filter to "Agriculture"
await page.click('[role="option"]:visible:first');
```

#### Method 3: Arrow Key Navigation
```javascript
await page.click('[role="listbox"]');
await page.keyboard.press('ArrowDown'); // First option
await page.keyboard.press('ArrowDown'); // Second option
await page.keyboard.press('Enter'); // Select
```

### Detection Strategy
```javascript
const hasListbox = await page.evaluate(() => {
  const listbox = document.querySelector('[role="listbox"]');
  if (!listbox) return false;

  const options = listbox.querySelectorAll('[role="option"]');
  return options.length > 0 && listbox.offsetParent !== null;
});
```

### Troubleshooting
- **Options not visible:** Listbox might be collapsed - click to expand first
- **Click doesn't register:** Option might be disabled - check `aria-disabled`
- **Multiple listboxes:** Be specific with selector or filter by nearby text

---

## Buttons

### Identification
- HTML: `<button>`, `<input type="submit">`, `<input type="button">`
- ARIA: `role="button"`
- Visual: Clickable element with text/icon, distinct styling
- Common everywhere

### Interaction Pattern

#### Method 1: Click by Text (Most Readable)
```javascript
await page.click('button:has-text("Continue")');
// Or with Playwright's text selector
await page.click('text="Continue"');
```

**Stagehand equivalent:**
```javascript
await act('Click the "Continue" button');
```

#### Method 2: Click by Role + Name
```javascript
await page.click('button[name="submit"]');
await page.click('button[aria-label="Close"]');
```

#### Method 3: Click by Position (Last Resort)
```javascript
// First button
await page.click('button:first-of-type');
// Last button
await page.click('button:last-of-type');
```

### Button States
- **Disabled:** `disabled` attribute or `aria-disabled="true"` - not clickable
- **Loading:** Often shows spinner, might be temporarily disabled
- **Primary vs Secondary:** Primary (colored) = main action, Secondary (outline) = cancel/back

### Detection Strategy
```javascript
const hasEnabledButton = await page.evaluate((text) => {
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const button of buttons) {
    if (button.textContent.includes(text) &&
        !button.disabled &&
        button.offsetParent !== null) {
      return true;
    }
  }
  return false;
}, 'Continue');
```

### Troubleshooting
- **Button not clickable:** Check if disabled - look for required field validation
- **Click doesn't navigate:** Button might need form validation to pass first
- **Multiple buttons match:** Filter by text, position, or parent context

---

## Query Strategy

When encountering an unknown element, query this knowledge base in order:

1. **Check element type** (combobox, select, dialog, radio, etc.)
2. **Try Method 1** (most reliable pattern)
3. **If fails, try Method 2**
4. **If still fails, try Method 3**
5. **If all fail, use generic AI strategy**

### Example Usage in Code

```javascript
async function smartInteract(page, element) {
  // 1. Identify element type
  const elementType = await identifyElementType(page, element);

  // 2. Query knowledge base for pattern
  const pattern = KNOWLEDGE_BASE[elementType];

  // 3. Try methods in order
  for (const method of pattern.methods) {
    try {
      await method.execute(page, element);
      return true; // Success
    } catch (e) {
      console.log(`Method ${method.name} failed, trying next...`);
    }
  }

  // 4. Fallback to AI
  return await aiGenericInteraction(page, element);
}
```

---

## Continuous Improvement

This knowledge base should be updated when:
- New UI patterns are encountered in testing
- Interaction methods fail repeatedly
- New libraries/frameworks are adopted
- W3C ARIA patterns are updated

**Contribution Format:**
```markdown
## New Pattern Name

### Identification
- How to recognize this pattern

### Interaction Pattern
#### Method 1: [Name]
[Code example]

### Sources
- [Link to documentation]
```

---

## Sources

### React UI Libraries
- [Chakra UI Combobox](https://chakra-ui.com/docs/components/combobox)
- [Ant Design Select](https://ant.design/components/select/)
- [Material-UI Select](https://mui.com/material-ui/react-select/)
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026)

### W3C WAI-ARIA Guidelines
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Combobox Pattern | WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Modal Dialog Pattern | WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Accessible Rich Internet Applications (WAI-ARIA) 1.3](https://w3c.github.io/aria/)

### Playwright Documentation
- [15 Best Practices for Playwright testing in 2026](https://www.browserstack.com/guide/playwright-best-practices)
- [How to Handle Playwright Alerts and Dropdowns](https://www.testmu.ai/learning-hub/handling-alerts-and-dropdowns-in-playwright/)
- [Playwright Select Option Guide](https://www.browserstack.com/guide/playwright-select-option)
- [Playwright Input Actions](https://playwright.dev/docs/input)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
