import axios from "axios";

// SWR calls this to load data, for example fetcher("/api/videos?page=1")
export const fetcher = <T>(url: string) =>
  axios.get<T>(url).then((response) => response.data);

// Reads the { "error": "..." } message our API sends (or Cloudinary's),
// and falls back to a friendly text.
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error;
    if (typeof apiError === "string") return apiError;
    if (typeof apiError?.message === "string") return apiError.message;
  }
  return error instanceof Error ? error.message : fallback;
}
