import { describe, expect, it } from "vitest";
import { compressionPercent, formatBytes, formatDuration } from "./format";

describe("formatBytes", () => {
  it("shows small sizes in bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("converts to KB, MB and GB with at most one decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
  });
});

describe("compressionPercent", () => {
  it("returns the percent saved", () => {
    expect(compressionPercent(10_000_000, 2_500_000)).toBe(75);
  });

  it("never goes below zero when the file got bigger", () => {
    expect(compressionPercent(1_000, 2_000)).toBe(0);
  });

  it("does not divide by zero", () => {
    expect(compressionPercent(0, 0)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats seconds as minutes:seconds", () => {
    expect(formatDuration(75.4)).toBe("1:15");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("handles negative input", () => {
    expect(formatDuration(-3)).toBe("0:00");
  });
});
