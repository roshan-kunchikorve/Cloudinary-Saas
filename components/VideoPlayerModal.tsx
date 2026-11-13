"use client";

import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import Modal from "./Modal";
import type { Video } from "@/types";

interface VideoPlayerModalProps {
  video: Video | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  return (
    <Modal open={video !== null} onClose={onClose} title={video?.title ?? ""} wide>
      {video && (
        <>
          <video
            className="w-full rounded-lg bg-black"
            src={getCldVideoUrl({ src: video.publicId })}
            poster={getCldImageUrl({
              src: video.publicId,
              width: 1280,
              height: 720,
              crop: "fill",
              format: "jpg",
              quality: "auto",
              assetType: "video",
            })}
            controls
            autoPlay
          />
          {video.description && (
            <p className="mt-3 text-sm opacity-80">{video.description}</p>
          )}
        </>
      )}
      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
