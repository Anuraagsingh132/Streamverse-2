import { MediaItem, Provider, LiveSport, MusicTrack } from '../types/media';

export const featuredItems: MediaItem[] = [
  {
    id: '258165',
    title: 'East of Eden',
    overview: 'A sweeping saga exploring the complexities of family, love, ambition, and identity set in the Salinas Valley of California.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/jd9EWL7f9Mefmj4c3YGEPqVx4r7.png',
    vote_average: 8.3,
    media_type: 'tv',
    year: 2026,
    genres: ['Drama', 'Family', 'History'],
    seasons: 1,
    episodes: 8,
    provider: 'Netflix'
  },
  {
    id: '977942',
    title: 'The Uprising',
    overview: 'In the Joseon era, two friends who grew up together—one a master and one a servant—reunite after the war as adversaries on opposite sides.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/y0reRTsewsPh0ePtgvDeLIsb5Wk.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/7TUl15TOsIvndKlgMWTtLgtEzZP.jpg',
    vote_average: 8.0,
    media_type: 'movie',
    year: 2024,
    genres: ['Action', 'Drama', 'History'],
    duration: '2h 6m',
    provider: 'Netflix'
  },
  {
    id: '693134',
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    vote_average: 8.2,
    media_type: 'movie',
    year: 2024,
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    duration: '2h 46m',
    provider: 'Max'
  },
  {
    id: '533535',
    title: 'Deadpool & Wolverine',
    overview: 'A listless Wade Wilson toils in civilian life with his days as the morally flexible mercenary Deadpool behind him.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    vote_average: 7.7,
    media_type: 'movie',
    year: 2024,
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    duration: '2h 8m',
    provider: 'Disney+'
  },
  {
    id: '94605',
    title: 'Arcane',
    overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    vote_average: 9.0,
    media_type: 'anime',
    year: 2024,
    genres: ['Animation', 'Sci-Fi', 'Action'],
    seasons: 2,
    episodes: 18,
    provider: 'Netflix'
  }
];

