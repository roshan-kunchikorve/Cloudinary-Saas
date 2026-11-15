import axios from "axios";

interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  transformation: string | null;
}

export interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
}

// Uploads a file straight from the browser to Cloudinary.
//   1. Ask our server for a signature (a short-lived permission slip).
//   2. Send the file to Cloudinary together with that signature.
// The big file never passes through our server, so there is no server size limit.
export async function uploadToCloudinary(
  file: File,
  type: "video" | "image",
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  const { data: signed } = await axios.post<SignedUpload>("/api/uploads/sign", {
    type,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);
  if (signed.transformation) {
    formData.append("transformation", signed.transformation);
  }

  const { data } = await axios.post<CloudinaryUploadResult>(
    signed.uploadUrl,
    formData,
    {
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    },
  );

  return data;
}
