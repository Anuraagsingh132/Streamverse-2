import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStreamCard } from '../src/components/live-tv/LiveStreamCard';
import { LiveHeroBanner } from '../src/components/live-tv/LiveHeroBanner';
import { LiveStream } from '../src/types/liveTv';

const mockLiveMatch: LiveStream = {
  id: 101,
  name: 'Arsenal vs Chelsea',
  tag: 'Premier League',
  source_tag: 'Sky Sports',
  poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
  uri_name: 'ars-che',
  starts_at: 1734300000,
  ends_at: 1734310800,
  always_live: 0,
  category_name: 'Football'
};

const mock247Channel: LiveStream = {
  id: 102,
  name: 'Fox Cricket 501 HD',
  tag: 'Cricket',
  source_tag: 'Fox Sports',
  poster: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
  uri_name: 'fox-cricket-501',
  starts_at: 0,
  ends_at: 0,
  always_live: 1,
  category_name: '24/7 Channels'
};

describe('Live TV & Sports Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LiveStreamCard Component', () => {
    it('renders match title, provider, and triggers onPlay on click', () => {
      const onPlay = vi.fn();

      render(<LiveStreamCard stream={mockLiveMatch} onPlay={onPlay} />);

      // Title & Category rendered
      expect(screen.getByText('Arsenal vs Chelsea')).toBeInTheDocument();
      expect(screen.getByText(/Football/i)).toBeInTheDocument();

      // Card click triggers onPlay
      const card = screen.getByRole('button', { name: /Watch Arsenal vs Chelsea/i });
      fireEvent.click(card);
      expect(onPlay).toHaveBeenCalledWith(mockLiveMatch);
    });

    it('renders 24/7 badge for linear continuous channels', () => {
      const onPlay = vi.fn();

      render(<LiveStreamCard stream={mock247Channel} onPlay={onPlay} compactChannel={true} />);

      expect(screen.getByText('Fox Cricket 501 HD')).toBeInTheDocument();
      expect(screen.getByText('24/7')).toBeInTheDocument();
    });
  });

  describe('LiveHeroBanner Component', () => {
    it('renders marquee title, badges, action buttons, and up-next strip', () => {
      const onPlay = vi.fn();
      const onToggleBookmark = vi.fn();

      render(
        <LiveHeroBanner
          items={[mockLiveMatch, mock247Channel]}
          onPlay={onPlay}
          onToggleBookmark={onToggleBookmark}
        />
      );

      // Hero Title
      expect(screen.getByRole('heading', { level: 1, name: /Arsenal vs Chelsea/i })).toBeInTheDocument();

      // Watch Now button
      const watchBtn = screen.getByRole('button', { name: /Watch Now/i });
      expect(watchBtn).toBeInTheDocument();
      fireEvent.click(watchBtn);
      expect(onPlay).toHaveBeenCalledWith(mockLiveMatch);

      // Up Next Preview strip
      expect(screen.getByText('Up Next on Streamverse')).toBeInTheDocument();
    });
  });
});
