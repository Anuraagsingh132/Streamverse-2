import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

interface BaselineReport {
  timestamp: string;
  url: string;
  performance: {
    ttfbMs: number;
    fcpMs: number;
    lcpMs: number;
    cls: number;
    tbtMs: number;
    loadTimeMs: number;
    domInteractiveMs: number;
    totalRequests: number;
    totalBytes: number;
    jsBytes: number;
    cssBytes: number;
    imgBytes: number;
    resourceBreakdown: Record<string, { count: number; bytes: number }>;
  };
  accessibility: {
    violationsCount: number;
    passesCount: number;
    incompleteCount: number;
    violationsByImpact: Record<string, number>;
    violations: Array<{ id: string; impact: string; description: string; nodesCount: number }>;
  };
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    ogImage: string;
    h1Count: number;
    hasRobotsTxt: boolean;
    sitemapUrlCount: number;
  };
  security: {
    headers: Record<string, string>;
    warnings: string[];
  };
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const requests: Array<{ url: string; resourceType: string; size: number }> = [];

  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      const contentLength = headers['content-length'] ? parseInt(headers['content-length'], 10) : 0;
      requests.push({
        url: response.url(),
        resourceType: response.request().resourceType(),
        size: contentLength
      });
    } catch {}
  });

  console.log('Navigating to http://localhost:4173/ ...');
  const response = await page.goto('http://localhost:4173/', { waitUntil: 'load', timeout: 15000 });
  const headers = response?.headers() || {};

  // Wait 3 seconds for initial DOM rendering, hero banner images, and hydration to settle
  await page.waitForTimeout(3000);

  // Extract performance metrics via PerformanceObserver & NavigationTiming
  const perfMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0;

    let lcp = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // CLS
    let cls = 0;
    const layoutShifts = performance.getEntriesByType('layout-shift');
    for (const entry of layoutShifts as any[]) {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    }

    // Long tasks for TBT approximation
    let tbt = 0;
    const longTasks = performance.getEntriesByType('longtask');
    for (const entry of longTasks) {
      if (entry.duration > 50) {
        tbt += (entry.duration - 50);
      }
    }

    return {
      ttfbMs: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
      fcpMs: Math.round(fcp),
      lcpMs: Math.round(lcp),
      cls: Number(cls.toFixed(4)),
      tbtMs: Math.round(tbt),
      loadTimeMs: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
      domInteractiveMs: nav ? Math.round(nav.domInteractive - nav.startTime) : 0,
    };
  });

  // Calculate resource sizes
  let totalBytes = 0;
  let jsBytes = 0;
  let cssBytes = 0;
  let imgBytes = 0;
  const breakdown: Record<string, { count: number; bytes: number }> = {};

  for (const req of requests) {
    totalBytes += req.size;
    const type = req.resourceType || 'other';
    if (!breakdown[type]) breakdown[type] = { count: 0, bytes: 0 };
    breakdown[type].count += 1;
    breakdown[type].bytes += req.size;

    if (type === 'script') jsBytes += req.size;
    else if (type === 'stylesheet') cssBytes += req.size;
    else if (type === 'image') imgBytes += req.size;
  }

  // Accessibility Audit via AxeBuilder
  console.log('Running Axe Accessibility Scan...');
  const axeResults = await new AxeBuilder({ page }).analyze();
  const violationsByImpact: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  };

  const violations = axeResults.violations.map(v => {
    const impact = v.impact || 'minor';
    violationsByImpact[impact] = (violationsByImpact[impact] || 0) + 1;
    return {
      id: v.id,
      impact,
      description: v.description,
      nodesCount: v.nodes.length
    };
  });

  // SEO & Metadata audit
  console.log('Auditing SEO Metadata...');
  const seo = await page.evaluate(() => {
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const h1Count = document.querySelectorAll('h1').length;
    return {
      title,
      description,
      canonical,
      ogTitle,
      ogImage,
      h1Count,
      hasRobotsTxt: false,
      sitemapUrlCount: 0
    };
  });

  // Check robots.txt and sitemap.xml on disk / public
  try {
    seo.hasRobotsTxt = fs.existsSync(path.join(process.cwd(), 'public', 'robots.txt'));
    const sitemapContent = fs.readFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), 'utf8');
    const matches = sitemapContent.match(/<url>/g);
    seo.sitemapUrlCount = matches ? matches.length : 0;
  } catch {}

  // Security headers check
  const securityWarnings: string[] = [];
  if (!headers['strict-transport-security']) securityWarnings.push('Missing Strict-Transport-Security header (Note: local preview server)');
  if (!headers['content-security-policy']) securityWarnings.push('Missing Content-Security-Policy header on preview server');
  if (!headers['x-frame-options']) securityWarnings.push('Missing X-Frame-Options header on preview server');
  if (!headers['x-content-type-options']) securityWarnings.push('Missing X-Content-Type-Options header on preview server');

  const baseline: BaselineReport = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:4173/',
    performance: {
      ...perfMetrics,
      totalRequests: requests.length,
      totalBytes,
      jsBytes,
      cssBytes,
      imgBytes,
      resourceBreakdown: breakdown
    },
    accessibility: {
      violationsCount: axeResults.violations.length,
      passesCount: axeResults.passes.length,
      incompleteCount: axeResults.incomplete.length,
      violationsByImpact,
      violations
    },
    seo,
    security: {
      headers,
      warnings: securityWarnings
    }
  };

  const outputPath = path.join(process.cwd(), 'scripts', 'baseline-audit-result.json');
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));
  console.log('Baseline Audit Complete! Saved to', outputPath);
  console.log(JSON.stringify(baseline, null, 2));

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
