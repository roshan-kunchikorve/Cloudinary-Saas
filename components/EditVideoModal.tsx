"use client";

import { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import { getErrorMessage } from "@/lib/client";
import type { Video } from "@/types";

interface EditVideoModalProps {
  video: Video | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVideoModal({ video, onClose, onSaved }: EditVideoModalProps) {
  return (
    <Modal open={video !== null} onClose={onClose} title="Edit video">
      {/* key makes the form start fresh for every video */}
      {video && <EditForm key={video.id} video={video} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function EditForm({ video, onClose, onSaved }: { video: Video; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await axios.patch(`/api/videos/${video.id}`, { title, description });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-medium">Title</span>
        <input
          className="input input-bordered w-full"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">Description</span>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={300}
        />
      </label>

      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
