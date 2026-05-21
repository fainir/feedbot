"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // updateViaCache: "none" stops the browser from serving the SW script
    // itself from HTTP cache, so deploys with sw.js changes activate the
    // new worker on the user's next navigation instead of waiting hours.
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {
        // SW registration failed — non-critical, the app still works.
      });
  }, []);

  return null;
}
