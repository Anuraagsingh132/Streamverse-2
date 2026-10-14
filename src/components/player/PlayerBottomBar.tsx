import React from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  Camera,
  PictureInPicture2,
  Subtitles
} from 'lucide-react';
import { PlayerSettingsModal, AudioOptionItem } from './PlayerSettingsModal';
import { HDHubStream } from '../../services/hdhub';
import { SubtitleTrackItem } from '../../services/subtitles';
import { PixelDrainRoute } from '../../utils/pixeldrain';

export interface PlayerBottomBarProps {
  showControls: boolean;
  scrubberRef: React.RefObject<HTMLDivElement | null>;
  validDuration: number;
  currentTime: number;
  handleScrubberKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleScrubberMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleScrubberTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleScrubberMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleScrubberMouseLeave: () => void;
  hoverProgress: { time: number; xPercent: number } | null;
  formatTime: (sec: number) => string;
  isDragging: boolean;
  bufferedPercent: number;
  playedPercent: number;
  isPlaying: boolean;
  handleTogglePlay: () => void;
  handleSkip: (sec: number) => void;
  isMuted: boolean;
  volume: number;
  handleToggleMute: () => void;
  handleVolumeSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleScreenshot: () => void;
  handleTogglePiP: () => void;
  selectedSubtitleId: string | null;
  isSettingsMenuOpen: boolean;
  setIsSettingsMenuOpen: (open: boolean) => void;
  settingsTab: 'main' | 'speed' | 'quality' | 'aspect' | 'audio' | 'subtitles' | 'pixeldrain';
  setSettingsTab: (tab: 'main' | 'speed' | 'quality' | 'aspect' | 'audio' | 'subtitles' | 'pixeldrain') => void;
  setIsQualityDropdownOpen: (open: boolean) => void;
  settingsMenuRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
  // Settings modal pass-through props
  activeAudioLabel: string;
  selectedAudioLang: string;
  audioOptions: AudioOptionItem[];
  handleSelectAudioOption: (opt: AudioOptionItem) => void;
  selectedStream: HDHubStream | null;
  handleCopyLink: () => void;
  copied: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  subtitlesLoading: boolean;
  subtitlesList: SubtitleTrackItem[];
  handleSelectSubtitle: (sub: SubtitleTrackItem | null) => void;
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleOffset: number;
  updateSettings: (newSettings: { subtitleSize?: 'small' | 'medium' | 'large'; subtitleOffset?: number }) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (spd: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showToast: (msg: string) => void;
  objectFit: 'contain' | 'cover';
  setObjectFit: (fit: 'contain' | 'cover') => void;
  pixelDrainRoute: PixelDrainRoute;
  handleSelectPixelDrainRoute: (route: PixelDrainRoute) => void;
  streams: HDHubStream[];
  selectedStreamIndex: number;
  setSelectedStreamIndex: (idx: number) => void;
}

export const PlayerBottomBar: React.FC<PlayerBottomBarProps> = ({
  showControls,
  scrubberRef,
  validDuration,
  currentTime,
  handleScrubberKeyDown,
  handleScrubberMouseDown,
  handleScrubberTouchStart,
  handleScrubberMouseMove,
  handleScrubberMouseLeave,
  hoverProgress,
  formatTime,
  isDragging,
  bufferedPercent,
  playedPercent,
  isPlaying,
  handleTogglePlay,
  handleSkip,
  isMuted,
  volume,
  handleToggleMute,
  handleVolumeSliderChange,
  handleScreenshot,
  handleTogglePiP,
  selectedSubtitleId,
  isSettingsMenuOpen,
  setIsSettingsMenuOpen,
  settingsTab,
  setSettingsTab,
  setIsQualityDropdownOpen,
  settingsMenuRef,
  isFullscreen,
  handleToggleFullscreen,
  activeAudioLabel,
  selectedAudioLang,
  audioOptions,
  handleSelectAudioOption,
  selectedStream,
  handleCopyLink,
  copied,
  fileInputRef,
  subtitlesLoading,
  subtitlesList,
  handleSelectSubtitle,
  subtitleSize,
  subtitleOffset,
  updateSettings,
  playbackSpeed,
  setPlaybackSpeed,
  videoRef,
  showToast,
  objectFit,
  setObjectFit,
  pixelDrainRoute,
  handleSelectPixelDrainRoute,
  streams,
  selectedStreamIndex,
  setSelectedStreamIndex
}) => {
  return (
    <div
      className={`absolute bottom-0 inset-x-0 z-40 p-4 sm:p-6 transition-all duration-300 ease-out ${
        showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      {/* Progress Bar with Designer Spec: 24px/40px hit area, 4px resting -> 8px hover */}
      <div
        ref={scrubberRef}
        role="slider"
        tabIndex={0}
        aria-label="Video scrubber"
        aria-valuemin={0}
        aria-valuemax={Math.round(validDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(validDuration)}`}
        onKeyDown={handleScrubberKeyDown}
        onMouseDown={handleScrubberMouseDown}
        onTouchStart={handleScrubberTouchStart}
        onMouseMove={handleScrubberMouseMove}
        onMouseLeave={handleScrubberMouseLeave}
        className="relative group/progress mb-3 sm:mb-4 h-10 sm:h-6 flex items-center cursor-pointer select-none touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full"
      >
        {/* Time Tooltip on Hover / Drag */}
        {hoverProgress && (
          <div
            style={{ left: `${Math.max(6, Math.min(94, hoverProgress.xPercent))}%` }}
            className="absolute -top-10 -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-white/20 text-white font-mono text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-30"
          >
            <span>{formatTime(hoverProgress.time)}</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-zinc-950/90" />
          </div>
        )}

        {/* Visual Track Bar */}
        <div
          className={`relative w-full rounded-full bg-white/20 overflow-hidden transition-all duration-150 ease-out ${
            isDragging ? 'h-2' : 'h-1 group-hover/progress:h-2'
          }`}
        >
          {/* Buffered Layer */}
          <div
            style={{ width: `${Math.max(0, Math.min(100, bufferedPercent))}%` }}
            className="absolute top-0 bottom-0 left-0 bg-white/35 rounded-full transition-all duration-200 pointer-events-none"
          />

          {/* Hover Preview Line */}
          {hoverProgress && (
            <div
              style={{ width: `${Math.max(0, Math.min(100, hoverProgress.xPercent))}%` }}
              className="absolute top-0 bottom-0 left-0 bg-white/40 pointer-events-none"
            />
          )}

          {/* Played Progress Bar */}
          <div
            style={{ width: `${playedPercent}%` }}
            className="absolute top-0 bottom-0 left-0 bg-primary rounded-full pointer-events-none shadow-[0_0_12px_rgba(255,255,255,0.5)]"
          />
        </div>

        {/* Handle Dot */}
        <div
          style={{ left: `${playedPercent}%` }}
          className={`absolute -translate-x-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-transform duration-100 ${
            isDragging
              ? 'h-4 w-4 scale-110 opacity-100'
              : 'h-3.5 w-3.5 opacity-0 group-hover/progress:opacity-100 group-hover/progress:scale-100'
          }`}
        />
      </div>

      {/* Control Icons Row */}
      <div className="flex items-center justify-between">
        {/* Left Side: Playback & Volume */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
            ) : (
              <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Backward 10s */}
          <button
            type="button"
            onClick={() => handleSkip(-10)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {/* Skip Forward 10s */}
          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {/* Volume Control Group */}
          <div className="group/volume flex items-center gap-2 pl-1 sm:pl-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5 text-rose-400" strokeWidth={1.8} />
              ) : volume < 0.5 ? (
                <Volume1 className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Volume2 className="h-5 w-5" strokeWidth={1.8} />
              )}
            </button>
            <div className="w-0 overflow-hidden opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 focus-within:w-20 focus-within:opacity-100 transition-all duration-200 flex items-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeSliderChange}
                aria-label="Volume slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
                aria-valuetext={isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                className="w-18 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="pl-2 sm:pl-3 text-xs sm:text-sm font-mono font-medium text-white/80 select-none">
            <span className="text-white">{formatTime(currentTime)}</span>
            <span className="text-white/40 mx-1">/</span>
            <span>{formatTime(validDuration)}</span>
          </div>
        </div>

        {/* Right Side: Extras & Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Screenshot Capture */}
          <button
            type="button"
            onClick={handleScreenshot}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95"
            title="Capture Screenshot"
            aria-label="Capture Screenshot"
          >
            <Camera className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {/* Picture-in-Picture */}
          <button
            type="button"
            onClick={handleTogglePiP}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95"
            title="Picture-in-Picture"
            aria-label="Picture-in-Picture"
          >
            <PictureInPicture2 className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {/* Subtitles / CC Quick Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (isSettingsMenuOpen && settingsTab === 'subtitles') {
                setIsSettingsMenuOpen(false);
                setSettingsTab('main');
              } else {
                setIsSettingsMenuOpen(true);
                setSettingsTab('subtitles');
                setIsQualityDropdownOpen(false);
              }
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
              selectedSubtitleId
                ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                : 'text-white/80 hover:bg-white/15 hover:text-white'
            }`}
            title="Subtitles & Closed Captions"
            aria-label="Subtitles & Closed Captions"
          >
            <Subtitles className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {/* Settings Menu Button */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsSettingsMenuOpen(!isSettingsMenuOpen);
                setSettingsTab('main');
                setIsQualityDropdownOpen(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
                isSettingsMenuOpen ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
              title="Playback Settings"
              aria-label="Playback Settings"
            >
              <Settings
                className={`h-5 w-5 transition-transform duration-200 ${isSettingsMenuOpen ? 'rotate-45' : ''}`}
                strokeWidth={1.8}
              />
            </button>

            {/* Settings Dropdown Popover */}
            <AnimatePresence>
              {isSettingsMenuOpen && (
                <PlayerSettingsModal
                  settingsTab={settingsTab}
                  setSettingsTab={setSettingsTab}
                  setIsSettingsMenuOpen={setIsSettingsMenuOpen}
                  activeAudioLabel={activeAudioLabel}
                  selectedAudioLang={selectedAudioLang}
                  audioOptions={audioOptions}
                  handleSelectAudioOption={handleSelectAudioOption}
                  selectedStream={selectedStream}
                  handleCopyLink={handleCopyLink}
                  copied={copied}
                  fileInputRef={fileInputRef}
                  selectedSubtitleId={selectedSubtitleId}
                  subtitlesLoading={subtitlesLoading}
                  subtitlesList={subtitlesList}
                  handleSelectSubtitle={handleSelectSubtitle}
                  subtitleSize={subtitleSize}
                  subtitleOffset={subtitleOffset}
                  updateSettings={updateSettings}
                  playbackSpeed={playbackSpeed}
                  setPlaybackSpeed={setPlaybackSpeed}
                  videoRef={videoRef}
                  showToast={showToast}
                  objectFit={objectFit}
                  setObjectFit={setObjectFit}
                  pixelDrainRoute={pixelDrainRoute}
                  handleSelectPixelDrainRoute={handleSelectPixelDrainRoute}
                  streams={streams}
                  selectedStreamIndex={selectedStreamIndex}
                  setSelectedStreamIndex={setSelectedStreamIndex}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Maximize className="h-5 w-5" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
