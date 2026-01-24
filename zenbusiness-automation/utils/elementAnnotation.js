/**
 * Element Annotation System
 * Overlays numbered markers on interactive elements for AI-guided selection
 * Eliminates ambiguity: "click button 5" vs "click the first button on the left"
 */

/**
 * Generate a unique CSS selector for an element
 * @param {Element} element - DOM element
 * @returns {string} - Unique selector
 */
function getUniqueSelector(element) {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Build path from element to root
  const path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.match(/^[0-9]/));
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    if (current.parentNode) {
      const siblings = Array.from(current.parentNode.children).filter(
        el => el.nodeName === current.nodeName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentNode;

    // Stop at body or after 4 levels (keep selector reasonable)
    if (!current || current.nodeName === 'BODY' || path.length >= 4) {
      break;
    }
  }

  return path.join(' > ');
}

/**
 * Annotate all interactive elements on the page with numbered markers
 * @returns {Array} - List of annotated elements with metadata
 */
export function annotateInteractiveElements() {
  const interactives = [];
  let index = 1;

  // Element types to annotate
  const selectors = [
    'button:not([disabled])',
    'a[href]:not([href=""])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="link"]',
    '[role="option"]',
    '[role="radio"]',
    '[role="checkbox"]',
    '[onclick]',
    'label:has(input[type="radio"])',
    'label:has(input[type="checkbox"])',
    // Card-style clickable containers
    '[class*="card"][class*="clickable"]',
    '[class*="option-card"]',
    '[data-testid*="option"]',
    '[data-testid*="card"]'
  ];

  // Track used positions to avoid overlap
  const usedPositions = new Set();

  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        // Skip if not visible
        if (el.offsetParent === null) return;

        // Skip if already annotated
        if (el.dataset.annotationIndex) return;

        // Get bounding box
        const rect = el.getBoundingClientRect();

        // Skip tiny elements (likely invisible or decorative)
        if (rect.width < 10 || rect.height < 10) return;

        // Create unique position key to avoid marker overlap
        const posKey = `${Math.round(rect.left / 10)}_${Math.round(rect.top / 10)}`;
        if (usedPositions.has(posKey)) return;
        usedPositions.add(posKey);

        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'ai-annotation-marker';
        marker.textContent = index;
        marker.dataset.annotationFor = index;

        marker.style.cssText = `
          position: fixed;
          top: ${rect.top + window.scrollY}px;
          left: ${rect.left + window.scrollX}px;
          background: #FF0000;
          color: #FFFFFF;
          font-weight: bold;
          font-family: Arial, sans-serif;
          padding: 4px 8px;
          border-radius: 12px;
          z-index: 999999;
          font-size: 14px;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          pointer-events: none;
          line-height: 1;
        `;

        document.body.appendChild(marker);

        // Store element metadata
        el.dataset.annotationIndex = index;

        interactives.push({
          index: index,
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 100) || el.getAttribute('aria-label') || '',
          type: el.type || el.getAttribute('role') || el.tagName.toLowerCase(),
          value: el.value || '',
          href: el.href || '',
          selector: getUniqueSelector(el),
          bounds: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          }
        });

        index++;
      });
    } catch (e) {
      console.warn(`Failed to annotate selector ${selector}:`, e);
    }
  });

  return interactives;
}

/**
 * Remove all annotation markers from the page
 */
export function removeAnnotations() {
  // Remove marker elements
  document.querySelectorAll('.ai-annotation-marker').forEach(el => el.remove());

  // Remove data attributes
  document.querySelectorAll('[data-annotation-index]').forEach(el => {
    delete el.dataset.annotationIndex;
  });
}

/**
 * Highlight specific elements (for disambiguation)
 * @param {Array} elementIndices - Array of annotation indices to highlight
 */
export function highlightElements(elementIndices) {
  elementIndices.forEach(idx => {
    const marker = document.querySelector(`[data-annotation-for="${idx}"]`);
    if (marker) {
      marker.style.background = '#00FF00'; // Green for highlighted
      marker.style.border = '3px solid #FFFF00'; // Yellow border
      marker.style.animation = 'pulse 1s infinite';
    }
  });

  // Add pulse animation
  if (!document.getElementById('annotation-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'annotation-pulse-style';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Get element by annotation index
 * @param {number} index - Annotation index
 * @returns {Element|null} - The annotated element
 */
export function getElementByIndex(index) {
  return document.querySelector(`[data-annotation-index="${index}"]`);
}

/**
 * Export all functions for use in Playwright page.evaluate()
 */
export const AnnotationSystem = {
  annotateInteractiveElements,
  removeAnnotations,
  highlightElements,
  getElementByIndex,
  getUniqueSelector
};
