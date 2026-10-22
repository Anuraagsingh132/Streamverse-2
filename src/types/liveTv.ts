export interface LiveSubstream {
  id: number;
  name: string;
  tag?: string;
  uri_name: string;
  source_tag?: string;
  locale?: string;
  iframe?: string;
}

export interface LiveStream {
  id: number;
  name: string;
  tag?: string;
  source_tag?: string;
  poster?: string;
  blurhash?: string;
  colors?: string[];
  uri_name: string;
  starts_at: number; // Unix timestamp in seconds (0 for 24/7 channels)
  ends_at: number; // Unix timestamp in seconds (0 for 24/7 channels)
  always_live: number | boolean;
  locale?: string;
  category_name: string;
  iframe?: string;
  substreams?: LiveSubstream[];
  viewers?: string | number;
  allowpaststreams?: number;
}

export interface StreamCategory {
  category: string;
  id: number;
  always_live: boolean | number;
  streams: LiveStream[];
}

export interface LiveStreamsResponse {
  success: boolean;
  timestamp: number;
  READ_ME?: string;
  performance?: number;
  streams: StreamCategory[];
}

export interface PingResponse {
  success: boolean;
  domains: string[];
  status?: Array<{
    id: string;
    content: string;
    close?: boolean;
    to?: string;
  }>;
}

export type StreamStatus = 'live' | 'upcoming' | 'ended';

export interface StreamFilterOptions {
  category?: string;
  query?: string;
  status?: 'all' | 'live' | 'upcoming' | '24/7';
}
