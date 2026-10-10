import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAudioCodec, parseAudioLanguages, parseStreamBitrate } from '../src/services/hdhub';
import { parsePenguAudio } from '../src/services/pengu';
import { getLanguageName, convertSrtToVtt, sanitizeVtt } from '../src/services/subtitles';
import { getTmdbImageUrl, formatTmdbItem } from '../src/services/tmdb';
import { mergeValidMediaWithFallback } from '../src/utils/mediaFilters';
import { optimizeTmdbImage, FALLBACK_BACKDROP } from '../src/utils/imageUtils';
import { extractPixelDrainId, formatPixelDrainUrl, resolvePixelDrainStreamUrl } from '../src/utils/pixeldrain';
import { LRUCache, deduplicateInFlight } from '../src/utils/lruCache';
import { MediaItem } from '../src/types/media';
import { normalizeAnimeTitle } from '../src/services/animeResolver';
import { computeScrubPosition } from '../src/components/player/useScrubberDrag';
import { clampSubtitleOffset, validateSubtitleSize } from '../src/hooks/useUserSettings';

test('HDHub: parseAudioCodec correctly categorizes web compatibility', () => {
  // AAC / Web audio
  const aacTest = parseAudioCodec('Movie.2024.1080p.AAC.mp4', false);
  assert.strictEqual(aacTest.audioCodec, 'AAC');
  assert.strictEqual(aacTest.isWebAudio, true);

  // HLS stream
  const hlsTest = parseAudioCodec('stream.m3u8', true);
  assert.strictEqual(hlsTest.audioCodec, 'AAC');
  assert.strictEqual(hlsTest.isWebAudio, true);

  // DDP 5.1 / E-AC3 (non-native on many browsers in MKV)
  const ddpTest = parseAudioCodec('Series.S01E01.1080p.DDP5.1.Atmos.mkv', false);
  // Atmos is checked first, returning TrueHD
  assert.strictEqual(ddpTest.audioCodec, 'TrueHD');
  assert.strictEqual(ddpTest.isWebAudio, false);

  const eac3Test = parseAudioCodec('Movie.1080p.EAC3.mkv', false);
  assert.strictEqual(eac3Test.audioCodec, 'DDP 5.1');
  assert.strictEqual(eac3Test.isWebAudio, false);

  // DTS
  const dtsTest = parseAudioCodec('Movie.1080p.DTS-HD.MA.mkv', false);
  assert.strictEqual(dtsTest.audioCodec, 'DTS');
  assert.strictEqual(dtsTest.isWebAudio, false);

  // AC3
  const ac3Test = parseAudioCodec('Movie.720p.AC3.mkv', false);
  assert.strictEqual(ac3Test.audioCodec, 'AC3');
  assert.strictEqual(ac3Test.isWebAudio, false);
});

test('HDHub: parseAudioLanguages extracts language tags', () => {
  const result = parseAudioLanguages('Movie.2024.Hindi-Eng.Dual-Audio.1080p');
  assert.ok(result.languages.includes('Hindi'));
  assert.ok(result.languages.includes('English'));
  assert.ok(result.languages.includes('Dual Audio'));
  assert.ok(result.label.includes('Hindi'));

  const emptyResult = parseAudioLanguages('Unknown.Release.1080p');
  assert.deepStrictEqual(emptyResult.languages, ['Original']);
  assert.strictEqual(emptyResult.label, 'Original');
});

test('HDHub: parseStreamBitrate calculates and formats bitrate with headroom', () => {
  // Explicit bitrate
  const res1 = parseStreamBitrate('Video 1080p ~6.5 Mbps');
  assert.strictEqual(res1.bitrate, '~6.5 Mbps');
  assert.strictEqual(res1.bitrateMbps, 6.5);
  assert.strictEqual(res1.requiredSpeed, '≥ 15 Mbps');

  // kbps parsing
  const res2 = parseStreamBitrate('Video 720p ~4500 kbps');
  assert.strictEqual(res2.bitrate, '~4.5 Mbps');
  assert.strictEqual(res2.bitrateMbps, 4.5);

  // Fallback by resolution when no size or explicit speed
  const res3 = parseStreamBitrate('Movie.2160p.HDR');
  assert.strictEqual(res3.bitrateMbps, 15);
  assert.strictEqual(res3.requiredSpeed, '≥ 25 Mbps');
});

