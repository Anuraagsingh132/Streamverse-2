export type MediaType = 'movie' | 'tv' | 'anime';

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department?: string;
  profile_path?: string;
}

export interface StudioOrNetwork {
  id: number;
  name: string;
  logo_path?: string;
}

export interface VideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface EpisodeItem {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path?: string;
  air_date?: string;
  vote_average?: number;
  runtime?: number;
}

export interface SeasonItem {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  media_type: MediaType;
  year?: number;
  genres?: string[];
  duration?: string;
  seasons?: number;
  episodes?: number;
  provider?: string;
  imdbId?: string;
  tmdbId?: string;
  title_logo?: string;
  logo_path?: string;
  badge?: string;
  tagline?: string;
  trailer_key?: string;
  cast?: CastMember[];
  directors?: CrewMember[];
  writers?: CrewMember[];
  producers?: CrewMember[];
  crew?: CrewMember[];
  studios?: StudioOrNetwork[];
  networks?: StudioOrNetwork[];
  videos?: VideoItem[];
  seasons_list?: SeasonItem[];
  episodes_list?: EpisodeItem[];
  status?: string;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  original_language?: string;
  vote_count?: number;
  content_rating?: string;
  recommendations?: MediaItem[];
  similar?: MediaItem[];
  budget?: number;
  revenue?: number;
}

export interface Provider {
  id: string;
  name: string;
  logo: string;
  count: number;
  color: string;
  tmdbProviderId?: number;
}

export interface LiveSport {
  id: string;
  title: string;
  tournament: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  time: string;
  isLive: boolean;
  category: 'Football' | 'Basketball' | 'Motorsport' | 'Fighting' | 'Tennis';
  viewers: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  sourceMedia: string;
  duration: string;
  cover: string;
  audioUrl?: string;
}
