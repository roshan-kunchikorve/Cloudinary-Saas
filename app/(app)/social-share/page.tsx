"use client";

import { useState } from "react";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import { getErrorMessage } from "@/lib/client";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from "@/lib/limits";
import { uploadToCloudinary } from "@/lib/upload";

const socialFormats = {
  "Instagram Square (1:1)": { width: 1080, height: 1080, aspectRatio: "1:1" },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350, aspectRatio: "4:5" },
  "Twitter Post (16:9)": { width: 1200, height: 675, aspectRatio: "16:9" },
  "Twitter Header (3:1)": { width: 1500, height: 500, aspectRatio: "3:1" },
  "Facebook Cover (205:78)": { width: 820, height: 312, aspectRatio: "205:78" },
};

type SocialFormat = keyof typeof socialFormats;

export default function SocialSharePage() {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>("Instagram Square (1:1)");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState("");

  // The preview is "loading" until the picture for the current choice has loaded
  const previewKey = `${publicId}-${selectedFormat}`;
  const [loadedKey, setLoadedKey] = useState("");
  const isTransforming = loadedKey !== previewKey;

  const format = socialFormats[selectedFormat];

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Please choose an image smaller than ${MAX_IMAGE_SIZE_MB} MB.`);
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);

    try {
      const uploaded = await uploadToCloudinary(file, "image", setUploadPercent);
      setPublicId(uploaded.public_id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  // The same picture, cut to the exact size, as a download link
  const downloadName = selectedFormat.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const downloadUrl = publicId
    ? getCldImageUrl({
        src: publicId,
        width: format.width,
        height: format.height,
        crop: "fill",
        gravity: "auto",
        format: "png",
        rawTransformations: [`fl_attachment:${downloadName}`],
      })
    : "";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-center text-3xl font-bold">Social media image creator</h1>

      <div className="card border border-base-300">
        <div className="card-body">
          <h2 className="card-title mb-2">Upload an image</h2>

          <label className="block">
            <span className="mb-1 block font-medium">
              Choose an image (up to {MAX_IMAGE_SIZE_MB} MB)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="file-input file-input-bordered file-input-primary w-full"
              disabled={isUploading}
            />
          </label>

          {isUploading && (
            <progress className="progress progress-primary mt-2 w-full" value={uploadPercent} max={100} />
          )}

          {error && (
            <p className="mt-2 text-error" role="alert">
              {error}
            </p>
          )}

          {publicId && (
            <div className="mt-6">
              <h2 className="card-title mb-2">Choose a size</h2>
              <select
                className="select select-bordered w-full"
                value={selectedFormat}
                onChange={(event) => setSelectedFormat(event.target.value as SocialFormat)}
                aria-label="Social media size"
              >
                {Object.keys(socialFormats).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <div className="relative mt-6">
                <h3 className="mb-2 text-lg font-semibold">Preview</h3>
                <div className="flex justify-center">
                  {isTransforming && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/60">
                      <span className="loading loading-spinner loading-lg" />
                    </div>
                  )}
                  <CldImage
                    width={format.width}
                    height={format.height}
                    src={publicId}
                    sizes="100vw"
                    alt="Resized preview"
                    crop="fill"
                    aspectRatio={format.aspectRatio}
                    gravity="auto"
                    onLoad={() => setLoadedKey(previewKey)}
                  />
                </div>
              </div>

              <div className="card-actions mt-6 justify-end">
                <a href={downloadUrl} className="btn btn-primary">
                  Download {format.width} x {format.height}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
