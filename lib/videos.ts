import type { Video as VideoRow } from "./generated/prisma/client";
import type { Video } from "@/types";

// Turns a database row into what the browser receives.
// We never send userId. The browser only gets isOwner, decided here on the server.
export function toVideoDto(row: VideoRow, viewerId: string | null): Video {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    publicId: row.publicId,
    originalSize: row.originalSize,
    compressedSize: row.compressedSize,
    duration: row.duration,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isOwner: viewerId !== null && row.userId === viewerId,
  };
}
