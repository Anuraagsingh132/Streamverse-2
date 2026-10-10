import React from 'react';
import {
  X,
  HardDrive,
  Play,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Film
} from 'lucide-react';
import { HDHubStream } from '../../services/hdhub';

export interface PlayerErrorModalProps {
  playbackError: boolean;
  selectedStream: HDHubStream | null;
  streams: HDHubStream[];
  selectedStreamIndex: number;
  setSelectedStreamIndex: (idx: number) => void;
  setPlaybackError: (err: boolean) => void;
  handleCopyLink: () => void;
  copied: boolean;
  onSwitchServer?: (serverId: string) => void;
}

export const PlayerErrorModal: React.FC<PlayerErrorModalProps> = ({
  playbackError,
  selectedStream,
  streams,
  selectedStreamIndex,
  setSelectedStreamIndex,
  setPlaybackError,
  handleCopyLink,
  copied,
  onSwitchServer
}) => {
  if (!playbackError || !selectedStream) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative max-w-lg w-full rounded-2xl border border-white/15 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setPlaybackError(false)}
          className="absolute top-4 right-4 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
          title="Dismiss Notice"
          aria-label="Dismiss Notice"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3.5 mb-4 pr-6">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <HardDrive className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Browser Playback Notice</h4>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                MKV / DDP 5.1
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              This direct stream is encoded in an <strong>MKV container</strong> with multi-channel audio from{' '}
              <strong className="text-white/80">{selectedStream.provider}</strong>. Your current browser cannot natively
              decode this audio format without an external player.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
          <a
            href={`vlc://${selectedStream.url}`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-black font-semibold text-xs transition hover:brightness-110 active:scale-95 shadow-md text-center"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Open in VLC Player</span>
          </a>

          <a
            href={selectedStream.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs transition hover:bg-white/20 active:scale-95 border border-white/10 text-center"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Direct Stream</span>
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white font-medium text-xs transition hover:bg-white/10 active:scale-95 border border-white/10"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Stream Link'}</span>
          </button>

          {streams.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const next = (selectedStreamIndex + 1) % streams.length;
                setSelectedStreamIndex(next);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white font-medium text-xs transition hover:bg-white/10 active:scale-95 border border-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Alternate Stream</span>
            </button>
          )}

          {onSwitchServer && (
            <button
              type="button"
              onClick={() => onSwitchServer('cinemaos')}
              className="sm:col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition active:scale-95 border border-white/10 text-center"
            >
              <Film className="h-3.5 w-3.5 text-primary" />
              <span>Switch back to CinemaOS Web Player (Instant)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
