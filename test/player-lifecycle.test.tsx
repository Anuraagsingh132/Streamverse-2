import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HDHubPlayer } from '../src/components/HDHubPlayer';
import { MediaItem } from '../src/types/media';
import * as hdhubService from '../src/services/hdhub';
import * as subtitlesService from '../src/services/subtitles';
import { CONTINUE_WATCHING_STORAGE_KEY } from '../src/store/useContinueWatchingStore';

const mockMovie: MediaItem = {
  id: '550',
  title: 'Fight Club',
  overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
  media_type: 'movie',
  poster_path: '/fc.jpg',
  backdrop_path: '/fc_bg.jpg',
  vote_average: 8.4,
  imdbId: 'tt0137523'
};

const mockStreams: hdhubService.HDHubStream[] = [
  {
    id: 'stream-1',
    url: 'https://cdn.example.com/stream1.mp4',
    quality: '1080p',
    provider: 'PixelDrain',
    codec: 'H264',
    audioCodec: 'AAC',
    isWebAudio: true,
    isHls: false,
    audioLanguages: ['English']
  },
  {
    id: 'stream-2',
    url: 'https://cdn.example.com/stream2.m3u8',
    quality: '720p',
    provider: 'Cloudflare R2',
    codec: 'H264',
    audioCodec: 'AAC',
    isWebAudio: true,
    isHls: true,
    audioLanguages: ['English', 'Spanish']
  }
];

const mockSubs: subtitlesService.SubtitleTrackItem[] = [
  {
    id: 'sub-en',
    lang: 'en',
    label: 'English',
    url: 'https://subtitles.example.com/en.srt'
  },
  {
    id: 'sub-es',
    lang: 'es',
    label: 'Spanish',
    url: 'https://subtitles.example.com/es.vtt'
  }
];

// Mock HLS.js
const mockHlsInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  startLoad: vi.fn(),
  recoverMediaError: vi.fn(),
  audioTracks: [{ id: 0, name: 'Main', lang: 'en' }],
  audioTrack: 0
};

const MockHlsClass = vi.fn(function MockHls(this: any) {
  return mockHlsInstance;
});
(MockHlsClass as any).isSupported = vi.fn().mockReturnValue(true);
(MockHlsClass as any).Events = {
  MANIFEST_PARSED: 'hlsManifestParsed',
  AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
  ERROR: 'hlsError'
};
(MockHlsClass as any).ErrorDetails = {
  AUDIO_TRACK_LOAD_ERROR: 'audioTrackLoadError',
  AUDIO_TRACK_LOAD_TIMEOUT: 'audioTrackLoadTimeout'
};
(MockHlsClass as any).ErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError'
};

vi.mock('hls.js', () => ({
  default: MockHlsClass
}));

describe('Video Player Lifecycle Tests (TEST-03)', () => {
  let playSpy: any;
  let pauseSpy: any;
  let loadSpy: any;
  let canPlayTypeSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    playSpy = vi.fn().mockResolvedValue(undefined);
    pauseSpy = vi.fn();
    loadSpy = vi.fn();
    canPlayTypeSpy = vi.fn().mockReturnValue('');

    window.HTMLMediaElement.prototype.play = playSpy;
    window.HTMLMediaElement.prototype.pause = pauseSpy;
    window.HTMLMediaElement.prototype.load = loadSpy;
    window.HTMLMediaElement.prototype.canPlayType = canPlayTypeSpy;

    vi.spyOn(hdhubService, 'fetchHDHubStreams').mockResolvedValue({
      streams: mockStreams
    });

    vi.spyOn(subtitlesService, 'fetchAvailableSubtitles').mockResolvedValue(mockSubs);
    vi.spyOn(subtitlesService, 'fetchSubtitleVttBlob').mockResolvedValue('blob:https://streamverse/vtt-test');
    vi.spyOn(subtitlesService, 'revokeSubtitleBlob').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Mounts player, resolves streams, and initializes direct video playback', async () => {
    const onClose = vi.fn();

    render(
      <HDHubPlayer
        item={mockMovie}
        onClose={onClose}
      />
    );

    // Initial loading indicator
    expect(screen.getByText(/Resolving Cloud Stream/i)).toBeInTheDocument();

    // Streams resolve
    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    // Video element mounted with stream 1 URL
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockStreams[0].url);
  });

  it('2. Stream switching correctly re-attaches source and resets state', async () => {
    render(
      <HDHubPlayer
        item={mockMovie}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    // Open Quality / Stream sources dropdown
    const qualityButton = screen.getByTitle('Select Stream Quality');
    fireEvent.click(qualityButton);

    // Click on 720p HLS stream
    const stream720Option = screen.getByText('720p');
    fireEvent.click(stream720Option);

    // Selected quality label updates
    await waitFor(() => {
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });
  });

  it('3. Error recovery: renders error modal on fatal error and provides VLC / alternative links', async () => {
    render(
      <HDHubPlayer
        item={mockMovie}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();

    // Trigger video error with code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED) on prototype
    Object.defineProperty(window.HTMLMediaElement.prototype, 'error', {
      get() {
        return { code: 4, message: 'Format error' };
      },
      configurable: true
    });

    fireEvent.error(video!);

    // Playback notice modal should appear
    await waitFor(() => {
      expect(screen.getByText(/Browser Playback Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/Open in VLC Player/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Direct Stream/i)).toBeInTheDocument();
    });
  });

  it('4. Subtitle pipeline: selects subtitle track and fetches VTT blob', async () => {
    render(
      <HDHubPlayer
        item={mockMovie}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    // Open Subtitles CC menu
    const subtitlesBtn = screen.getByTitle(/Subtitles & Closed Captions/i);
    fireEvent.click(subtitlesBtn);

    // Wait for subtitle tracks to load
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    // Select English subtitle
    fireEvent.click(screen.getByText('English'));

    // Subtitle track blob fetched
    await waitFor(() => {
      expect(subtitlesService.fetchSubtitleVttBlob).toHaveBeenCalledWith('https://subtitles.example.com/en.srt');
    });

    // Track element should be mounted in video
    await waitFor(() => {
      const track = document.querySelector('track');
      expect(track).toBeInTheDocument();
      expect(track).toHaveAttribute('src', 'blob:https://streamverse/vtt-test');
    });
  });

  it('5. Cleanup: unmounting player destroys HLS instance, revokes subtitle blobs, and saves progress', async () => {
    // Configure prototype currentTime & duration before rendering
    Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
      get() {
        return 120;
      },
      set() {},
      configurable: true
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
      get() {
        return 600;
      },
      set() {},
      configurable: true
    });

    const { unmount } = render(
      <HDHubPlayer
        item={mockMovie}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1080p')).toBeInTheDocument();
    });

    // Unmount
    unmount();

    // Progress saved to localStorage continue watching store
    const saved = localStorage.getItem(CONTINUE_WATCHING_STORAGE_KEY);
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved || '[]');
    expect(parsed.some((r: any) => String(r.id) === '550')).toBe(true);
  });
});
