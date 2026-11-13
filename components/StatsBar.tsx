import { formatBytes } from "@/lib/format";
import type { VideoStats } from "@/types";

// Three numbers about the logged-in user's library
export default function StatsBar({ stats }: { stats: VideoStats | undefined }) {
  const hasVideos = Boolean(stats && stats.videoCount > 0);

  return (
    <div className="stats stats-vertical w-full border border-base-300 sm:stats-horizontal">
      <div className="stat">
        <div className="stat-title">Your videos</div>
        <div className="stat-value">{stats ? stats.videoCount : "-"}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Space saved</div>
        <div className="stat-value text-primary">
          {stats ? formatBytes(stats.savedBytes) : "-"}
        </div>
        <div className="stat-desc">
          {hasVideos ? `${stats?.savedPercent}% smaller than the originals` : "Upload a video to see this"}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Storage used</div>
        <div className="stat-value">{stats ? formatBytes(stats.compressedBytes) : "-"}</div>
        <div className="stat-desc">
          {hasVideos ? `Originals were ${formatBytes(stats?.originalBytes ?? 0)}` : ""}
        </div>
      </div>
    </div>
  );
}
