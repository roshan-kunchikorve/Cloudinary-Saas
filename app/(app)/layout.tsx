"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  ImageIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  Share2Icon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";

const sidebarItems = [
  { href: "/home", icon: LayoutDashboardIcon, label: "Videos" },
  { href: "/video-upload", icon: UploadIcon, label: "Upload video" },
  { href: "/social-share", icon: Share2Icon, label: "Social share" },
  { href: "/ai-studio", icon: SparklesIcon, label: "AI studio" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="sidebar-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={sidebarOpen}
        onChange={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <header className="w-full bg-base-200">
          <div className="navbar mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex-none lg:hidden">
              <label
                htmlFor="sidebar-drawer"
                className="btn btn-square btn-ghost drawer-button"
                aria-label="Open menu"
              >
                <MenuIcon />
              </label>
            </div>
            <div className="flex-1">
              <Link href="/" className="btn btn-ghost text-2xl font-bold tracking-tight">
                CloudMedia
              </Link>
            </div>
            <div className="flex flex-none items-center space-x-4">
              {user && (
                <>
                  <div className="avatar">
                    <div className="h-8 w-8 rounded-full">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Clerk avatar URL */}
                      <img
                        src={user.imageUrl}
                        alt={user.username || user.emailAddresses[0].emailAddress}
                      />
                    </div>
                  </div>
                  <span className="max-w-xs truncate text-sm lg:max-w-md">
                    {user.username || user.emailAddresses[0].emailAddress}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="btn btn-ghost btn-circle"
                    aria-label="Sign out"
                  >
                    <LogOutIcon className="h-6 w-6" />
                  </button>
                </>
              )}
              {isLoaded && !user && (
                <Link href="/sign-in" className="btn btn-primary btn-sm">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-grow">
          <div className="mx-auto my-8 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <div className="drawer-side">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>
        <aside className="flex h-full w-64 flex-col bg-base-200">
          <div className="flex items-center justify-center py-4">
            <ImageIcon className="h-10 w-10 text-primary" />
          </div>
          <ul className="menu w-full flex-grow p-4 text-base-content">
            {sidebarItems.map((item) => (
              <li key={item.href} className="mb-2">
                <Link
                  href={item.href}
                  className={`flex items-center space-x-4 rounded-lg px-4 py-2 ${
                    pathname === item.href ? "bg-primary text-white" : "hover:bg-base-300"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {user && (
            <div className="p-4">
              <button onClick={handleSignOut} className="btn btn-outline btn-error w-full">
                <LogOutIcon className="mr-2 h-5 w-5" />
                Sign Out
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
