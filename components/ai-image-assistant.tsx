"use client";

import { useState } from "react";

export default function AIImageAssistant() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [prompt, setPrompt] = useState(
    "Describe this product and suggest improvements to its photo.",
  );
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    setFile(null);
    setPreview("");
    setResult("");
    setError("");

    if (!selected) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(selected.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }

    if (selected.size > 4 * 1024 * 1024) {
      setError("Choose an image smaller than 4 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function analyzeImage() {
    if (!file || !prompt.trim()) {
      setError("Choose an image and enter a prompt.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Could not read image."));
          }
        };

        reader.onerror = () => reject(new Error("Could not read image."));

        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/ai-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-3xl font-bold">AI Image Studio</h1>

      <p className="text-gray-600">Upload an image and ask AI to analyze it.</p>

      <label className="block font-medium">
        Select an image
        <input
          className="mt-2 block w-full"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
        />
      </label>

      {preview && (
        <img
          src={preview}
          alt="Selected image preview"
          className="max-h-96 rounded-xl object-contain"
        />
      )}

      <label className="block font-medium">
        What should AI do?
        <textarea
          className="mt-2 w-full rounded-lg border p-3"
          rows={3}
          maxLength={500}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>

      <button
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        onClick={analyzeImage}
        disabled={!file || loading || !prompt.trim()}
      >
        {loading ? "Analyzing..." : "Analyze image"}
      </button>

      {error && (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-2 rounded-xl border p-4">
          <h2 className="text-xl font-semibold">AI Results</h2>
          <p className="whitespace-pre-wrap">{result}</p>
        </section>
      )}
    </main>
  );
}