test('Pengu: parsePenguAudio extracts explicit Audio line metadata', () => {
  const text = '🐧 Pengu Direct\nAudio: Hindi, Tamil, English\n1080p H.264';
  const result = parsePenguAudio(text);
  assert.ok(result.languages.includes('Hindi'));
  assert.ok(result.languages.includes('Tamil'));
  assert.ok(result.languages.includes('English'));
  assert.strictEqual(result.label, 'Hindi · Tamil · English');
});

test('Subtitles: getLanguageName maps ISO codes to human-readable names', () => {
  assert.strictEqual(getLanguageName('eng'), 'English');
  assert.strictEqual(getLanguageName('en'), 'English');
  assert.strictEqual(getLanguageName('hin'), 'Hindi');
  assert.strictEqual(getLanguageName('es'), 'Spanish');
  assert.strictEqual(getLanguageName('ja'), 'Japanese');
  assert.strictEqual(getLanguageName('unknown-code'), 'UNKNOWN-CODE');
  assert.strictEqual(getLanguageName(undefined), 'English');
});

test('Subtitles: convertSrtToVtt converts SRT timestamps and adds WEBVTT header', () => {
  const srtInput = `\uFEFF1\r\n00:00:01,500 --> 00:00:04,200\r\n{\\an8}Hello <script>alert(1)</script>World!\r\n\r\n2\r\n0:00:05,100 --> 0:00:08,000\r\nSecond <b>line</b>.`;
  const vttOutput = convertSrtToVtt(srtInput);

  assert.ok(vttOutput.startsWith('WEBVTT\n\n'));
  assert.ok(!vttOutput.includes('\uFEFF'));
  assert.ok(!vttOutput.includes('{\\an8}'));
  assert.ok(!vttOutput.includes('<script>'));
  assert.ok(vttOutput.includes('<b>line</b>'));
  assert.ok(vttOutput.includes('00:00:01.500 --> 00:00:04.200'));
  assert.ok(vttOutput.includes('00:00:05.100 --> 00:00:08.000'));
  assert.ok(!vttOutput.includes('\r'));
});

test('Subtitles: sanitizeVtt strips dangerous tags, attributes and javascript handlers', () => {
  const dirtyVtt = `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello <img src="x" onerror="alert(1)"><i>World</i> <a href="javascript:alert(2)">Click</a>`;
  const sanitized = sanitizeVtt(dirtyVtt);
  assert.ok(sanitized.startsWith('WEBVTT\n\n'));
  assert.ok(!sanitized.includes('<img'));
  assert.ok(!sanitized.includes('onerror'));
  assert.ok(!sanitized.includes('<a'));
  assert.ok(!sanitized.includes('javascript:'));
  assert.ok(sanitized.includes('<i>World</i>'));
});

test('TMDB: getTmdbImageUrl generates correct image dimensions and fallbacks', () => {
  const relative = getTmdbImageUrl('/sample-path.jpg', 'w780');
  assert.strictEqual(relative, 'https://image.tmdb.org/t/p/w780/sample-path.jpg');

  const absolute = getTmdbImageUrl('https://external.com/poster.png');
  assert.strictEqual(absolute, 'https://external.com/poster.png');

  const empty = getTmdbImageUrl(null);
  assert.ok(empty.includes('unsplash.com'));
});

