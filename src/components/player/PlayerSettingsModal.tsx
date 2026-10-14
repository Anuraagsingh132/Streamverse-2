import React from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  AudioLines,
  Subtitles,
  RotateCw,
  Film,
  HardDrive,
  Zap,
  Copy,
  Check,
  Upload,
  FileText,
  AlertCircle,
  Play,
  Wifi
} from 'lucide-react';
import { HDHubStream } from '../../services/hdhub';
import { SubtitleTrackItem } from '../../services/subtitles';
import { PixelDrainRoute } from '../../utils/pixeldrain';

export interface AudioOptionItem {
  id: string;
  label: string;
  isNative?: boolean;
  nativeIndex?: number;
  streamIndex?: number;
}

export interface PlayerSettingsModalProps {
  settingsTab: 'main' | 'speed' | 'quality' | 'aspect' | 'audio' | 'subtitles' | 'pixeldrain';
  setSettingsTab: (tab: 'main' | 'speed' | 'quality' | 'aspect' | 'audio' | 'subtitles' | 'pixeldrain') => void;
  setIsSettingsMenuOpen: (open: boolean) => void;
  activeAudioLabel: string;
  selectedAudioLang: string;
  audioOptions: AudioOptionItem[];
  handleSelectAudioOption: (opt: AudioOptionItem) => void;
  selectedStream: HDHubStream | null;
  handleCopyLink: () => void;
  copied: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedSubtitleId: string | null;
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

export const PlayerSettingsModal: React.FC<PlayerSettingsModalProps> = ({
  settingsTab,
  setSettingsTab,
  setIsSettingsMenuOpen,
  activeAudioLabel,
  selectedAudioLang,
  audioOptions,
  handleSelectAudioOption,
  selectedStream,
  handleCopyLink,
  copied,
  fileInputRef,
  selectedSubtitleId,
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      data-lenis-prevent
      className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-50 max-h-[80vh] overflow-y-auto"
    >
      {settingsTab === 'main' ? (
        <div className="space-y-1">
          <div className="px-3 py-1.5 border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Playback Settings</span>
          </div>

          {/* Audio Track Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('audio')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AudioLines className="h-3.5 w-3.5 text-white/60 shrink-0" />
              <span>Audio Track</span>
            </div>
            <div className="flex items-center gap-1 text-white/50 min-w-0 max-w-[120px]">
              <span className="truncate">{activeAudioLabel}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </div>
          </button>

          {/* Subtitles Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('subtitles')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Subtitles className="h-3.5 w-3.5 text-white/60 shrink-0" />
              <span>Subtitles (CC)</span>
            </div>
            <div className="flex items-center gap-1 text-white/50 min-w-0 max-w-[120px]">
              <span className="truncate">
                {selectedSubtitleId ? (subtitlesList.find((s) => s.id === selectedSubtitleId)?.label || 'On') : 'Off'}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </div>
          </button>

          {/* Playback Speed Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('speed')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5 text-white/60" />
              <span>Playback Speed</span>
            </div>
            <div className="flex items-center gap-1 text-white/50">
              <span>{playbackSpeed}x</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Aspect Ratio Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('aspect')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-white/60" />
              <span>Aspect Ratio</span>
            </div>
            <div className="flex items-center gap-1 text-white/50">
              <span className="capitalize">{objectFit}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Stream Quality Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('quality')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 text-white/60" />
              <span>Source Quality</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <span>{selectedStream?.quality || '1080p'}</span>
              {selectedStream?.bitrate && (
                <span className="text-amber-400/90 font-medium text-[11px]">· {selectedStream.bitrate}</span>
              )}
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* PixelDrain Route Submenu */}
          <button
            type="button"
            onClick={() => setSettingsTab('pixeldrain')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-rose-400" />
              <span>PixelDrain Route</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <span>{pixelDrainRoute === 'cdn' ? 'Fast CDN' : 'Normal'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Copy Stream Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition border-t border-white/10 mt-1"
          >
            <div className="flex items-center gap-2">
              <Copy className="h-3.5 w-3.5 text-white/60" />
              <span>Copy Stream Link</span>
            </div>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronRight className="h-3.5 w-3.5 opacity-0" />}
          </button>
        </div>
      ) : settingsTab === 'audio' ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
            <button
              type="button"
              onClick={() => setSettingsTab('main')}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-white">Audio Tracks</span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
            {audioOptions.map((opt) => {
              const isSelected = activeAudioLabel === opt.label || selectedAudioLang === opt.label;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAudioOption(opt)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                    isSelected
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <AudioLines className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}

            {/* Informational card for audio compatibility */}
            {selectedStream?.url && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl border space-y-2 ${
                  selectedStream.isWebAudio === false
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {selectedStream.isWebAudio === false
                      ? `${selectedStream.audioCodec || 'DDP 5.1'} Audio (No Web Sound)`
                      : 'Multi-Audio Tracks & VLC'}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {selectedStream.isWebAudio === false
                    ? 'Web browsers lack Dolby Digital Plus / TrueHD decoders. Open directly in VLC media player for loud, full multi-channel surround sound, or pick an AAC/HLS stream in Stream Sources.'
                    : 'Web browsers can only play Track 1 from direct video files. To switch secondary audio languages or Atmos dubs, open directly in VLC:'}
                </p>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <a
                    href={`vlc://${selectedStream.url}`}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-primary text-black font-semibold text-[11px] hover:brightness-110 active:scale-95 transition text-center shadow-sm"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Open in VLC (Full Audio & Surround)</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-[11px] transition"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Stream Link for VLC/MPV'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : settingsTab === 'subtitles' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettingsTab('main')}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-white">Subtitles</span>
            </div>
            {/* Upload Custom Subtitle Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              title="Upload .srt or .vtt subtitle"
            >
              <Upload className="h-3 w-3" />
              <span>Upload</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
            {/* Option: Off */}
            <button
              type="button"
              onClick={() => handleSelectSubtitle(null)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                !selectedSubtitleId
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Off</span>
              {!selectedSubtitleId && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>

            {/* Loading State */}
            {subtitlesLoading && subtitlesList.length === 0 && (
              <div className="py-4 text-center text-xs text-white/40">
                Searching subtitles...
              </div>
            )}

            {/* Subtitles List */}
            {subtitlesList.map((sub) => {
              const isSelected = selectedSubtitleId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubtitle(sub)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                    isSelected
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {sub.isCustom ? (
                      <FileText className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                    ) : (
                      <Subtitles className="h-3.5 w-3.5 text-white/40 shrink-0" />
                    )}
                    <span className="truncate">{sub.label}</span>
                    {sub.isCustom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0">
                        Local
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}

            {!subtitlesLoading && subtitlesList.length === 0 && (
              <div className="py-3 px-2 text-center text-xs text-white/40">
                No cloud subtitles found. You can upload your own .srt / .vtt file above.
              </div>
            )}
          </div>

          {/* Subtitle Size Selector */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/80">Subtitle Size</span>
              <span className="text-[10px] font-bold text-primary capitalize">{subtitleSize}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateSettings({ subtitleSize: size })}
                  className={`py-1 rounded-lg text-[10px] font-semibold capitalize transition ${
                    subtitleSize === size
                      ? 'bg-primary text-black font-bold shadow'
                      : 'bg-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle Timing Offset Control */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/80">Timing Offset</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-primary">
                  {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(1)}s` : `${subtitleOffset.toFixed(1)}s`}
                </span>
                <button
                  type="button"
                  onClick={() => updateSettings({ subtitleOffset: 0 })}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 transition"
                  title="Reset subtitle offset to 0 seconds"
                  aria-label="Reset subtitle offset to 0 seconds"
                >
                  Reset
                </button>
              </div>
            </div>
            <input
              type="range"
              min={-5.0}
              max={5.0}
              step={0.5}
              value={subtitleOffset}
              onChange={(e) => updateSettings({ subtitleOffset: parseFloat(e.target.value) })}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label="Subtitle timing offset slider"
            />
            <div className="flex justify-between text-[9px] text-white/40">
              <span>Earlier (-5s)</span>
              <span>Sync (0s)</span>
              <span>Later (+5s)</span>
            </div>
          </div>
        </div>
      ) : settingsTab === 'speed' ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
            <button
              type="button"
              onClick={() => setSettingsTab('main')}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-white">Playback Speed</span>
          </div>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => {
                setPlaybackSpeed(spd);
                if (videoRef.current) videoRef.current.playbackRate = spd;
                showToast(`${spd}x Speed`);
                setIsSettingsMenuOpen(false);
                setSettingsTab('main');
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                playbackSpeed === spd
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{spd === 1 ? 'Normal (1.0x)' : `${spd}x`}</span>
              {playbackSpeed === spd && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      ) : settingsTab === 'aspect' ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
            <button
              type="button"
              onClick={() => setSettingsTab('main')}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-white">Aspect Ratio</span>
          </div>
          {[
            { id: 'contain', label: 'Contain (Default 16:9)' },
            { id: 'cover', label: 'Cover (Zoom to Fill)' }
          ].map((asp) => (
            <button
              key={asp.id}
              type="button"
              onClick={() => {
                setObjectFit(asp.id as 'contain' | 'cover');
                showToast(`Aspect: ${asp.id}`);
                setIsSettingsMenuOpen(false);
                setSettingsTab('main');
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                objectFit === asp.id
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{asp.label}</span>
              {objectFit === asp.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      ) : settingsTab === 'pixeldrain' ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
            <button
              type="button"
              onClick={() => setSettingsTab('main')}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-white">PixelDrain Route</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {[
              {
                id: 'normal',
                name: 'Normal (Proxy)',
                desc: '/api/pixeldrain/:id'
              },
              {
                id: 'cdn',
                name: 'Fast CDN Mirror',
                desc: '/api/pixeldrain-cdn/:id'
              }
            ].map((r) => {
              const isSelected = pixelDrainRoute === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectPixelDrainRoute(r.id as PixelDrainRoute)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                    isSelected
                      ? 'bg-rose-500/20 text-rose-300 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{r.name}</span>
                      {isSelected && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono">{r.desc}</div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
            <button
              type="button"
              onClick={() => setSettingsTab('main')}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-white">Stream Sources</span>
          </div>
          {streams.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedStreamIndex(idx);
                setIsSettingsMenuOpen(false);
                setSettingsTab('main');
                showToast(`${s.quality} · ${s.provider}${s.bitrate ? ` (${s.bitrate})` : ''}`);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                idx === selectedStreamIndex
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-white text-xs">{s.quality}</span>
                  <span className="text-[10px] text-white/60">({s.provider})</span>
                  {s.isHls && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                      HLS
                    </span>
                  )}
                  {s.isWebAudio ? (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                      🎧 Web Audio
                    </span>
                  ) : (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                      ⚠️ {s.audioCodec || 'DDP'} (VLC)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50 flex-wrap">
                  {s.bitrate && (
                    <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                      <Zap className="h-2.5 w-2.5 inline shrink-0" />
                      {s.bitrate}
                    </span>
                  )}
                  {s.requiredSpeed && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                        <Wifi className="h-2.5 w-2.5 inline shrink-0" />
                        Req {s.requiredSpeed}
                      </span>
                    </>
                  )}
                  {s.sizeFormatted && (
                    <>
                      <span className="text-white/20">•</span>
                      <span>{s.sizeFormatted}</span>
                    </>
                  )}
                </div>
              </div>
              {idx === selectedStreamIndex && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
