import { describe, expect, it } from "vitest";
import { ownsPublicId, userFolder } from "./ownership";

describe("userFolder", () => {
  it("builds one folder per user and type", () => {
    expect(userFolder("user_1", "video")).toBe("cloudmedia/user_1/videos");
    expect(userFolder("user_1", "image")).toBe("cloudmedia/user_1/images");
  });
});

describe("ownsPublicId", () => {
  it("accepts a file inside the user's own folder", () => {
    expect(ownsPublicId("cloudmedia/user_1/videos/abc", "user_1", "video")).toBe(true);
  });

  it("rejects another user's file", () => {
    expect(ownsPublicId("cloudmedia/user_2/videos/abc", "user_1", "video")).toBe(false);
  });

  it("rejects the wrong type of file", () => {
    expect(ownsPublicId("cloudmedia/user_1/images/abc", "user_1", "video")).toBe(false);
  });

  it("rejects a folder that only starts with the same letters", () => {
    expect(ownsPublicId("cloudmedia/user_1/videos2/abc", "user_1", "video")).toBe(false);
  });

  it("rejects path tricks", () => {
    expect(
      ownsPublicId("cloudmedia/user_1/videos/../../user_2/videos/abc", "user_1", "video"),
    ).toBe(false);
  });
});
