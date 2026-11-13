"use client";

import { useState } from "react";
import axios from "axios";
import Modal from "./Modal";
import { getErrorMessage } from "@/lib/client";
import type { Video } from "@/types";

interface DeleteVideoModalProps {
  video: Video | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteVideoModal({ video, onClose, onDeleted }: DeleteVideoModalProps) {
  return (
    <Modal open={video !== null} onClose={onClose} title="Delete this video?">
      {video && <DeleteForm key={video.id} video={video} onClose={onClose} onDeleted={onDeleted} />}
    </Modal>
  );
}

function DeleteForm({ video, onClose, onDeleted }: { video: Video; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await axios.delete(`/api/videos/${video.id}`);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <p>
        <strong>{video.title}</strong> will be removed from Cloudinary and from your library.
        This cannot be undone.
      </p>

      {error && (
        <p className="mt-3 text-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose} disabled={deleting}>
          Cancel
        </button>
        <button type="button" className="btn btn-error" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete video"}
        </button>
      </div>
    </>
  );
}
