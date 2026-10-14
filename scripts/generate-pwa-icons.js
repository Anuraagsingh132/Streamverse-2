import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Clapperboard SVG markup with brand styling (deep obsidian background, vibrant rose-violet gradient)
  const getSvg = (size, isMaskable = false) => {
    // For maskable icons, the safe zone is an inner circle with 80% diameter (10% padding on each side)
    const padding = isMaskable ? size * 0.18 : size * 0.12;
    const contentSize = size - padding * 2;
    const cornerRadius = isMaskable ? 0 : size * 0.22;

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0e1222" />
            <stop offset="50%" stop-color="#060812" />
            <stop offset="100%" stop-color="#04050a" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb7185" />
            <stop offset="50%" stop-color="#f43f5e" />
            <stop offset="100%" stop-color="#e11d48" />
          </linearGradient>
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(244, 63, 94, 0.4)" />
            <stop offset="100%" stop-color="rgba(168, 85, 247, 0.15)" />
          </linearGradient>
          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${size * 0.04}" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base Background -->
        <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bgGrad)" />

        <!-- Subtle Ambient Radial Glow -->
        <circle cx="${size * 0.5}" cy="${size * 0.45}" r="${size * 0.4}" fill="url(#glowGrad)" />

        <!-- Border for standard icon -->
        ${!isMaskable ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${cornerRadius}" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="${Math.max(1, size * 0.006)}" />` : ''}

        <!-- Clapperboard Graphic centered in safe zone -->
        <g transform="translate(${padding}, ${padding})">
          <svg width="${contentSize}" height="${contentSize}" viewBox="0 0 24 24" fill="none" stroke="url(#accentGrad)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#subtleGlow)">
            <!-- Lucide Clapperboard Path -->
            <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
            <path d="m6.2 5.3 3.1 3.9" />
            <path d="m12.4 3.4 3.1 4" />
            <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </svg>
        </g>
      </svg>
    `;
  };

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const iconConfigs = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false, dest: path.join(__dirname, '../public/apple-touch-icon.png') }
  ];

  for (const config of iconConfigs) {
    const svg = getSvg(config.size, config.maskable);
    await page.setViewportSize({ width: config.size, height: config.size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: transparent; overflow: hidden; display: flex; }
          </style>
        </head>
        <body>${svg}</body>
      </html>
    `);

    const outPath = config.dest || path.join(iconsDir, config.name);
    await page.screenshot({ path: outPath, omitBackground: !config.maskable });
    console.log(`Generated: ${path.basename(outPath)} (${config.size}x${config.size})`);
  }

  await browser.close();
  console.log('All PWA icons generated successfully.');
}

generateIcons().catch(console.error);
