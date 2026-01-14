/**
 * Step Cache
 * Learns and remembers successful steps for each page
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class StepCache {
  constructor(cacheFile = './zenbusiness-automation/step-cache.json') {
    this.cacheFile = cacheFile;
    this.cache = this.loadCache();
  }

  /**
   * Load cached steps from disk
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log(`⚠️  Could not load step cache: ${error.message}`);
    }
    return {};
  }

  /**
   * Save cache to disk
   */
  saveCache() {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      console.log(`⚠️  Could not save step cache: ${error.message}`);
    }
  }

  /**
   * Generate a unique key for a page state
   */
  generatePageKey(url, pageTitle) {
    // Normalize URL (remove query params and hash)
    const normalizedUrl = url.split('?')[0].split('#')[0];

    // Create a simple key from URL path
    const urlPath = new URL(normalizedUrl).pathname;

    return `${urlPath}`;
  }

  /**
   * Get cached steps for a page
   */
  getCachedSteps(url, pageTitle) {
    const key = this.generatePageKey(url, pageTitle);

    if (this.cache[key]) {
      const cached = this.cache[key];
      console.log(`\n📚 Found ${cached.steps.length} cached step(s) for ${key}`);
      console.log(`   Last successful: ${new Date(cached.lastSuccess).toLocaleString()}`);
      console.log(`   Success rate: ${cached.successCount}/${cached.totalAttempts}`);
      return cached.steps;
    }

    console.log(`\n🆕 No cached steps for ${key} - will use AI agent`);
    return null;
  }

  /**
   * Cache a successful step
   */
  cacheStep(url, pageTitle, action) {
    const key = this.generatePageKey(url, pageTitle);

    if (!this.cache[key]) {
      this.cache[key] = {
        steps: [],
        successCount: 0,
        totalAttempts: 0,
        lastSuccess: null,
        createdAt: new Date().toISOString()
      };
    }

    // Add the step if it's not already there
    const stepExists = this.cache[key].steps.some(s =>
      s.action === action.action &&
      s.selector === action.selector
    );

    if (!stepExists) {
      this.cache[key].steps.push({
        action: action.action,
        selector: action.selector,
        value: action.value,
        description: action.description,
        reasoning: action.reasoning
      });
    }

    this.cache[key].successCount++;
    this.cache[key].totalAttempts++;
    this.cache[key].lastSuccess = new Date().toISOString();

    this.saveCache();
    console.log(`   💾 Cached successful step for ${key}`);
  }

  /**
   * Mark a cached step as failed
   */
  markStepFailed(url, pageTitle) {
    const key = this.generatePageKey(url, pageTitle);

    if (this.cache[key]) {
      this.cache[key].totalAttempts++;

      // If success rate drops below 50%, clear the cache for this page
      const successRate = this.cache[key].successCount / this.cache[key].totalAttempts;
      if (successRate < 0.5 && this.cache[key].totalAttempts > 5) {
        console.log(`   ⚠️  Success rate too low for ${key} (${(successRate * 100).toFixed(0)}%) - clearing cache`);
        delete this.cache[key];
        this.saveCache();
      }
    }
  }

  /**
   * Get statistics about the cache
   */
  getStats() {
    const pageCount = Object.keys(this.cache).length;
    const totalSteps = Object.values(this.cache).reduce((sum, page) => sum + page.steps.length, 0);
    const totalSuccesses = Object.values(this.cache).reduce((sum, page) => sum + page.successCount, 0);
    const totalAttempts = Object.values(this.cache).reduce((sum, page) => sum + page.totalAttempts, 0);

    return {
      pageCount,
      totalSteps,
      totalSuccesses,
      totalAttempts,
      overallSuccessRate: totalAttempts > 0 ? (totalSuccesses / totalAttempts) : 0
    };
  }

  /**
   * Clear all cached steps
   */
  clear() {
    this.cache = {};
    this.saveCache();
    console.log(`🗑️  Cleared all cached steps`);
  }

  /**
   * Clear cache for a specific page
   */
  clearPage(url, pageTitle) {
    const key = this.generatePageKey(url, pageTitle);
    if (this.cache[key]) {
      delete this.cache[key];
      this.saveCache();
      console.log(`🗑️  Cleared cache for ${key}`);
    }
  }
}
