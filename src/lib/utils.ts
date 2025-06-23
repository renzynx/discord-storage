import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
