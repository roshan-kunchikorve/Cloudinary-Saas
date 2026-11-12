"use client";

import { useState } from "react";
import axios from "axios";
import useSWR from "swr";
import { fetcher, getErrorMessage } from "@/lib/client";

interface AiInfo {
  configured: boolean;
  limit: number;
  remaining: number;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_PROMPT = "Describe this photo and suggest three ways to improve it.";

export default function AIImageAssistant() {
  // Is AI switched on, and how many analyses are left today?
  const { data: info, mutate } = useSWR<AiInfo>("/api/ai-image", fetcher);

  const [image, setImage] = useState(""); // the picture as a data URL
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImage("");
    setResult("");
    setError("");

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Choose an image smaller than 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setError("Could not read the image.");
    reader.readAsDataURL(file);
  }

  async function analyzeImage() {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const { data } = await axios.post<{ result: string }>("/api/ai-image", { image, prompt });
      setResult(data.result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      mutate(); // refresh "analyses left today"
    }
  }

  const switchedOff = info !== undefined && !info.configured;
  const limitReached = info !== undefined && info.configured && info.remaining === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">AI studio</h1>
        <p className="mt-1 opacity-70">Upload a photo and ask the AI a question about it.</p>
      </div>

      {switchedOff && (
        <div role="status" className="alert alert-info">
          AI analysis is switched off on this server because no AI key is set.
        </div>
      )}

      {info?.configured && (
        <p className="text-sm opacity-70">
          {info.remaining} of {info.limit} analyses left in the last 24 hours.
        </p>
      )}

      <label className="block">
        <span className="mb-1 block font-medium">Choose an image (PNG, JPEG or WebP, up to 4 MB)</span>
        <input
          className="file-input file-input-bordered w-full"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
        />
      </label>

      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img src={image} alt="Selected image preview" className="max-h-96 rounded-xl object-contain" />
        </>
      )}

      <label className="block">
        <span className="mb-1 block font-medium">What should the AI do?</span>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          maxLength={500}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>

      <button
        className="btn btn-primary"
        onClick={analyzeImage}
        disabled={!image || loading || !prompt.trim() || switchedOff || limitReached}
      >
        {loading ? "Analyzing..." : "Analyze image"}
      </button>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-2 rounded-xl border border-base-300 p-4">
          <h2 className="text-xl font-semibold">AI result</h2>
          <p className="whitespace-pre-wrap">{result}</p>
        </section>
      )}
    </div>
  );
}
