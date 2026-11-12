"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { Search, Upload } from "lucide-react";
import DeleteVideoModal from "@/components/DeleteVideoModal";
import EditVideoModal from "@/components/EditVideoModal";
import StatsBar from "@/components/StatsBar";
import Toast, { type ToastState } from "@/components/Toast";
import VideoCard from "@/components/VideoCard";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import { fetcher } from "@/lib/client";
import type { Video, VideoListResponse, VideoStats } from "@/types";

const PAGE_SIZE = 9;

type Tab = "all" | "mine";

// Waits until the user stops typing, so we do not search on every key press
function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function HomePage() {
  const { isSignedIn } = useUser();

  const [tab, setTab] = useState<Tab>("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  const [playing, setPlaying] = useState<Video | null>(null);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const search = useDebouncedValue(searchText.trim(), 400);

  // The address we ask. SWR loads it, caches it and reloads it when it changes.
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search) params.set("q", search);
  if (tab === "mine") params.set("mine", "true");

  const { data, error, isLoading, mutate } = useSWR<VideoListResponse>(
    `/api/videos?${params}`,
    fetcher,
    { keepPreviousData: true },
  );

  // Space-saved numbers are only for the "My videos" tab
  const { data: stats, mutate: refreshStats } = useSWR<VideoStats>(
    tab === "mine" ? "/api/videos/stats" : null,
    fetcher,
  );

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  async function handleSaved() {
    setEditing(null);
    showToast("success", "Video updated");
    await mutate(); // load the list again
  }

  async function handleDeleted() {
    setDeleting(null);
    showToast("success", "Video deleted");

    // If we deleted the last video on this page, go back one page
    if (data && data.items.length === 1 && page > 1) setPage(page - 1);

    await mutate();
    await refreshStats();
  }

  const videos = data?.items ?? [];
  const isSearching = search.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Videos</h1>
        {isSignedIn && (
          <Link href="/video-upload" className="btn btn-primary">
            <Upload size={18} aria-hidden />
            Upload video
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isSignedIn && (
          <div role="tablist" className="tabs tabs-box">
            <button
              role="tab"
              className={`tab ${tab === "all" ? "tab-active" : ""}`}
              onClick={() => changeTab("all")}
            >
              All videos
            </button>
            <button
              role="tab"
              className={`tab ${tab === "mine" ? "tab-active" : ""}`}
              onClick={() => changeTab("mine")}
            >
              My videos
            </button>
          </div>
        )}

        <label className="input input-bordered flex w-full max-w-sm items-center gap-2">
          <Search size={16} aria-hidden />
          <input
            type="search"
            className="grow"
            placeholder="Search by title or description"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setPage(1);
            }}
            aria-label="Search videos"
          />
        </label>
      </div>

      {tab === "mine" && <StatsBar stats={stats} />}

      {error && (
        <div role="alert" className="alert alert-error">
          Could not load videos. Please refresh the page.
        </div>
      )}

      {/* First load: grey placeholder cards */}
      {isLoading && !data && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-72 w-full" />
          ))}
        </div>
      )}

      {data && videos.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-4 text-lg opacity-70">
            {isSearching
              ? `No videos match "${search}".`
              : tab === "mine"
                ? "You have not uploaded any videos yet."
                : "No videos yet."}
          </p>
          {isSignedIn && !isSearching && (
            <Link href="/video-upload" className="btn btn-primary">
              Upload your first video
            </Link>
          )}
        </div>
      )}

      {videos.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={setPlaying}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <div className="join">
            <button
              className="btn join-item"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              className="btn join-item"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.totalPages}
            >
              Next
            </button>
          </div>
          <span className="text-sm opacity-70">
            Page {data.page} of {data.totalPages} ({data.total} videos)
          </span>
        </div>
      )}

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
      <EditVideoModal video={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      <DeleteVideoModal video={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
      <Toast toast={toast} />
    </div>
  );
}
