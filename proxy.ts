import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Pages anyone can open (the video gallery is public)
const isPublicPage = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/home",
]);

// The only API route open to everyone: GET /api/videos (browsing)
const isPublicApi = createRouteMatcher(["/api/videos"]);

// In Next.js 16 this file is called proxy.ts (it used to be middleware.ts).
// It runs before every request. Each API route still checks auth() itself,
// so a mistake here can never expose a protected route.
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = new URL(req.url);
  const isApiRequest = pathname.startsWith("/api");

  // Logged-in users do not need the landing, sign-in or sign-up pages
  if (userId && isPublicPage(req) && pathname !== "/home") {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (!userId) {
    if (isApiRequest) {
      // API callers get JSON, never an HTML sign-in page
      const isOpen = req.method === "GET" && isPublicApi(req);
      if (!isOpen) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Please sign in to continue." },
          { status: 401 },
        );
      }
      return;
    }

    // Pages that are not public go to sign-in
    if (!isPublicPage(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
