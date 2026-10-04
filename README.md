# 🎬 Streamverse 2

A next-generation cinema and streaming entertainment portal built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**. Experience seamless media discovery, anime catalogs, live sports, AI-powered search, smooth inertia scrolling with Lenis, and fluid Motion micro-interactions.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAnuraagsingh132%2FStreamverse-2)

---

## ✨ Features

- 🌟 **Hero Carousel & Dynamic Rails**: Real-time trending media, featured highlights, top-10 charts, and personalized content rows.
- 🍿 **Comprehensive Catalog**: Dedicated browsing for Movies, TV Shows, Anime, and Streaming Providers.
- ⚡ **CinemaOS Player Integration**: Built-in video player modal supporting multi-episode TV series and cinematic playback.
- 🤖 **AI-Assisted Smart Search**: Natural language media exploration and quick modal search (`Ctrl` + `K` / `⌘` + `K`).
- 🎌 **Anime Hub**: AniList integration with episodes, voice actors, character profiles, and curated anime slides.
- ⚽ **Live Sports & 🎵 Music Hub**: Live match center, event tracking, and curated soundtrack experiences.
- 💾 **Local Watchlist Persistence**: Save and manage your favorite movies and series directly in your browser.
- 🪶 **Ultra-Smooth UX**: Powered by **Lenis** inertia scrolling and **Motion** physics animations.
- 📱 **Fully Responsive**: Optimized for desktops, tablets, and mobile devices with bottom navigation bar.

---

## 🚀 One-Click Deployment to Vercel

You can deploy Streamverse 2 directly to Vercel with zero additional configuration:

1. Click the **Deploy with Vercel** button above or import this repository in [Vercel Dashboard](https://vercel.com/new).
2. Vercel automatically detects the **Vite** framework preset:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Click **Deploy**!

> **Note**: Single-page app routing and reverse proxies are already pre-configured in [`vercel.json`](./vercel.json).

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 8 + Oxlint
- **Styling**: Tailwind CSS + Modern CSS Variables
- **Animations**: Motion (`motion/react`)
- **Smooth Scroll**: Lenis Scroll
- **Icons**: Lucide React
- **APIs**: TMDB & AniList

---

## 💻 Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` / `pnpm` / `yarn`

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Anuraagsingh132/Streamverse-2.git
   cd Streamverse-2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 📁 Project Structure

```text
├── public/                 # Static branding assets, webfonts, and icons
├── src/
│   ├── assets/             # Graphic assets
│   ├── components/         # Reusable UI components (Player, Rails, Modals, Nav)
│   ├── data/               # Curated media data, anime lists & matches
│   ├── pages/              # Application views (Home, Movies, Anime, etc.)
│   ├── services/           # TMDB and AniList API integrations
│   ├── types/              # TypeScript interfaces and type definitions
│   ├── App.tsx             # Root routing and application state
│   └── main.tsx            # Entry point
├── index.html              # HTML template
├── vercel.json             # Vercel SPA rewrites & routing configuration
├── vite.config.ts          # Vite build and proxy settings
└── package.json            # Dependencies and scripts
```

---

## 📄 License

This project is licensed under the MIT License.
