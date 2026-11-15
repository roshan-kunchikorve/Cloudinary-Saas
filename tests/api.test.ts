// API tests: they call the real route handlers against a real PostgreSQL database.
// Clerk (login), Cloudinary and the AI provider are replaced with fakes.
//
// These tests only run when TEST_DATABASE_URL is set (see README, "Testing").
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;

// vi.hoisted runs before the imports below, so the app sees these test settings.
const authMock = vi.hoisted(() => {
  // Safety: these tests delete every row, so never point them at your real database.
  const testUrl = process.env.TEST_DATABASE_URL;
  if (testUrl && (testUrl === process.env.DATABASE_URL || testUrl === process.env.DIRECT_URL)) {
    throw new Error("TEST_DATABASE_URL must be a different database from DATABASE_URL.");
  }

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
  return vi.fn();
});

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai")>()),
  analyzeImage: vi.fn(),
}));

import { analyzeImage } from "@/lib/ai";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { GET as aiInfo, POST as analyze } from "@/app/api/ai-image/route";
import { POST as signUpload } from "@/app/api/uploads/sign/route";
import { GET as listVideos, POST as createVideo } from "@/app/api/videos/route";
import { DELETE as deleteVideo, PATCH as updateVideo } from "@/app/api/videos/[id]/route";
import { GET as videoStats } from "@/app/api/videos/stats/route";

const A = "user_a";
const B = "user_b";

