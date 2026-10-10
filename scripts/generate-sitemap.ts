import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allMedia } from '../src/data/mediaData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://streamverse.app';
const TODAY = new Date().toISOString().split('T')[0];

interface SitemapUrl {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
  lastmod: string;
}

const staticRoutes: SitemapUrl[] = [
  { loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0', lastmod: TODAY },
  { loc: `${BASE_URL}/movies`, changefreq: 'daily', priority: '0.9', lastmod: TODAY },
  { loc: `${BASE_URL}/tv`, changefreq: 'daily', priority: '0.9', lastmod: TODAY },
  { loc: `${BASE_URL}/anime`, changefreq: 'daily', priority: '0.9', lastmod: TODAY },
  { loc: `${BASE_URL}/providers`, changefreq: 'weekly', priority: '0.8', lastmod: TODAY },
  { loc: `${BASE_URL}/sports`, changefreq: 'daily', priority: '0.7', lastmod: TODAY },
  { loc: `${BASE_URL}/music`, changefreq: 'weekly', priority: '0.7', lastmod: TODAY },
  { loc: `${BASE_URL}/ai`, changefreq: 'monthly', priority: '0.7', lastmod: TODAY },
  { loc: `${BASE_URL}/watchlist`, changefreq: 'monthly', priority: '0.5', lastmod: TODAY },
];

const dynamicRoutes: SitemapUrl[] = allMedia.map((item) => {
  const segment = item.media_type === 'tv' ? 'tv' : item.media_type === 'anime' ? 'anime' : 'movie';
  return {
    loc: `${BASE_URL}/${segment}/${item.id}`,
    changefreq: 'weekly',
    priority: '0.8',
    lastmod: TODAY,
  };
});

// Deduplicate URLs
const seen = new Set<string>();
const allRoutes = [...staticRoutes, ...dynamicRoutes].filter((route) => {
  if (seen.has(route.loc)) return false;
  seen.add(route.loc);
  return true;
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, sitemapXml, 'utf-8');
console.log(`Successfully generated dynamic sitemap with ${allRoutes.length} URLs to ${outputPath}`);