export const allMovies: MediaItem[] = [
  featuredItems[1],
  featuredItems[2],
  featuredItems[3],
  {
    id: '1248832',
    title: 'Digger',
    overview: 'A grizzled underground excavator unearths an ancient cavern holding secrets best left buried.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/1ATXKrIPJyKNwnJ6lcG088Sa6zi.jpg',
    vote_average: 7.4,
    media_type: 'movie',
    year: 2024,
    genres: ['Thriller', 'Mystery'],
    duration: '1h 52m',
    provider: 'Apple TV+'
  },
  {
    id: '1283515',
    title: 'Verity',
    overview: 'A struggling writer accepts the job of a lifetime: finishing the remaining books of a successful series after the injured author cannot complete them.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/dGSsPovyUW5XVekXcy7F2GyhTEh.jpg',
    vote_average: 8.2,
    media_type: 'movie',
    year: 2025,
    genres: ['Thriller', 'Drama', 'Mystery'],
    duration: '2h 10m',
    provider: 'Amazon Prime'
  },
  {
    id: '1377237',
    title: 'Runner',
    overview: 'In a rain-soaked metropolis, a high-stakes courier takes on a rogue delivery that puts them in the crosshairs of ruthless syndicates.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/yBKMAIj7clP42UkFejhGDBBoTpb.jpg',
    vote_average: 8.1,
    media_type: 'movie',
    year: 2024,
    genres: ['Action', 'Crime'],
    duration: '1h 45m',
    provider: 'Netflix'
  },
  {
    id: '1423191',
    title: 'Resident Evil: Apocalypse Rising',
    overview: 'A new chapter in the viral outbreak unleashes terrifying bio-weapons across quarantined survival sectors.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/i7UyjfPio0VFHB9rBUZSFyhOoM8.jpg',
    vote_average: 7.6,
    media_type: 'movie',
    year: 2025,
    genres: ['Horror', 'Action', 'Sci-Fi'],
    duration: '1h 58m',
    provider: 'Max'
  },
  {
    id: '1204680',
    title: 'Coyote vs. Acme',
    overview: 'Wile E. Coyote seeks legal representation when an Acme product fails him one too many times in his pursuit of the Road Runner.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/kYDCl2y0VPvhT5eYWbMRInPoB03.jpg',
    vote_average: 7.6,
    media_type: 'movie',
    year: 2024,
    genres: ['Comedy', 'Animation', 'Family'],
    duration: '1h 38m',
    provider: 'Max'
  },
  {
    id: '1437195',
    title: 'Livestream from Hell',
    overview: 'An urban exploration streamer breaks into an abandoned psychiatric institute, broadcasting supernatural terror to millions of viewers.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/2bKGy1SoXZEUa69HRSy51rVM5KF.jpg',
    vote_average: 6.7,
    media_type: 'movie',
    year: 2024,
    genres: ['Horror', 'Mystery'],
    duration: '1h 32m',
    provider: 'Amazon Prime'
  },
  {
    id: '1492640',
    title: 'UNABOMBER',
    overview: 'The psychological cat-and-mouse game between FBI profilers and Theodore Kaczynski.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/39aMkR8Y5vhCG9dTkjiqRl8AVqp.jpg',
    vote_average: 7.9,
    media_type: 'movie',
    year: 2024,
    genres: ['Crime', 'Biography', 'Drama'],
    duration: '2h 15m',
    provider: 'Apple TV+'
  },
  {
    id: '1003596',
    title: 'Avengers: Doomsday',
    overview: 'Earth\'s mightiest heroes face an unprecedented multiversal cataclysm under the dominion of Victor Von Doom.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/jzPwsojjFStf5lR5Nm07w2hH56G.jpg',
    vote_average: 8.8,
    media_type: 'movie',
    year: 2026,
    genres: ['Action', 'Sci-Fi', 'Adventure'],
    duration: '2h 45m',
    provider: 'Disney+'
  },
  {
    id: '1368337',
    title: 'The Odyssey',
    overview: 'An epic retelling of Odysseus\' perilous decade-long journey home after the fall of Troy.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg',
    vote_average: 8.4,
    media_type: 'movie',
    year: 2025,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    duration: '2h 35m',
    provider: 'Apple TV+'
  }
];

export const allTVShows: MediaItem[] = [
  featuredItems[0],
  {
    id: '94664',
    title: 'MobLand',
    overview: 'In an isolated town torn apart by violence and addiction, a sheriff struggles to maintain peace as rival families clash.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/jd9EWL7f9Mefmj4c3YGEPqVx4r7.png',
    vote_average: 8.6,
    media_type: 'tv',
    year: 2024,
    genres: ['Crime', 'Drama'],
    seasons: 2,
    episodes: 16,
    provider: 'Max'
  },
  {
    id: '95350',
    title: 'Ted Lasso',
    overview: 'An American college football coach heads to the UK to manage a struggling London football team.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/7TUl15TOsIvndKlgMWTtLgtEzZP.jpg',
    vote_average: 8.4,
    media_type: 'tv',
    year: 2023,
    genres: ['Comedy', 'Drama', 'Sport'],
    seasons: 3,
    episodes: 34,
    provider: 'Apple TV+'
  },
  {
    id: '63333',
    title: 'The Last Kingdom',
    overview: 'As Alfred the Great defends his kingdom from Norse invaders, Uhtred—born a Saxon but raised by Vikings—seeks to claim his ancestral birthright.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/8eJf0hxgIhE6QSxbtuNCekTddy1.jpg',
    vote_average: 8.3,
    media_type: 'tv',
    year: 2022,
    genres: ['Action', 'Drama', 'War'],
    seasons: 5,
    episodes: 46,
    provider: 'Netflix'
  },
  {
    id: '69557',
    title: 'Fauda',
    overview: 'A top Israeli agent comes out of retirement to hunt for a Palestinian militant he thought he had killed, setting off a chaotic chain of events.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/bc6XIKP1TrnugYMzIIUz9YCL8VM.jpg',
    vote_average: 7.4,
    media_type: 'tv',
    year: 2023,
    genres: ['Action', 'Crime', 'Drama'],
    seasons: 4,
    episodes: 48,
    provider: 'Netflix'
  },
  {
    id: '95603',
    title: 'Kurulus Osman',
    overview: 'The epic saga of Osman Bey as he transforms a small nomadic Turkic tribe into a sovereign, world-spanning empire.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/y0reRTsewsPh0ePtgvDeLIsb5Wk.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/tu4BWsGFHcYDWulZwHxylA91vo0.jpg',
    vote_average: 8.0,
    media_type: 'tv',
    year: 2024,
    genres: ['Action', 'Drama', 'War'],
    seasons: 5,
    episodes: 160,
    provider: 'Amazon Prime'
  },
  {
    id: '119806',
    title: 'The Shadow Team',
    overview: 'An elite unit within Turkey\'s National Intelligence Organisation is recruited for high-risk covert black ops across international borders.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/d9deRu03wbPIokp4qveLzrlUTLW.jpg',
    vote_average: 7.2,
    media_type: 'tv',
    year: 2023,
    genres: ['Action', 'Drama', 'War'],
    seasons: 3,
    episodes: 79,
    provider: 'Amazon Prime'
  }
];

