export type UploadType = "video" | "image";

// Every user uploads into their own Cloudinary folder, for example:
//   cloudmedia/user_123/videos
export function userFolder(userId: string, type: UploadType): string {
  return `cloudmedia/${userId}/${type}s`;
}

// A publicId belongs to a user only if it sits inside that user's folder.
export function ownsPublicId(
  publicId: string,
  userId: string,
  type: UploadType,
): boolean {
  if (publicId.includes("..") || publicId.includes("\\")) return false;
  return publicId.startsWith(`${userFolder(userId, type)}/`);
}
