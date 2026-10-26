import { test, expect } from '@playwright/test';

test.describe('Streamverse E2E User Journeys (TEST-07)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to origin and establish a clean state
    await page.goto('/');
  });

  test('1. Homepage: renders hero banner, navigation bar, and media rails', async ({ page }) => {
    await page.goto('/');

    // Navbar branding within desktop banner
    const banner = page.getByRole('banner');
    const brand = banner.getByRole('link', { name: /streamverse home/i });
    await expect(brand).toBeVisible();

    // Verify key navigation items in header banner
    await expect(banner.getByRole('link', { name: 'Movies' })).toBeVisible();
    await expect(banner.getByRole('link', { name: 'TV Shows' })).toBeVisible();
    await expect(banner.getByRole('link', { name: 'Live TV' })).toBeVisible();

    // Hero banner action button
    const heroPlay = page.getByRole('button', { name: 'Play' }).first();
    await expect(heroPlay).toBeVisible();
  });

  test('2. Search Journey: opens search modal, queries catalogue, and navigates to details', async ({ page }) => {
    await page.goto('/');

    // Open search modal via search button in navbar
    const searchTrigger = page.getByRole('button', { name: 'Search' }).first();
    await searchTrigger.click();

    // Search dialog and input should be visible and accessible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const searchInput = dialog.getByRole('textbox');
    await expect(searchInput).toBeVisible();

    // Query Digger (curated media item)
    await searchInput.fill('Digger');

    // Wait for search result item to appear in modal
    const resultItem = dialog.locator('[data-idx]').first();
    await expect(resultItem).toBeVisible({ timeout: 10000 });

    // Select the search result
    await resultItem.click();

    // Verify URL transitions to movie details and displays media
    await expect(page).toHaveURL(/\/movie\/(1248832|\d+)/);
    await expect(page.locator('h1, img[alt="Digger"]').first()).toBeAttached();
  });

  test('3. Details Page: renders media metadata, backdrop, and action triggers', async ({ page }) => {
    // Navigate directly to curated movie details page
    await page.goto('/movie/1248832');

    // Heading or title logo is present
    await expect(page.locator('h1, img[alt="Digger"]').first()).toBeAttached();

    // Primary action buttons (Play and Watchlist) - select visible button across breakpoints
    const playBtn = page.locator('button:has-text("Play")').filter({ visible: true }).first();
    await expect(playBtn).toBeVisible();

    const watchlistBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"], button:has-text("Watchlist")').filter({ visible: true }).first();
    await expect(watchlistBtn).toBeVisible();
  });

  test('4. Watchlist Persistence: adds item, persists in localStorage, and reflects in Watchlist view', async ({ page }) => {
    await page.goto('/movie/1248832');

    // Find and click the visible Watchlist toggle button
    const watchlistBtn = page.locator('button[title*="watchlist"], button[aria-label*="watchlist"], button:has-text("Watchlist")').filter({ visible: true }).first();
    await expect(watchlistBtn).toBeVisible();
    await watchlistBtn.click();

    // Verify localStorage has persisted the watchlist item
    const storedList = await page.evaluate(() => {
      return localStorage.getItem('streamverse_watchlist');
    });
    expect(storedList).toBeTruthy();
    expect(storedList).toContain('1248832');

    // Navigate to Watchlist page
    await page.goto('/watchlist');

    // Item should be listed in the watchlist view
    const watchlistCard = page.locator('h3, div').getByText(/Digger/i).first();
    await expect(watchlistCard).toBeVisible();
  });

  test('5. Playback Flow: launches video player and mounts playback interface', async ({ page }) => {
    await page.goto('/movie/1248832');

    // Click visible Play Now button
    const playBtn = page.locator('button:has-text("Play")').filter({ visible: true }).first();
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // Should navigate to watch route
    await expect(page).toHaveURL(/\/watch\/movie\/1248832/);

    // Player container or stream resolution modal should mount
    const playerRegion = page.locator('[aria-label*="Video Player"], div:has-text("Resolving Cloud Stream")').first();
    await expect(playerRegion).toBeVisible();
  });
});
