import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  { name: 'Home', path: '/' },
  { name: 'Movie Details', path: '/movie/1248832' },
  { name: 'Anime Page', path: '/anime' },
  { name: 'Live Sports', path: '/sports' },
  { name: 'Settings', path: '/settings' },
  { name: 'Watchlist', path: '/watchlist' }
];

async function testAllRoutesAccessibility() {
  console.log('Starting Multi-Route WCAG Accessibility Validation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  let totalViolations = 0;

  for (const r of routes) {
    console.log(`\nAuditing route: ${r.name} (http://localhost:4173${r.path}) ...`);
    await page.goto(`http://localhost:4173${r.path}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    console.log(`  Violations count: ${results.violations.length} (${criticalOrSerious.length} critical/serious)`);
    if (results.violations.length > 0) {
      for (const v of results.violations) {
        console.log(`    - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
        totalViolations += v.nodes.length;
      }
    } else {
      console.log('  [PASS] Zero accessibility violations detected!');
    }
  }

  await browser.close();

  console.log('\n======================================================');
  if (totalViolations === 0) {
    console.log('  All routes PASSED 100% WCAG accessibility audits!   ');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.log(`  Detected ${totalViolations} total violations across routes.`);
    console.log('======================================================\n');
    process.exit(1);
  }
}

testAllRoutesAccessibility().catch((err) => {
  console.error('Accessibility test runner failed:', err);
  process.exit(1);
});
