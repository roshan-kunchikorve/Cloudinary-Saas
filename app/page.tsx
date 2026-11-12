import Link from "next/link";
import { Crop, FileDown, Sparkles } from "lucide-react";

const features = [
  {
    icon: FileDown,
    title: "Videos get smaller",
    text: "Every upload is compressed by Cloudinary. You see the original size, the new size and the space you saved.",
  },
  {
    icon: Crop,
    title: "Images fit every platform",
    text: "Pick Instagram, Twitter or Facebook. Smart crop keeps the important part of your picture in the frame.",
  },
  {
    icon: Sparkles,
    title: "AI feedback on photos",
    text: "Upload a photo, ask a question, and get a short answer. Each account has a daily limit.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Smaller videos. Right-sized images.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg opacity-80 text-balance">
          CloudMedia compresses every video you upload, shows how much space you
          saved, and resizes any picture for Instagram, Twitter and Facebook.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-up" className="btn btn-primary btn-lg">
            Create a free account
          </Link>
          <Link href="/home" className="btn btn-outline btn-lg">
            Browse the video gallery
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card border border-base-300 bg-base-100">
            <div className="card-body">
              <Icon className="h-8 w-8 text-primary" aria-hidden />
              <h2 className="card-title">{title}</h2>
              <p className="opacity-80">{text}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