export const allAnime: MediaItem[] = [
  featuredItems[4],
  {
    id: '65930',
    title: 'Re:ZERO -Starting Life in Another World-',
    overview: 'Subaru Natsuki is suddenly summoned to another world. With no signs of who summoned him, things quickly turn dire as he discovers his power: Return by Death.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/jd9EWL7f9Mefmj4c3YGEPqVx4r7.png',
    vote_average: 8.4,
    media_type: 'anime',
    year: 2024,
    genres: ['Animation', 'Fantasy', 'Psychological'],
    seasons: 3,
    episodes: 50,
    provider: 'Crunchyroll'
  },
  {
    id: '127532',
    title: 'Solo Leveling',
    overview: 'In a world where hunters must battle deadly monsters to protect mankind, Sung Jinwoo, notoriously known as the weakest hunter of all, is chosen by an ominous System.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/7TUl15TOsIvndKlgMWTtLgtEzZP.jpg',
    vote_average: 8.7,
    media_type: 'anime',
    year: 2024,
    genres: ['Action', 'Fantasy', 'Supernatural'],
    seasons: 1,
    episodes: 12,
    provider: 'Crunchyroll'
  },
  {
    id: '85937',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    overview: 'A family is attacked by demons and only two members survive—Tanjiro and his sister Nezuko, who is turning into a demon herself.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    vote_average: 8.9,
    media_type: 'anime',
    year: 2024,
    genres: ['Action', 'Fantasy', 'Historical'],
    seasons: 4,
    episodes: 55,
    provider: 'Crunchyroll'
  },
  {
    id: '95479',
    title: 'Jujutsu Kaisen',
    overview: 'A boy swallows a cursed talisman—the finger of a demon—and becomes cursed himself. He enters a shaman\'s school to be able to locate the demon\'s other body parts and thus exorcise himself.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    vote_average: 8.8,
    media_type: 'anime',
    year: 2023,
    genres: ['Action', 'Supernatural', 'Dark Fantasy'],
    seasons: 2,
    episodes: 47,
    provider: 'Crunchyroll'
  },
  {
    id: '20111',
    title: 'Mobile Suit Gundam SEED',
    overview: 'Mankind has developed into two subspecies: Naturals and genetically enhanced Coordinators. Kira Yamato becomes involved in the brutal war between Earth Alliance and ZAFT.',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/y0reRTsewsPh0ePtgvDeLIsb5Wk.jpg',
    poster_path: 'https://image.tmdb.org/t/p/w500/rWgdDIq4JeaI36KdmLPkYcQjBQ3.jpg',
    vote_average: 7.6,
    media_type: 'anime',
    year: 2002,
    genres: ['Sci-Fi', 'Mecha', 'Action'],
    seasons: 1,
    episodes: 50,
    provider: 'Crunchyroll'
  }
];

