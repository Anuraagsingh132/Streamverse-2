import React from 'react';

export const PlatformsMarquee: React.FC = () => {
  const platforms = [
    { name: 'Netflix', imageUrl: 'https://img.icons8.com/ios/250/netflix--v1.png' },
    { name: 'Disney+', imageUrl: 'https://img.icons8.com/nolan/256/disney-plus.png' },
    { name: 'Prime Video', imageUrl: 'https://img.icons8.com/color/240/amazon-prime.png' },
    { name: 'HBO', imageUrl: 'https://img.icons8.com/ios-filled/250/hbo.png' },
    { name: 'Apple TV+', imageUrl: 'https://img.icons8.com/ios-filled/250/apple-tv.png' },
    { name: 'Hulu', imageUrl: 'https://img.icons8.com/ios-filled/250/hulu.png' },
    { name: 'HBO Max', imageUrl: 'https://img.icons8.com/ios-filled/250/hbo-max.png' },
    { name: 'Paramount+', imageUrl: 'https://www.paramountplus.com/assets/images/intl-landing-page/pplus_marketing_site_logo_white.png' },
    { name: 'YouTube', imageUrl: 'https://img.icons8.com/ios-filled/250/youtube.png' },
    { name: 'Vudu', imageUrl: 'https://img.icons8.com/ios-filled/250/vudu.png' },
    { name: 'Tubi', imageUrl: 'https://img.icons8.com/color/240/tubi.png' },
    { name: 'NBC', imageUrl: 'https://img.icons8.com/ios-filled/250/NBC.png' },
  ];

  return (
    <section id="bottom-providers" className="relative overflow-hidden py-16">
      {/* Warm Red/Burgundy Ambient Radial Glow */}
      <div 
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(185, 45, 25, 0.45) 0%, rgba(120, 20, 20, 0.20) 45%, transparent 75%)'
        }}
      />

      <div className="mx-auto px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-black dark:text-white md:text-4xl">
          All Your Favorite Platforms In One Place
        </h2>

        <div className="relative flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
          <div 
            className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row max-w-screen mt-10 [--duration:40s]"
            style={{ '--duration': '40s', '--gap': '1rem' } as React.CSSProperties}
          >
            {[0, 1, 2, 3].map((rep) => (
              <div
                key={rep}
                className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused] [animation-direction:reverse]"
                style={{ animationDirection: 'reverse' }}
              >
                {platforms.map((a, i) => (
                  <div
                    key={`${rep}-${i}`}
                    className="group flex h-20 w-32 items-center justify-center rounded-xl border border-black/10 bg-white/10 backdrop-blur-sm transition duration-300 hover:border-black/30 hover:bg-white/20 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/30 dark:hover:bg-black/30 md:h-24 md:w-40"
                  >
                    <div className="relative flex h-16 w-20 items-center justify-center p-2">
                      <img
                        src={a.imageUrl}
                        alt={a.name}
                        className="h-full w-full object-contain opacity-90 transition-opacity group-hover:opacity-100 brightness-0 invert"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformsMarquee;
