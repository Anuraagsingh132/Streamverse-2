import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../src/components/Navbar';
import { PosterCard } from '../src/components/PosterCard';
import { MediaCard } from '../src/components/MediaCard';
import { MediaRail } from '../src/components/MediaRail';
import { SearchModal } from '../src/components/SearchModal';
import { ComingSoonPage } from '../src/pages/ComingSoonPage';
import { Footer } from '../src/components/Footer';
import { MediaItem } from '../src/types/media';

const mockMovie: MediaItem = {
  id: '101',
  title: 'Inception',
  overview: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
  media_type: 'movie',
  poster_path: '/inception.jpg',
  backdrop_path: '/inception_bg.jpg',
  vote_average: 8.8,
  release_date: '2010-07-16',
};

const mockTvShow: MediaItem = {
  id: '202',
  title: 'Breaking Bad',
  overview: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.',
  media_type: 'tv',
  poster_path: '/bb.jpg',
  backdrop_path: '/bb_bg.jpg',
  vote_average: 9.5,
  first_air_date: '2008-01-20',
};

describe('Component Testing Suite (TEST-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navbar Component', () => {
    it('renders navigation links and triggers onNavigate on click', () => {
      const onNavigate = vi.fn();
      const onOpenSearch = vi.fn();

      render(
        <Navbar
          currentRoute="home"
          onNavigate={onNavigate}
          onOpenSearch={onOpenSearch}
          watchlistCount={3}
        />
      );

      // Home link
      expect(screen.getAllByLabelText(/Streamverse Home/i)[0]).toBeInTheDocument();

      // Nav link click (Movies)
      const moviesLink = screen.getByText('Movies');
      fireEvent.click(moviesLink);
      expect(onNavigate).toHaveBeenCalledWith('movie');

      // TV Shows link
      const tvLink = screen.getByText('TV Shows');
      fireEvent.click(tvLink);
      expect(onNavigate).toHaveBeenCalledWith('tv');

      // Search button
      const searchButton = screen.getByRole('button', { name: /search/i });
      fireEvent.click(searchButton);
      expect(onOpenSearch).toHaveBeenCalledTimes(1);
    });

    it('opens browse dropdown and navigates to secondary routes', () => {
      const onNavigate = vi.fn();

      render(
        <Navbar
          currentRoute="home"
          onNavigate={onNavigate}
          onOpenSearch={vi.fn()}
          watchlistCount={5}
        />
      );

      const browseBtn = screen.getByText('Browse');
      fireEvent.click(browseBtn);

      // Providers item in dropdown
      const providersOption = screen.getByText('Providers');
      fireEvent.click(providersOption);
      expect(onNavigate).toHaveBeenCalledWith('providers');
    });
  });

  describe('PosterCard Component', () => {
    it('renders movie title, rating, and handles card interaction', () => {
      const onOpenDetails = vi.fn();
      const onPlay = vi.fn();

      render(
        <PosterCard
          item={mockMovie}
          onOpenDetails={onOpenDetails}
          onPlay={onPlay}
        />
      );

      const titles = screen.getAllByText('Inception');
      expect(titles.length).toBeGreaterThan(0);
      expect(screen.getAllByText('8.8').length).toBeGreaterThan(0);

      // Click card to open details
      const card = titles[0].closest('[tabIndex="0"]') || titles[0].closest('div');
      if (card) fireEvent.click(card);
      expect(onOpenDetails).toHaveBeenCalledWith(mockMovie);

      // Play button on card
      const playBtn = screen.getByRole('button', { name: /Play Inception/i });
      fireEvent.click(playBtn);
      expect(onPlay).toHaveBeenCalledWith(mockMovie);
    });
  });

  describe('MediaCard Component', () => {
    it('renders horizontal media card and handles play action and watchlist toggle', () => {
      const onOpenDetails = vi.fn();
      const onPlay = vi.fn();
      const onToggleWatchlist = vi.fn();

      render(
        <MediaCard
          item={mockTvShow}
          onOpenDetails={onOpenDetails}
          onPlay={onPlay}
          isWatchlist={false}
          onToggleWatchlist={onToggleWatchlist}
        />
      );

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();

      // Play button on card
      const playBtn = screen.getByTitle(/Play/i);
      fireEvent.click(playBtn);
      expect(onPlay).toHaveBeenCalledWith(mockTvShow);

      // Watchlist toggle button
      const watchlistBtn = screen.getByTitle(/Add to Watchlist/i);
      fireEvent.click(watchlistBtn);
      expect(onToggleWatchlist).toHaveBeenCalledWith(mockTvShow);
    });
  });

  describe('MediaRail Component', () => {
    it('renders section title and list of media cards', () => {
      const onOpenDetails = vi.fn();
      const onPlay = vi.fn();

      render(
        <MediaRail
          title="Trending Now"
          items={[mockMovie, mockTvShow]}
          onOpenDetails={onOpenDetails}
          onPlay={onPlay}
          watchlist={[]}
          onToggleWatchlist={vi.fn()}
        />
      );

      expect(screen.getByText('Trending Now')).toBeInTheDocument();
      expect(screen.getAllByText('Inception').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Breaking Bad').length).toBeGreaterThan(0);
    });
  });

  describe('SearchModal Component', () => {
    it('renders search input and responds to input changes and close', async () => {
      const onClose = vi.fn();
      const onPlay = vi.fn();
      const onOpenDetails = vi.fn();
      const onNavigate = vi.fn();

      render(
        <SearchModal
          isOpen={true}
          onClose={onClose}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          onNavigate={onNavigate}
        />
      );

      const input = screen.getByPlaceholderText(/Search movies, shows/i);
      expect(input).toBeInTheDocument();

      // Type query
      fireEvent.change(input, { target: { value: 'Inception' } });
      expect((input as HTMLInputElement).value).toBe('Inception');

      // Escape key to close
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('ComingSoonPage Component', () => {
    it('renders feature-specific copy for Live Sports', () => {
      render(
        <MemoryRouter initialEntries={['/sports']}>
          <ComingSoonPage feature="sports" />
        </MemoryRouter>
      );

      expect(screen.getByText('Live Sports Broadcasts')).toBeInTheDocument();
      expect(screen.getByText(/Live Stadium Feeds · Coming Soon/i)).toBeInTheDocument();
      expect(screen.getByText('Ultra HD 60FPS Feeds')).toBeInTheDocument();
    });

    it('renders feature-specific copy for AI Search and Music', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/ai']}>
          <ComingSoonPage feature="ai" />
        </MemoryRouter>
      );

      expect(screen.getByText('AI Natural Language Search')).toBeInTheDocument();
      expect(screen.getByText(/Neural Discovery · Coming Soon/i)).toBeInTheDocument();

      rerender(
        <MemoryRouter initialEntries={['/music']}>
          <ComingSoonPage feature="music" />
        </MemoryRouter>
      );

      expect(screen.getByText('Soundtracks & OST Player')).toBeInTheDocument();
      expect(screen.getByText(/Lossless Audio Engine · Coming Soon/i)).toBeInTheDocument();
    });

    it('toggles notify subscription and updates localStorage', () => {
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={['/discover']}>
          <ComingSoonPage feature="discover" />
        </MemoryRouter>
      );

      const notifyButton = screen.getByRole('button', { name: /Notify Me When Live/i });
      fireEvent.click(notifyButton);

      expect(screen.getByText(/On Early Access List/i)).toBeInTheDocument();
      const stored = JSON.parse(localStorage.getItem('streamverse_coming_soon_alerts') || '[]');
      expect(stored).toContain('discover');
    });

    it('triggers onNavigate callbacks when navigation buttons are clicked', () => {
      const onNavigate = vi.fn();

      render(
        <MemoryRouter initialEntries={['/providers']}>
          <ComingSoonPage feature="providers" onNavigate={onNavigate} />
        </MemoryRouter>
      );

      const homeBtn = screen.getByRole('button', { name: /Back to Home/i });
      fireEvent.click(homeBtn);
      expect(onNavigate).toHaveBeenCalledWith('home');

      const exploreBtn = screen.getByRole('button', { name: /Explore Trending Movies/i });
      fireEvent.click(exploreBtn);
      expect(onNavigate).toHaveBeenCalledWith('movie');
    });
  });

  describe('Footer Component', () => {
    it('renders brand, grouped navigation sections (Browse & Account), and handles clicks', () => {
      const onNavigate = vi.fn();
      render(<Footer onNavigate={onNavigate} />);
      expect(screen.getByText('Streamverse')).toBeInTheDocument();
      expect(screen.getByText('Browse')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      const sportsLink = screen.getByText('Live TV & Sports');
      expect(sportsLink).toBeInTheDocument();
      fireEvent.click(sportsLink);
      expect(onNavigate).toHaveBeenCalledWith('livesports');
      const watchlistLink = screen.getByText('Watchlist');
      expect(watchlistLink).toBeInTheDocument();
      fireEvent.click(watchlistLink);
      expect(onNavigate).toHaveBeenCalledWith('watchlist');
      expect(screen.getByText(/Streamverse does not host any files on its servers/i)).toBeInTheDocument();
    });
  });
});

