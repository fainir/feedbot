"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt");

  useEffect(() => {
    if (!prompt) {
      router.replace("/");
      return;
    }

    // Create the feed
    fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: prompt.slice(0, 40),
        query_text: prompt,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const id = data.feed?.id;
        if (id) {
          fetch(`/api/feeds/${id}/refresh`, { method: "POST" }).catch(() => {});
          router.replace(`/my/${id}`);
        } else {
          router.replace("/");
        }
      })
      .catch(() => {
        router.replace("/");
      });
  }, [prompt, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-text" />
        <p className="text-sm font-medium">Creating your custom feed...</p>
      </div>
    </div>
  );
}

export default function DashboardRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg text-text">
        <Loader2 className="h-8 w-8 animate-spin text-text" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