const loginAs = (userId: string | null) => authMock.mockResolvedValue({ userId });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function request(method: string, url: string, body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let counter = 0;
function seedVideo(userId: string, overrides: Record<string, unknown> = {}) {
  counter++;
  return prisma.video.create({
    data: {
      userId,
      title: `Video ${counter}`,
      description: null,
      publicId: `cloudmedia/${userId}/videos/seed-${counter}`,
      originalSize: 4_000_000,
      compressedSize: 1_000_000,
      duration: 10,
      createdAt: new Date(2026, 0, counter), // each one a day later, so the order is clear
      ...overrides,
    },
  });
}

describe.skipIf(!TEST_DB)("API routes", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    authMock.mockReset();
    vi.mocked(analyzeImage).mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_DAILY_LIMIT;
    await prisma.video.deleteMany();
    await prisma.aiGeneration.deleteMany();
    loginAs(A);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/uploads/sign", () => {
    it("rejects logged-out users", async () => {
      loginAs(null);
      const res = await signUpload(request("POST", "/api/uploads/sign", { type: "video" }));
      expect(res.status).toBe(401);
    });

    it("signs a video upload inside the user's own folder", async () => {
      const res = await signUpload(request("POST", "/api/uploads/sign", { type: "video" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.folder).toBe("cloudmedia/user_a/videos");
      expect(body.transformation).toBe("f_mp4,q_auto");
      expect(body.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo-cloud/video/upload");

      const expected = cloudinary.utils.api_sign_request(
        { folder: body.folder, timestamp: body.timestamp, transformation: "f_mp4,q_auto" },
        "test-secret",
      );
      expect(body.signature).toBe(expected);
    });

    it("signs an image upload without compression", async () => {
      const res = await signUpload(request("POST", "/api/uploads/sign", { type: "image" }));
      const body = await res.json();

      expect(body.folder).toBe("cloudmedia/user_a/images");
      expect(body.transformation).toBeNull();
      expect(body.signature).toBe(
        cloudinary.utils.api_sign_request(
          { folder: body.folder, timestamp: body.timestamp },
          "test-secret",
        ),
      );
    });

    it("rejects an unknown type", async () => {
      const res = await signUpload(request("POST", "/api/uploads/sign", { type: "pdf" }));
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/videos", () => {
    const body = {
      publicId: "cloudmedia/user_a/videos/trip",
      title: "My trip",
      description: "Goa",
      originalSize: 8_000_000,
    };

    it("rejects logged-out users", async () => {
      loginAs(null);
      const res = await createVideo(request("POST", "/api/videos", body));
      expect(res.status).toBe(401);
    });

    it("saves the size and duration reported by Cloudinary, not by the browser", async () => {
      vi.spyOn(cloudinary.api, "resource").mockResolvedValue({ bytes: 1_000_000, duration: 12.5 });

      const res = await createVideo(request("POST", "/api/videos", body));
      const saved = await res.json();

      expect(res.status).toBe(201);
      expect(saved).toMatchObject({
        title: "My trip",
        originalSize: 8_000_000,
        compressedSize: 1_000_000,
        duration: 12.5,
        isOwner: true,
      });
      expect(saved).not.toHaveProperty("userId");

      const row = await prisma.video.findFirstOrThrow();
      expect(row.userId).toBe(A);
    });

    it("refuses a file from another user's folder", async () => {
      const resource = vi.spyOn(cloudinary.api, "resource");
      const res = await createVideo(
        request("POST", "/api/videos", { ...body, publicId: "cloudmedia/user_b/videos/trip" }),
      );

      expect(res.status).toBe(403);
      expect(resource).not.toHaveBeenCalled();
    });

    it("returns 404 when Cloudinary does not know the file", async () => {
      vi.spyOn(cloudinary.api, "resource").mockRejectedValue({ error: { http_code: 404 } });
      const res = await createVideo(request("POST", "/api/videos", body));
      expect(res.status).toBe(404);
    });

    it("returns 409 when the same video is saved twice", async () => {
      vi.spyOn(cloudinary.api, "resource").mockResolvedValue({ bytes: 1_000_000, duration: 5 });
      await createVideo(request("POST", "/api/videos", body));
      const second = await createVideo(request("POST", "/api/videos", body));
      expect(second.status).toBe(409);
    });

    it("validates the body", async () => {
      const res = await createVideo(request("POST", "/api/videos", { ...body, title: "  " }));
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/videos", () => {
    it("lets anyone browse, newest first", async () => {
      loginAs(null);
      await seedVideo(A, { title: "Old" });
      await seedVideo(B, { title: "New" });

      const res = await listVideos(request("GET", "/api/videos"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items.map((v: { title: string }) => v.title)).toEqual(["New", "Old"]);
      expect(data.items.every((v: { isOwner: boolean }) => v.isOwner === false)).toBe(true);
      expect(data.items[0]).not.toHaveProperty("userId");
    });

    it("marks the logged-in user's own videos with isOwner", async () => {
      await seedVideo(A, { title: "Mine" });
      await seedVideo(B, { title: "Theirs" });

      const data = await (await listVideos(request("GET", "/api/videos"))).json();
      const owners = Object.fromEntries(data.items.map((v: { title: string; isOwner: boolean }) => [v.title, v.isOwner]));

      expect(owners).toEqual({ Mine: true, Theirs: false });
    });

    it("needs a login for mine=true", async () => {
      loginAs(null);
      const res = await listVideos(request("GET", "/api/videos?mine=true"));
      expect(res.status).toBe(401);
    });

    it("returns only my videos for mine=true", async () => {
      await seedVideo(A, { title: "Mine" });
      await seedVideo(B, { title: "Theirs" });

      const data = await (await listVideos(request("GET", "/api/videos?mine=true"))).json();

      expect(data.total).toBe(1);
      expect(data.items[0].title).toBe("Mine");
    });

    it("searches title and description without caring about capital letters", async () => {
      await seedVideo(A, { title: "Goa Beach" });
      await seedVideo(A, { title: "Office", description: "Quarterly REVIEW" });
      await seedVideo(A, { title: "Cats" });

      const byTitle = await (await listVideos(request("GET", "/api/videos?q=goa"))).json();
      const byDescription = await (await listVideos(request("GET", "/api/videos?q=review"))).json();

      expect(byTitle.items.map((v: { title: string }) => v.title)).toEqual(["Goa Beach"]);
      expect(byDescription.items.map((v: { title: string }) => v.title)).toEqual(["Office"]);
    });

    it("paginates", async () => {
      for (let i = 0; i < 12; i++) await seedVideo(A);

      const page2 = await (await listVideos(request("GET", "/api/videos?page=2&pageSize=5"))).json();
      const page3 = await (await listVideos(request("GET", "/api/videos?page=3&pageSize=5"))).json();

      expect(page2).toMatchObject({ page: 2, pageSize: 5, total: 12, totalPages: 3 });
      expect(page2.items).toHaveLength(5);
      expect(page3.items).toHaveLength(2);
    });

    it("rejects a bad query", async () => {
      const res = await listVideos(request("GET", "/api/videos?pageSize=100"));
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/videos/:id", () => {
    it("lets the owner edit, and an empty description becomes null", async () => {
      const video = await seedVideo(A, { description: "old" });

      const res = await updateVideo(
        request("PATCH", `/api/videos/${video.id}`, { title: "Renamed", description: "" }),
        ctx(video.id),
      );
      const updated = await res.json();

      expect(res.status).toBe(200);
      expect(updated).toMatchObject({ title: "Renamed", description: null });
    });

    it("refuses another user", async () => {
      const video = await seedVideo(B);
      const res = await updateVideo(
        request("PATCH", `/api/videos/${video.id}`, { title: "Hacked" }),
        ctx(video.id),
      );

      expect(res.status).toBe(403);
      expect((await prisma.video.findUniqueOrThrow({ where: { id: video.id } })).title).not.toBe("Hacked");
    });

    it("returns 404 for an unknown id", async () => {
      const res = await updateVideo(request("PATCH", "/api/videos/nope", { title: "X" }), ctx("nope"));
      expect(res.status).toBe(404);
    });

    it("validates the title", async () => {
      const video = await seedVideo(A);
      const res = await updateVideo(
        request("PATCH", `/api/videos/${video.id}`, { title: "" }),
        ctx(video.id),
      );
      expect(res.status).toBe(400);
    });

    it("rejects logged-out users", async () => {
      loginAs(null);
      const res = await updateVideo(request("PATCH", "/api/videos/x", { title: "X" }), ctx("x"));
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/videos/:id", () => {
    it("deletes the file from Cloudinary and the row from the database", async () => {
      const video = await seedVideo(A);
      const destroy = vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" });

      const res = await deleteVideo(request("DELETE", `/api/videos/${video.id}`), ctx(video.id));

      expect(res.status).toBe(204);
      expect(destroy).toHaveBeenCalledWith(video.publicId, { resource_type: "video", invalidate: true });
      expect(await prisma.video.count()).toBe(0);
    });

    it("refuses another user and touches nothing", async () => {
      const video = await seedVideo(B);
      const destroy = vi.spyOn(cloudinary.uploader, "destroy");

      const res = await deleteVideo(request("DELETE", `/api/videos/${video.id}`), ctx(video.id));

      expect(res.status).toBe(403);
      expect(destroy).not.toHaveBeenCalled();
      expect(await prisma.video.count()).toBe(1);
    });

    it("keeps the row when Cloudinary fails, so the user can try again", async () => {
      const video = await seedVideo(A);
      vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "error" });

      const res = await deleteVideo(request("DELETE", `/api/videos/${video.id}`), ctx(video.id));

      expect(res.status).toBe(502);
      expect(await prisma.video.count()).toBe(1);
    });

    it("still removes the row when the file is already gone", async () => {
      const video = await seedVideo(A);
      vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "not found" });

      const res = await deleteVideo(request("DELETE", `/api/videos/${video.id}`), ctx(video.id));

      expect(res.status).toBe(204);
      expect(await prisma.video.count()).toBe(0);
    });
  });

  describe("GET /api/videos/stats", () => {
    it("adds up only my videos", async () => {
      await seedVideo(A, { originalSize: 6_000_000, compressedSize: 1_500_000 });
      await seedVideo(A, { originalSize: 4_000_000, compressedSize: 1_000_000 });
      await seedVideo(B, { originalSize: 9_000_000, compressedSize: 9_000_000 });

      const res = await videoStats();
      const stats = await res.json();

      expect(stats).toEqual({
        videoCount: 2,
        originalBytes: 10_000_000,
        compressedBytes: 2_500_000,
        savedBytes: 7_500_000,
        savedPercent: 75,
      });
    });

    it("returns zeros when there are no videos", async () => {
      const stats = await (await videoStats()).json();
      expect(stats).toMatchObject({ videoCount: 0, savedBytes: 0, savedPercent: 0 });
    });
  });

  describe("AI image analysis", () => {
    const body = { image: "data:image/png;base64,AAAA", prompt: "Describe it" };

    it("reports the daily limit and what is left", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.AI_DAILY_LIMIT = "3";
      await prisma.aiGeneration.create({ data: { userId: A } });

      const info = await (await aiInfo()).json();
      expect(info).toEqual({ configured: true, limit: 3, remaining: 2 });
    });

    it("switches itself off when there is no API key", async () => {
      const res = await analyze(request("POST", "/api/ai-image", body));
      expect(res.status).toBe(503);
    });

    it("rejects a bad image", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      const res = await analyze(request("POST", "/api/ai-image", { ...body, image: "data:image/gif;base64,AAAA" }));
      expect(res.status).toBe(400);
    });

    it("returns the AI answer and counts the use", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.AI_DAILY_LIMIT = "2";
      vi.mocked(analyzeImage).mockResolvedValue("A sunny beach.");

      const res = await analyze(request("POST", "/api/ai-image", body));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({ result: "A sunny beach.", remaining: 1 });
      expect(await prisma.aiGeneration.count({ where: { userId: A } })).toBe(1);
    });

    it("blocks the user after the daily limit (429)", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.AI_DAILY_LIMIT = "2";
      await prisma.aiGeneration.createMany({ data: [{ userId: A }, { userId: A }] });

      const res = await analyze(request("POST", "/api/ai-image", body));

      expect(res.status).toBe(429);
      expect(analyzeImage).not.toHaveBeenCalled();
    });

    it("does not count old uses (older than 24 hours)", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      process.env.AI_DAILY_LIMIT = "1";
      vi.mocked(analyzeImage).mockResolvedValue("ok");
      await prisma.aiGeneration.create({
        data: { userId: A, createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });

      const res = await analyze(request("POST", "/api/ai-image", body));
      expect(res.status).toBe(200);
    });

    it("does not count a failed AI call", async () => {
      process.env.OPENAI_API_KEY = "sk-test";
      vi.mocked(analyzeImage).mockRejectedValue(new Error("provider down"));

      const res = await analyze(request("POST", "/api/ai-image", body));

      expect(res.status).toBe(502);
      expect(await prisma.aiGeneration.count()).toBe(0);
    });
  });
});
