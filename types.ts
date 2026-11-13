// What the browser receives from the API (see lib/videos.ts).
export interface Video {
  id: string;
  title: string;
  description: string | null;
  publicId: string;
  originalSize: number; // bytes before compression
  compressedSize: number; // bytes after compression
  duration: number; // seconds
  createdAt: string;
  updatedAt: string;
  isOwner: boolean; // true when the logged-in user uploaded this video
}

export interface VideoListResponse {
  items: Video[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VideoStats {
  videoCount: number;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedPercent: number;
}
