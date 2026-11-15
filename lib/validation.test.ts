import { describe, expect, it } from "vitest";
import {
  analyzeImageSchema,
  createVideoSchema,
  listVideosSchema,
  signUploadSchema,
  updateVideoSchema,
} from "./validation";

describe("createVideoSchema", () => {
  const valid = {
    publicId: "cloudmedia/user_1/videos/abc",
    title: "  My trip  ",
    description: "",
    originalSize: 5_000_000,
  };

  it("trims the title and turns an empty description into null", () => {
    const result = createVideoSchema.parse(valid);
    expect(result.title).toBe("My trip");
    expect(result.description).toBeNull();
  });

  it("rejects a missing title", () => {
    expect(createVideoSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejects a title that is too long", () => {
    expect(createVideoSchema.safeParse({ ...valid, title: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects a file that is bigger than the limit", () => {
    const result = createVideoSchema.safeParse({ ...valid, originalSize: 51 * 1024 * 1024 });
    expect(result.success).toBe(false);
  });
});

describe("updateVideoSchema", () => {
  it("accepts a new title and description", () => {
    const result = updateVideoSchema.parse({ title: "New", description: "About it" });
    expect(result).toEqual({ title: "New", description: "About it" });
  });
});

describe("listVideosSchema", () => {
  it("fills in defaults", () => {
    expect(listVideosSchema.parse({})).toEqual({ page: 1, pageSize: 9, mine: false });
  });

  it("reads numbers and mine from the query string", () => {
    const result = listVideosSchema.parse({ page: "2", pageSize: "6", q: " cat ", mine: "true" });
    expect(result).toEqual({ page: 2, pageSize: 6, q: "cat", mine: true });
  });

  it("rejects a page size that is too big", () => {
    expect(listVideosSchema.safeParse({ pageSize: "100" }).success).toBe(false);
  });

  it("rejects page 0", () => {
    expect(listVideosSchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("signUploadSchema", () => {
  it("only allows video or image", () => {
    expect(signUploadSchema.safeParse({ type: "video" }).success).toBe(true);
    expect(signUploadSchema.safeParse({ type: "pdf" }).success).toBe(false);
  });
});

describe("analyzeImageSchema", () => {
  it("accepts a PNG data URL and a prompt", () => {
    const result = analyzeImageSchema.safeParse({
      image: "data:image/png;base64,AAAA",
      prompt: "Describe it",
    });
    expect(result.success).toBe(true);
  });

  it("rejects other file types", () => {
    const result = analyzeImageSchema.safeParse({
      image: "data:image/gif;base64,AAAA",
      prompt: "Describe it",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty prompt", () => {
    const result = analyzeImageSchema.safeParse({
      image: "data:image/png;base64,AAAA",
      prompt: "   ",
    });
    expect(result.success).toBe(false);
  });
});
