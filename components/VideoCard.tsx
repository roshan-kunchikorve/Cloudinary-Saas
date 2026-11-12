"use client";

import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import {
  Clock,
  Download,
  FileDown,
  FileUp,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { compressionPercent, formatBytes, formatDuration } from "@/lib/format";
import type { Video } from "@/types";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
}

export default function VideoCard({ video, onPlay, onEdit, onDelete }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // None of these files exist: Cloudinary builds them from the publicId when asked.
  const thumbnailUrl = getCldImageUrl({
    src: video.publicId,
    width: 400,
    height: 225,
    crop: "fill",
    gravity: "auto", // Cloudinary's smart crop keeps the interesting part
    format: "jpg",
    quality: "auto",
    assetType: "video",
  });

  // A short highlight clip, shown while the mouse is over the card
  const previewUrl = getCldVideoUrl({
    src: video.publicId,
    width: 400,
    height: 225,
    rawTransformations: ["e_preview:duration_15:max_seg_9:min_seg_dur_1"],
  });

  // fl_attachment tells Cloudinary to send the file as a download
  const fileName = video.title.replace(/[^a-z0-9_-]+/gi, "_") || "video";
  const downloadUrl = getCldVideoUrl({
    src: video.publicId,
    rawTransformations: [`fl_attachment:${fileName}`],
  });

  const percentSaved = compressionPercent(video.originalSize, video.compressedSize);

  return (
    <article
      className="card bg-base-100 shadow-md transition-shadow hover:shadow-xl"
      onMouseEnter={() => {
        setIsHovered(true);
        setPreviewError(false);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        className="relative block aspect-video w-full cursor-pointer overflow-hidden rounded-t-2xl"
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title}`}
      >
        {isHovered && !previewError ? (
          <video
            src={previewUrl}
            autoPlay
            muted
            loop
            className="h-full w-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary already resizes this thumbnail */}
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/20 hover:opacity-100">
          <Play className="h-12 w-12 text-white drop-shadow" aria-hidden />
        </span>

        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center rounded-lg bg-base-100/80 px-2 py-1 text-sm">
            <Clock size={14} className="mr-1" aria-hidden />
            {formatDuration(video.duration)}
          </span>
        )}
      </button>

      <div className="card-body gap-2 p-4">
        <h2 className="card-title text-lg">{video.title}</h2>
        <p className="line-clamp-2 min-h-10 text-sm opacity-70">
          {video.description ?? "No description"}
        </p>
        <p className="text-xs opacity-60">Uploaded {dayjs(video.createdAt).fromNow()}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FileUp size={18} className="text-primary" aria-hidden />
            <div>
              <div className="font-semibold">Original</div>
              <div>{formatBytes(video.originalSize)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileDown size={18} className="text-secondary" aria-hidden />
            <div>
              <div className="font-semibold">Compressed</div>
              <div>{formatBytes(video.compressedSize)}</div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm font-semibold">
            Saved <span className="text-accent">{percentSaved}%</span>
          </div>

          <div className="flex items-center gap-1">
            {video.isOwner && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  onClick={() => onEdit(video)}
                  aria-label={`Edit ${video.title}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square text-error"
                  onClick={() => onDelete(video)}
                  aria-label={`Delete ${video.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <a
              href={downloadUrl}
              className="btn btn-primary btn-sm btn-square"
              aria-label={`Download ${video.title}`}
            >
              <Download size={16} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
