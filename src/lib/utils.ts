import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { db } from "@/db";
import { chunks } from "@/db/schema";
import { eq } from "drizzle-orm";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper functions for formatting
export function formatSpeed(bytesPerSec: number) {
  if (bytesPerSec > 1024 * 1024)
    return `${(bytesPerSec / 1024 / 1024).toFixed(2)} MB/s`;
  if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
  return `${Math.round(bytesPerSec)} B/s`;
}

export function formatEta(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export async function refreshChunkUrls(chunksToRefresh: any[]) {
  const urls = chunksToRefresh.map((c) => c.url);
  const payload = {
    method: "POST",
    headers: {
      Authorization: process.env.DISCORD_TOKEN || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ attachment_urls: urls }),
  };
  const res = await fetch(
    "https://discord.com/api/v9/attachments/refresh-urls",
    payload
  );
  if (!res.ok) throw new Error("Failed to refresh Discord URLs");

  const json = await res.json();

  if (Array.isArray(json?.refreshed_urls)) {
    for (let i = 0; i < json.refreshed_urls.length; i++) {
      const refreshedObj = json.refreshed_urls[i];
      const originalUrl = refreshedObj.original;
      const refreshedUrl = refreshedObj.refreshed;
      const idx = urls.indexOf(originalUrl);
      if (idx === -1) continue; // skip if not found
      const params = new URL(refreshedUrl).searchParams;
      const expr = new Date(parseInt(params.get("ex") ?? "", 16) * 1000);
      // Update in DB
      await db
        .update(chunks)
        .set({ url: refreshedUrl, url_expires: expr })
        .where(eq(chunks.url, originalUrl));
      // Also update in-memory
      chunksToRefresh[idx].url = refreshedUrl;
      chunksToRefresh[idx].url_expires = expr;
    }
  }
  return json.refreshed_urls;
}

export function encodeFilename(filename: string) {
  // Remove or replace problematic characters and encode for RFC 5987
  const sanitized = filename.replace(/[^ -\x7F\w\s.-]/g, "_"); // Replace non-ASCII chars with underscore
  const encoded = encodeURIComponent(filename);
  // Use RFC 5987 format for better Unicode support
  return `filename*=UTF-8''${encoded}; filename="${sanitized}"`;
}
