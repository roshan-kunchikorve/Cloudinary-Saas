"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/client";
import { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_MB } from "@/lib/limits";
import { uploadToCloudinary } from "@/lib/upload";

type Stage = "idle" | "uploading" | "compressing" | "saving";

export default function VideoUploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const busy = stage !== "idle";

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setFile(null);
    setError("");

    if (!selected) return;

    if (!selected.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }

    if (selected.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`Please choose a video smaller than ${MAX_VIDEO_SIZE_MB} MB.`);
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !title.trim()) return;

    setError("");
    setProgress(0);
    setStage("uploading");

    try {
      // Step 1: browser -> Cloudinary (Cloudinary compresses it while saving)
      const uploaded = await uploadToCloudinary(file, "video", (percent) => {
        setProgress(percent);
        if (percent === 100) setStage("compressing");
      });

      // Step 2: tell our server. It checks the file with Cloudinary and saves a row.
      setStage("saving");
      await axios.post("/api/videos", {
        publicId: uploaded.public_id,
        title,
        description,
        originalSize: file.size,
      });

      router.push("/home");
    } catch (err) {
      setError(getErrorMessage(err));
      setStage("idle");
    }
  }

  const statusText =
    stage === "uploading"
      ? `Uploading... ${progress}%`
      : stage === "compressing"
        ? "Cloudinary is compressing your video..."
        : stage === "saving"
          ? "Saving..."
          : "";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-3xl font-bold">Upload a video</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="input input-bordered w-full"
            maxLength={100}
            disabled={busy}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">Description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="textarea textarea-bordered w-full"
            rows={3}
            maxLength={300}
            disabled={busy}
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-medium">
            Video file (up to {MAX_VIDEO_SIZE_MB} MB)
          </span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="file-input file-input-bordered w-full"
            disabled={busy}
            required
          />
        </label>

        {busy && (
          <div aria-live="polite">
            <progress
              className="progress progress-primary w-full"
              value={stage === "uploading" ? progress : undefined}
              max={100}
            />
            <p className="mt-1 text-sm opacity-80">{statusText}</p>
          </div>
        )}

        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !file || !title.trim()}
        >
          {busy ? "Please wait..." : "Upload video"}
        </button>
      </form>
    </div>
  );
}