test('TMDB: formatTmdbItem formats movie and TV media items correctly', () => {
  const rawMovie = {
    id: 999,
    title: 'Test Movie',
    overview: 'A test overview',
    release_date: '2024-05-15',
    runtime: 125,
    vote_average: 8.35,
    vote_count: 1200,
    genre_ids: [28, 12] // Action, Adventure
  };

  const item = formatTmdbItem(rawMovie, 'movie');
  assert.strictEqual(item.id, '999');
  assert.strictEqual(item.title, 'Test Movie');
  assert.strictEqual(item.year, 2024);
  assert.strictEqual(item.duration, '2h 5m');
  assert.strictEqual(item.vote_average, Number((rawMovie.vote_average).toFixed(1)));
  assert.deepStrictEqual(item.genres, ['Action', 'Adventure']);
  assert.strictEqual(item.media_type, 'movie');
});

test('MediaFilters: mergeValidMediaWithFallback filters and preserves leading curated items', () => {
  const curatedFallback: MediaItem[] = [
    { id: 'c1', title: 'Curated 1', overview: '', backdrop_path: '/c1.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
    { id: 'c2', title: 'Curated 2', overview: '', backdrop_path: '/c2.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
    { id: 'c3', title: 'Curated 3', overview: '', backdrop_path: '/c3.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
    { id: 'c4', title: 'Curated 4', overview: '', backdrop_path: '/c4.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
  ];

  const incomingLive: MediaItem[] = [
    { id: 'c2', title: 'Duplicate Curated', overview: '', backdrop_path: '/dup.jpg', poster_path: '', vote_average: 9, media_type: 'movie' },
    { id: 'l1', title: 'Live 1', overview: '', backdrop_path: '/live1.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
    { id: 'l2_invalid', title: 'Invalid Live', overview: '', backdrop_path: '', poster_path: '', vote_average: 7, media_type: 'movie' },
    { id: 'l3', title: 'Live 3', overview: '', backdrop_path: '/live3.jpg', poster_path: '', vote_average: 8, media_type: 'movie' },
  ];

  const merged = mergeValidMediaWithFallback(incomingLive, curatedFallback, 10);

  // Must preserve c1, c2, c3, c4 first
  assert.strictEqual(merged[0].id, 'c1');
  assert.strictEqual(merged[1].id, 'c2');
  assert.strictEqual(merged[2].id, 'c3');
  assert.strictEqual(merged[3].id, 'c4');

  // Must deduplicate c2 and exclude l2_invalid (no backdrop)
  const ids = merged.map(m => m.id);
  assert.ok(ids.includes('l1'));
  assert.ok(ids.includes('l3'));
  assert.ok(!ids.includes('l2_invalid'));
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('ImageUtils: optimizeTmdbImage adjusts dimensions according to aspect ratio', () => {
  const posterUrl = 'https://image.tmdb.org/t/p/original/test.jpg';
  assert.strictEqual(optimizeTmdbImage(posterUrl, 'poster'), 'https://image.tmdb.org/t/p/w500/test.jpg');
  assert.strictEqual(optimizeTmdbImage(posterUrl, 'backdrop'), 'https://image.tmdb.org/t/p/w780/test.jpg');
  assert.strictEqual(optimizeTmdbImage(posterUrl, 'card'), 'https://image.tmdb.org/t/p/w500/test.jpg');

  // Fallback on null/undefined
  assert.strictEqual(optimizeTmdbImage(null), FALLBACK_BACKDROP);
  assert.strictEqual(optimizeTmdbImage(''), FALLBACK_BACKDROP);

  // Non-TMDB URL preserved
  const external = 'https://custom-host.com/image.png';
  assert.strictEqual(optimizeTmdbImage(external), external);
});

test('PixelDrain: extractPixelDrainId extracts ID across formats and query params', () => {
  // pixeldrain.com/u/:id
  assert.strictEqual(extractPixelDrainId('https://pixeldrain.com/u/Deo52qC7'), 'Deo52qC7');
  // pixeldrain.dev/u/:id
  assert.strictEqual(extractPixelDrainId('https://pixeldrain.dev/u/Deo52qC7'), 'Deo52qC7');
  // pixeldrain.com/api/file/:id
  assert.strictEqual(extractPixelDrainId('https://pixeldrain.com/api/file/Deo52qC7'), 'Deo52qC7');
  // pixeldrain.dev/api/file/:id?download
  assert.strictEqual(extractPixelDrainId('https://pixeldrain.dev/api/file/Deo52qC7?download'), 'Deo52qC7');
  // direct CDN (including cdn01-99 and /api/file/ subpaths)
  assert.strictEqual(extractPixelDrainId('https://cdn.pixeldrain.eu.cc/Deo52qC7'), 'Deo52qC7');
  assert.strictEqual(extractPixelDrainId('https://cdn.pixeldrain.eu.cc/Deo52qC7?download'), 'Deo52qC7');
  assert.strictEqual(extractPixelDrainId('https://cdn09.pixeldrain.eu.cc/api/file/ri8eMpEj'), 'ri8eMpEj');
  assert.strictEqual(extractPixelDrainId('https://cdn12.pixeldrain.eu.cc/ri8eMpEj'), 'ri8eMpEj');
  // local edge proxy & cdn proxy
  assert.strictEqual(extractPixelDrainId('/api/pixeldrain/Deo52qC7'), 'Deo52qC7');
  assert.strictEqual(extractPixelDrainId('/api/pixeldrain-cdn/Deo52qC7'), 'Deo52qC7');
  assert.strictEqual(extractPixelDrainId('/api/pixeldrain-cdn/ri8eMpEj'), 'ri8eMpEj');
  // fallback via context text
  assert.strictEqual(extractPixelDrainId('https://cdn-mirror.net/Deo52qC7', 'PixelDrain 1080p Stream'), 'Deo52qC7');
  // non-pixeldrain url
  assert.strictEqual(extractPixelDrainId('https://r2.cloudflarestorage.com/video.mp4'), null);
});

test('PixelDrain: formatPixelDrainUrl correctly switches between normal proxy and fast CDN', () => {
  assert.strictEqual(formatPixelDrainUrl('Deo52qC7', 'normal'), '/api/pixeldrain/Deo52qC7');
  assert.strictEqual(formatPixelDrainUrl('Deo52qC7', 'cdn'), '/api/pixeldrain-cdn/Deo52qC7');
});

test('PixelDrain: resolvePixelDrainStreamUrl translates stream URLs based on chosen route', () => {
  const original = 'https://pixeldrain.com/u/Deo52qC7';
  assert.strictEqual(resolvePixelDrainStreamUrl(original, undefined, 'normal'), '/api/pixeldrain/Deo52qC7');
  assert.strictEqual(resolvePixelDrainStreamUrl(original, undefined, 'cdn'), '/api/pixeldrain-cdn/Deo52qC7');

  // Can re-route an existing local proxy URL to CDN
  const proxied = '/api/pixeldrain/Deo52qC7';
  assert.strictEqual(resolvePixelDrainStreamUrl(proxied, undefined, 'cdn'), '/api/pixeldrain-cdn/Deo52qC7');

  // Can re-route raw CDN URL back to normal proxy
  const rawCdn = 'https://cdn.pixeldrain.eu.cc/Deo52qC7';
  assert.strictEqual(resolvePixelDrainStreamUrl(rawCdn, undefined, 'normal'), '/api/pixeldrain/Deo52qC7');

  // Non-PixelDrain stream URLs remain untouched
  const r2Url = 'https://pub-r2.cloudflarestorage.com/series/video.m3u8';
  assert.strictEqual(resolvePixelDrainStreamUrl(r2Url, undefined, 'cdn'), r2Url);
});

test('LRUCache: enforces capacity and evicts least-recently-used item', () => {
  const cache = new LRUCache<string, number>(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.strictEqual(cache.size, 3);
  assert.strictEqual(cache.get('a'), 1); // Access 'a' making it MRU: order is now b, c, a

  cache.set('d', 4); // Evicts oldest ('b')
  assert.strictEqual(cache.size, 3);
  assert.strictEqual(cache.get('b'), undefined);
  assert.strictEqual(cache.get('c'), 3);
  assert.strictEqual(cache.get('a'), 1);
  assert.strictEqual(cache.get('d'), 4);
});

test('deduplicateInFlight: collapses multiple simultaneous calls into a single invocation', async () => {
  const inFlight = new Map<string, Promise<string>>();
  let executionCount = 0;

  const asyncFetcher = async () => {
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return 'data-result';
  };

  const [p1, p2, p3] = await Promise.all([
    deduplicateInFlight('key1', asyncFetcher, inFlight),
    deduplicateInFlight('key1', asyncFetcher, inFlight),
    deduplicateInFlight('key1', asyncFetcher, inFlight)
  ]);

  assert.strictEqual(p1, 'data-result');
  assert.strictEqual(p2, 'data-result');
  assert.strictEqual(p3, 'data-result');
  assert.strictEqual(executionCount, 1);
  assert.strictEqual(inFlight.size, 0); // Cleanup after resolve
});

test('AnimeResolver: normalizeAnimeTitle strips season patterns and extracts season number', () => {
  // Case 1: Standard "Season 2"
  const res1 = normalizeAnimeTitle('Jujutsu Kaisen Season 2');
  assert.strictEqual(res1.cleanTitle, 'Jujutsu Kaisen');
  assert.strictEqual(res1.season, 2);

  // Case 2: "2nd Season"
  const res2 = normalizeAnimeTitle('Re:ZERO - Starting Life in Another World - 2nd Season');
  assert.strictEqual(res2.cleanTitle, 'Re:ZERO - Starting Life in Another World');
  assert.strictEqual(res2.season, 2);

  // Case 3: "Part 2"
  const res3 = normalizeAnimeTitle('Attack on Titan Final Season Part 2');
  assert.strictEqual(res3.cleanTitle, 'Attack on Titan');
  assert.strictEqual(res3.season, 2);

  // Case 4: Base title without season
  const res4 = normalizeAnimeTitle('Frieren: Beyond Journey\'s End');
  assert.strictEqual(res4.cleanTitle, 'Frieren: Beyond Journey\'s End');
  assert.strictEqual(res4.season, 1);

  // Case 5: Empty title edge case
  const res5 = normalizeAnimeTitle('');
  assert.strictEqual(res5.cleanTitle, '');
  assert.strictEqual(res5.season, 1);
});

test('Scrubber: clamp calculation boundaries prevent NaN or negative seek', () => {
  // Middle position
  const mid = computeScrubPosition(50, { left: 0, width: 100 }, 120);
  assert.strictEqual(mid.percent, 50);
  assert.strictEqual(mid.time, 60);

  // Left boundary overflow (negative clientX)
  const left = computeScrubPosition(-20, { left: 0, width: 100 }, 120);
  assert.strictEqual(left.percent, 0);
  assert.strictEqual(left.time, 0);

  // Right boundary overflow (clientX > width)
  const right = computeScrubPosition(150, { left: 0, width: 100 }, 120);
  assert.strictEqual(right.percent, 100);
  assert.strictEqual(right.time, 120);

  // 0 duration edge case doesn't crash or return NaN
  const zeroDur = computeScrubPosition(50, { left: 0, width: 100 }, 0);
  assert.ok(Number.isFinite(zeroDur.time));
});

test('UserSettings: subtitleOffset and subtitleSize bounds validation', () => {
  assert.strictEqual(clampSubtitleOffset(2.5), 2.5);
  assert.strictEqual(clampSubtitleOffset(-3.0), -3.0);
  assert.strictEqual(clampSubtitleOffset(12.0), 5.0); // clamped to max
  assert.strictEqual(clampSubtitleOffset(-10.0), -5.0); // clamped to min
  assert.strictEqual(clampSubtitleOffset(NaN), 0.0); // NaN falls back to 0
  assert.strictEqual(clampSubtitleOffset('2.5'), 2.5); // string parsing

  assert.strictEqual(validateSubtitleSize('small'), 'small');
  assert.strictEqual(validateSubtitleSize('large'), 'large');
  assert.strictEqual(validateSubtitleSize('invalid'), 'medium');
  assert.strictEqual(validateSubtitleSize(null), 'medium');
});

test('StorageManager: sweepStorage purges expired keys and enforces LRU limit', async () => {
  const { sweepStorage, safeSetStorageItem } = await import('../src/utils/storageManager');
  
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    key: (i: number) => Array.from(store.keys())[i] || null,
    get length() { return store.size; }
  };

  (globalThis as any).window = { localStorage: mockLocalStorage };

  // Set 5 items with prefix 'test_'
  // Items 0 and 1 are older than 15 mins (expired)
  const now = Date.now();
  store.set('test_1', JSON.stringify({ timestamp: now - 20 * 60 * 1000, data: 'expired1' }));
  store.set('test_2', JSON.stringify({ timestamp: now - 16 * 60 * 1000, data: 'expired2' }));
  store.set('test_3', JSON.stringify({ timestamp: now - 5 * 60 * 1000, data: 'fresh1' }));
  store.set('test_4', JSON.stringify({ timestamp: now - 2 * 60 * 1000, data: 'fresh2' }));
  store.set('test_5', JSON.stringify({ timestamp: now, data: 'fresh3' }));

  // Sweep with maxItems 5 and ttl 15 min -> should delete test_1 and test_2
  sweepStorage('test_', 5, 15 * 60 * 1000);
  assert.strictEqual(store.has('test_1'), false);
  assert.strictEqual(store.has('test_2'), false);
  assert.strictEqual(store.has('test_3'), true);
  assert.strictEqual(store.has('test_4'), true);
  assert.strictEqual(store.has('test_5'), true);

  // Now test quota capping: cap at 2 items -> test_3 (oldest) should be evicted
  sweepStorage('test_', 2, 60 * 60 * 1000);
  assert.strictEqual(store.has('test_3'), false);
  assert.strictEqual(store.has('test_4'), false); // evicted to leave room for 1 item (size < 2)
  assert.strictEqual(store.has('test_5'), true);

  // Safe write
  safeSetStorageItem('test_6', JSON.stringify({ timestamp: Date.now(), data: 'new' }), { prefix: 'test_', maxItems: 3 });
  assert.strictEqual(store.has('test_6'), true);
});

test('PlaybackHistory: savePlaybackRecord consolidates progress and caps history', async () => {
  const { 
    savePlaybackRecord, 
    removePlaybackRecord, 
    getPlaybackRecord 
  } = await import('../src/store/useContinueWatchingStore');

  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      key: (i: number) => Array.from(store.keys())[i] || null,
      get length() { return store.size; }
    },
    dispatchEvent: () => true
  };

  // 1. Save movie progress
  savePlaybackRecord(
    { id: '123', title: 'Test Movie', media_type: 'movie' },
    { currentTime: 120, duration: 3600 }
  );

  const movieRecord = getPlaybackRecord('123');
  assert.ok(movieRecord);
  assert.strictEqual(movieRecord?.title, 'Test Movie');
  assert.strictEqual(movieRecord?.currentTime, 120);
  assert.strictEqual(movieRecord?.progressPercent, 3); // 120 / 3600 * 100

  // 2. Save series episode progress
  savePlaybackRecord(
    { id: '456', title: 'Test Series', media_type: 'tv' },
    { season: 1, episode: 3, currentTime: 500, duration: 1500 }
  );

  const epRecord = getPlaybackRecord('456', 1, 3);
  assert.ok(epRecord);
  assert.strictEqual(epRecord?.season, 1);
  assert.strictEqual(epRecord?.episode, 3);
  assert.strictEqual(epRecord?.progressPercent, 33);

  // 3. Completing video removes from continue watching
  savePlaybackRecord(
    { id: '123', title: 'Test Movie', media_type: 'movie' },
    { currentTime: 3590, duration: 3600 } // within last 15s
  );
  assert.strictEqual(getPlaybackRecord('123'), undefined);

  // 4. Remove explicitly
  removePlaybackRecord('456', 1, 3);
  assert.strictEqual(getPlaybackRecord('456', 1, 3), undefined);
});

test('RouteUtils: getRouteHref maps internal route tokens to canonical SEO paths', async () => {
  const { getRouteHref } = await import('../src/utils/routeUtils');

  assert.strictEqual(getRouteHref('home'), '/');
  assert.strictEqual(getRouteHref('movie'), '/movies');
  assert.strictEqual(getRouteHref('movies'), '/movies');
  assert.strictEqual(getRouteHref('tv'), '/tv');
  assert.strictEqual(getRouteHref('anime'), '/anime');
  assert.strictEqual(getRouteHref('livesports'), '/sports');
  assert.strictEqual(getRouteHref('sports'), '/sports');
  assert.strictEqual(getRouteHref('discover'), '/ai');
  assert.strictEqual(getRouteHref('ai'), '/ai');
  assert.strictEqual(getRouteHref('music'), '/music');
  assert.strictEqual(getRouteHref('providers'), '/providers');
  assert.strictEqual(getRouteHref('watchlist'), '/watchlist');
  assert.strictEqual(getRouteHref('settings'), '/settings');
  assert.strictEqual(getRouteHref('custom/path'), '/custom/path');
});

test('CacheManager: purgeMediaItemCache clears disk & memory cache while protecting user preferences', async () => {
  const { purgeMediaItemCache } = await import('../src/utils/cacheManager');
  const { clearMediaDiskCache } = await import('../src/utils/storageManager');

  if (typeof window !== 'undefined' && window.localStorage) {
    // Seed media and user preference records in localStorage
    window.localStorage.setItem('tmdb_https://api.themoviedb.org/3/movie/789?api_key=xyz', JSON.stringify({ data: { title: 'Movie 789' } }));
    window.localStorage.setItem('tmdb_https://api.themoviedb.org/3/movie/789/credits?api_key=xyz', JSON.stringify({ data: { cast: [] } }));
    window.localStorage.setItem('anilist_details_555', JSON.stringify({ title: 'Anime 555' }));
    window.localStorage.setItem('anime_logo_555', JSON.stringify('https://artworks.com/logo555.png'));
    window.localStorage.setItem('streamverse_watchlist', JSON.stringify(['789', '555']));
    window.localStorage.setItem('streamverse_settings', JSON.stringify({ defaultServer: 'hdhub' }));
    window.localStorage.setItem('streamverse_theme', 'dark');

    // 1. Purge Movie 789
    purgeMediaItemCache({ id: '789', media_type: 'movie' });

    assert.strictEqual(window.localStorage.getItem('tmdb_https://api.themoviedb.org/3/movie/789?api_key=xyz'), null);
    assert.strictEqual(window.localStorage.getItem('tmdb_https://api.themoviedb.org/3/movie/789/credits?api_key=xyz'), null);
    assert.ok(window.localStorage.getItem('anilist_details_555') !== null, 'Anime 555 should not be cleared by 789 purge');
    assert.ok(window.localStorage.getItem('streamverse_watchlist') !== null, 'Watchlist must be preserved');
    assert.ok(window.localStorage.getItem('streamverse_settings') !== null, 'Settings must be preserved');
    assert.strictEqual(window.localStorage.getItem('streamverse_theme'), 'dark', 'Theme must be preserved');

    // 2. Purge Anime 555
    purgeMediaItemCache('555');

    assert.strictEqual(window.localStorage.getItem('anilist_details_555'), null);
    assert.strictEqual(window.localStorage.getItem('anime_logo_555'), null);
    assert.ok(window.localStorage.getItem('streamverse_watchlist') !== null, 'Watchlist must still be preserved');

    // 3. Direct clearMediaDiskCache safety test
    window.localStorage.setItem('tmdb_dummy', '123');
    clearMediaDiskCache();
    assert.strictEqual(window.localStorage.getItem('tmdb_dummy'), null);
    assert.ok(window.localStorage.getItem('streamverse_watchlist') !== null, 'Watchlist must survive global cache clear');
  }
});

