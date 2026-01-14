#!/usr/bin/env node
/**
 * Step Cache Manager
 * View and manage the learned step cache
 */

import { StepCache } from './utils/stepCache.js';

const cache = new StepCache();
const command = process.argv[2];

switch (command) {
  case 'stats':
  case 'status':
    showStats();
    break;

  case 'show':
  case 'list':
    showCache();
    break;

  case 'clear':
    cache.clear();
    console.log('✅ Cache cleared');
    break;

  case 'help':
  default:
    showHelp();
    break;
}

function showStats() {
  const stats = cache.getStats();

  console.log('\n📊 Step Cache Statistics\n');
  console.log(`Pages Learned: ${stats.pageCount}`);
  console.log(`Total Cached Steps: ${stats.totalSteps}`);
  console.log(`Total Successes: ${stats.totalSuccesses}`);
  console.log(`Total Attempts: ${stats.totalAttempts}`);
  console.log(`Overall Success Rate: ${(stats.overallSuccessRate * 100).toFixed(1)}%`);
  console.log('');
}

function showCache() {
  const cacheData = cache.cache;

  if (Object.keys(cacheData).length === 0) {
    console.log('\n📭 Cache is empty\n');
    return;
  }

  console.log('\n📚 Cached Steps\n');

  Object.entries(cacheData).forEach(([pageKey, data]) => {
    console.log(`\n🔹 ${pageKey}`);
    console.log(`   Last Success: ${new Date(data.lastSuccess).toLocaleString()}`);
    console.log(`   Success Rate: ${data.successCount}/${data.totalAttempts} (${((data.successCount / data.totalAttempts) * 100).toFixed(0)}%)`);
    console.log(`   Steps (${data.steps.length}):`);

    data.steps.forEach((step, index) => {
      console.log(`     ${index + 1}. ${step.action.toUpperCase()}: ${step.description}`);
      if (step.selector) {
        console.log(`        Selector: ${step.selector}`);
      }
      if (step.value) {
        console.log(`        Value: ${step.value}`);
      }
    });
  });

  console.log('');
}

function showHelp() {
  console.log(`
📚 Step Cache Manager

Usage:
  node cache-manager.js [command]

Commands:
  stats     Show cache statistics
  show      Show all cached steps
  clear     Clear all cached steps
  help      Show this help message

Examples:
  node zenbusiness-automation/cache-manager.js stats
  node zenbusiness-automation/cache-manager.js show
  node zenbusiness-automation/cache-manager.js clear
  `);
}
