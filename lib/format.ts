// Small helpers that turn raw numbers into text for the screen.

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${Math.round(value * 10) / 10} ${units[unit]}`;
}

// How much smaller the video became, as a whole percent (never below 0).
export function compressionPercent(original: number, compressed: number): number {
  if (original <= 0) return 0;
  return Math.max(0, Math.round((1 - compressed / original) * 100));
}

// 75.4 seconds -> "1:15"
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
