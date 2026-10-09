import React from 'react';
import { Star } from 'lucide-react';

export interface MediaRatingBadgeProps {
  rating: number; // e.g. 8.5
  voteCount?: string | number;
  certification?: string;
  className?: string;
}

/**
 * Reusable cinema rating badge showing vote score, star rating, and age rating.
 */
export const MediaRatingBadge: React.FC<MediaRatingBadgeProps> = ({
  rating,
  voteCount,
  certification,
  className = '',
}) => {
  const ratingOutOfTen = rating > 10 ? rating / 10 : rating;
  const formattedScore = ratingOutOfTen.toFixed(1);
  const matchPercent = Math.round(ratingOutOfTen * 10);

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${className}`}>
      {/* Primary score badge */}
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-400 border border-amber-500/30">
        <Star className="h-3.5 w-3.5 fill-amber-400" />
        <span>{formattedScore}</span>
      </span>

      {/* Match percentage */}
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-400 border border-emerald-500/30 font-bold">
        {matchPercent}% Match
      </span>

      {/* Content Rating / Certification */}
      {certification && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80 border border-white/15 uppercase tracking-wider text-[10px]">
          {certification}
        </span>
      )}

      {/* Optional Vote count */}
      {voteCount && (
        <span className="text-zinc-400 text-[11px]">
          ({typeof voteCount === 'number' ? voteCount.toLocaleString() : voteCount} votes)
        </span>
      )}
    </div>
  );
};
