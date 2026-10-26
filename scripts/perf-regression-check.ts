import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface Budget {
  metric: string;
  actual: number;
  threshold: number;
  operator: '<' | '<=' | '>' | '>=';
  unit: string;
  passed: boolean;
}

async function runPerfBudgetCheck() {
  console.log('======================================================');
  console.log('  StreamVerse Automated Performance & Quality Budget  ');
  console.log('======================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  let totalJsBytes = 0;
  let totalRequests = 0;

  page.on('response', (response) => {
    totalRequests++;
    const headers = response.headers();
    const len = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
    if (response.request().resourceType() === 'script') {
      totalJsBytes += len;
    }
  });

  console.log('Loading http://localhost:4173/ ...');
  const response = await page.goto('http://localhost:4173/', { waitUntil: 'load', timeout: 15000 });
  if (!response || response.status() !== 200) {
    throw new Error(`Failed to load preview server. HTTP status: ${response?.status()}`);
  }

  // Allow DOM hydration and animations to settle
  await page.waitForTimeout(3000);

  // Collect Core Web Vitals & Performance Timing
  const perfData = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = navEntries[0] || ({} as any);

    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    const ttfb = nav.responseStart ? nav.responseStart - nav.requestStart : 0;
    const domInteractive = nav.domInteractive || 0;

    let lcp = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    let cls = 0;
    const layoutShiftEntries = performance.getEntriesByType('layout-shift') as any[];
    for (const entry of layoutShiftEntries) {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    }

    let tbt = 0;
    const longTaskEntries = performance.getEntriesByType('longtask');
    for (const task of longTaskEntries) {
      tbt += Math.max(0, task.duration - 50);
    }

    const h1Count = document.querySelectorAll('h1').length;
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const structuredData = Boolean(document.querySelector('script[type="application/ld+json"]'));

    return {
      ttfb,
      fcp,
      lcp,
      cls,
      tbt,
      domInteractive,
      h1Count,
      title,
      description,
      structuredData
    };
  });

  // Run Axe Core accessibility scan
  console.log('Running Axe Accessibility Verification...');
  const axeResults = await new AxeBuilder({ page }).analyze();
  const criticalOrSeriousViolations = axeResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  await browser.close();

  // Define Performance & Quality Budgets
  const budgets: Budget[] = [
    {
      metric: 'LCP (Largest Contentful Paint)',
      actual: Math.round(perfData.lcp),
      threshold: 2500,
      operator: '<=',
      unit: 'ms',
      passed: perfData.lcp <= 2500
    },
    {
      metric: 'CLS (Cumulative Layout Shift)',
      actual: Number(perfData.cls.toFixed(4)),
      threshold: 0.1,
      operator: '<=',
      unit: '',
      passed: perfData.cls <= 0.1
    },
    {
      metric: 'TBT (Total Blocking Time)',
      actual: Math.round(perfData.tbt),
      threshold: 200,
      operator: '<=',
      unit: 'ms',
      passed: perfData.tbt <= 200
    },
    {
      metric: 'FCP (First Contentful Paint)',
      actual: Math.round(perfData.fcp),
      threshold: 1800,
      operator: '<=',
      unit: 'ms',
      passed: perfData.fcp <= 1800
    },
    {
      metric: 'Axe Accessibility Violations (Critical/Serious)',
      actual: criticalOrSeriousViolations.length,
      threshold: 0,
      operator: '<=',
      unit: 'violations',
      passed: criticalOrSeriousViolations.length === 0
    },
    {
      metric: 'Total Accessibility Violations',
      actual: axeResults.violations.length,
      threshold: 0,
      operator: '<=',
      unit: 'violations',
      passed: axeResults.violations.length === 0
    },
    {
      metric: 'SEO Semantic Heading (h1 count)',
      actual: perfData.h1Count,
      threshold: 1,
      operator: '>=',
      unit: 'headings',
      passed: perfData.h1Count >= 1
    },
    {
      metric: 'SEO Structured Data (JSON-LD)',
      actual: perfData.structuredData ? 1 : 0,
      threshold: 1,
      operator: '>=',
      unit: 'script',
      passed: perfData.structuredData
    }
  ];

  console.log('\n----------------- BUDGET EVALUATION RESULTS -----------------');
  let hasFailure = false;
  for (const b of budgets) {
    const status = b.passed ? 'PASS [✓]' : 'FAIL [✗]';
    console.log(
      `${status.padEnd(10)} ${b.metric.padEnd(45)}: Actual ${b.actual}${b.unit} (Threshold: ${b.operator} ${b.threshold}${b.unit})`
    );
    if (!b.passed) hasFailure = true;
  }
  console.log('-------------------------------------------------------------\n');

  if (hasFailure) {
    console.error('Performance regression budget exceeded! Check above metrics.');
    process.exit(1);
  } else {
    console.log('All performance and quality regression thresholds PASSED successfully!');
    process.exit(0);
  }
}

runPerfBudgetCheck().catch((err) => {
  console.error('Regression check execution error:', err);
  process.exit(1);
});