export const allMedia = [...allMovies, ...allTVShows, ...allAnime];

export const topMovies: MediaItem[] = allMovies.slice(0, 10);
export const topShows: MediaItem[] = allTVShows.slice(0, 10);

export const popularProviders: Provider[] = [
  { id: 'netflix', name: 'Netflix', logo: 'https://images.ctfassets.net/4cd45et68cgf/7LrExJ6Kmfa8viAbWKuEZz/c4e21d405523da911283c6bc3e421bba/Netflix-new-icon.png', count: 1420, color: 'from-red-600/30' },
  { id: 'disney', name: 'Disney+', logo: 'https://cnbl-cdn.bamgrid.com/assets/7ecc8bcb60ad77193058d63e321bd21cbac2fc67281dbd9927676ea4a4c83594/original', count: 890, color: 'from-blue-600/30' },
  { id: 'apple', name: 'Apple TV+', logo: 'https://www.apple.com/v/apple-tv-plus/ah/images/meta/apple-tv__e7k6vsl7d26e_og.png', count: 420, color: 'from-zinc-500/30' },
  { id: 'prime', name: 'Prime Video', logo: 'https://m.media-amazon.com/images/G/01/digital/video/web/logo-min-remaster.png', count: 1100, color: 'from-sky-500/30' },
  { id: 'crunchyroll', name: 'Crunchyroll', logo: 'https://static.crunchyroll.com/cxweb/assets/img/favicons/favicon-32x32.png', count: 750, color: 'from-amber-500/30' },
  { id: 'max', name: 'Max', logo: 'https://www.max.com/favicon.ico', count: 960, color: 'from-indigo-600/30' }
];

export const liveSportsData: LiveSport[] = [
  {
    id: 'sport-1',
    title: 'Real Madrid vs Manchester City',
    tournament: 'UEFA Champions League · Quarter Final',
    homeTeam: 'Real Madrid',
    awayTeam: 'Manchester City',
    time: '78\' LIVE',
    isLive: true,
    category: 'Football',
    viewers: '2.4M'
  },
  {
    id: 'sport-2',
    title: 'Golden State Warriors vs LA Lakers',
    tournament: 'NBA Regular Season',
    homeTeam: 'Warriors',
    awayTeam: 'Lakers',
    time: 'Q3 04:12',
    isLive: true,
    category: 'Basketball',
    viewers: '890K'
  },
  {
    id: 'sport-3',
    title: 'Monaco Grand Prix - Race Day',
    tournament: 'Formula 1 World Championship',
    homeTeam: 'Max Verstappen',
    awayTeam: 'Lando Norris',
    time: 'Lap 42/78',
    isLive: true,
    category: 'Motorsport',
    viewers: '1.8M'
  },
  {
    id: 'sport-4',
    title: 'UFC 312: Pereira vs Ankalaev',
    tournament: 'UFC Light Heavyweight Championship',
    homeTeam: 'Alex Pereira',
    awayTeam: 'Magomed Ankalaev',
    time: 'Main Event - Round 2',
    isLive: true,
    category: 'Fighting',
    viewers: '1.1M'
  }
];

export const musicTracksData: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'What Could Have Been',
    artist: 'Sting, Ray Chen',
    sourceMedia: 'Arcane: League of Legends OST',
    duration: '3:33',
    cover: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg'
  },
  {
    id: 'track-2',
    title: 'A Time of Quiet Between the Storms',
    artist: 'Hans Zimmer',
    sourceMedia: 'Dune: Part Two (Original Motion Picture Soundtrack)',
    duration: '4:21',
    cover: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'
  },
  {
    id: 'track-3',
    title: 'Gurenge',
    artist: 'LiSA',
    sourceMedia: 'Demon Slayer: Kimetsu no Yaiba',
    duration: '3:58',
    cover: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'
  },
  {
    id: 'track-4',
    title: 'SpecialZ',
    artist: 'King Gnu',
    sourceMedia: 'Jujutsu Kaisen: Shibuya Incident',
    duration: '3:52',
    cover: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
  }
];
