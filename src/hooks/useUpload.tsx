"use client";

import { useState, useRef, createContext, useContext } from "react";
import { importKey, encryptChunk } from "@/lib/crypto.client";
import { WebhookQueue } from "@/lib/webhooks";
import { CHUNK_SIZE } from "@/lib/constants";

class Semaphore {
  private tasks: (() => void)[] = [];
  private count: number;
  constructor(count: number) {
    this.count = count;
  }
  async acquire() {
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>((resolve) => this.tasks.push(resolve));
  }
  release() {
    this.count++;
    if (this.tasks.length > 0) {
      this.count--;
      const next = this.tasks.shift();
      if (next) next();
    }
  }
}

export const UploadContext = createContext<any>(null);
export function useUploadContext() {
  return useContext(UploadContext);
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const upload = useUpload();
  return (
    <UploadContext.Provider value={upload}>{children}</UploadContext.Provider>
  );
}

export default function useUpload(webhooks?: any[]) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    setProgress(0);
    setStatus("");
    setError("");
    setUploading(false);
    setUploaded(0);
    setTotal(0);
    setUploadingFiles([]);
  };

  async function startUpload(files: File[] | File) {
    const filesArr = Array.isArray(files) ? files : [files];
    const newUploadingFiles = filesArr.map((file) => ({
      name: file.name,
      total: file.size,
      uploaded: 0,
      progress: 0,
      done: false,
      error: null,
      status: "Starting...",
    }));
    setUploadingFiles((prev: any[]) => [...prev, ...newUploadingFiles]);
    for (let fileIdx = 0; fileIdx < filesArr.length; fileIdx++) {
      const file = filesArr[fileIdx];
      setError("");
      setStatus("");
      setProgress(0);
      setUploading(true);
      try {
        // 0. Get webhooks
        let webhooksList = webhooks;
        if (!webhooksList || webhooksList.length === 0) {
          setStatus("Fetching webhooks...");
          const webhooksRes = await fetch("/api/webhooks");
          if (!webhooksRes.ok) throw new Error("Failed to fetch webhooks");
          webhooksList = await webhooksRes.json();
        }
        if (!Array.isArray(webhooksList) || webhooksList.length === 0)
          throw new Error("No webhooks configured");
        // Create a queue per webhook
        const webhookQueues = webhooksList.map(
          (w: any) => new WebhookQueue(w.url)
        );
        // 1. Start upload session
        const startRes = await fetch("/api/upload/start", { method: "POST" });
        const { uploadId, uploadKey, encryptedUploadKey } =
          await startRes.json();
        if (!uploadId || !uploadKey || !encryptedUploadKey)
          throw new Error("Failed to start upload");
        // 2. Split file into 5MB chunks
        const chunkSize = CHUNK_SIZE;
        const chunks: Blob[] = [];
        for (let i = 0; i < file.size; i += chunkSize) {
          chunks.push(file.slice(i, i + chunkSize));
        }
        // 3. Encrypt each chunk in browser
        const chunkUrls: string[] = [];
        const ivs: string[] = [];
        const key = await importKey(uploadKey);
        // Progress tracking
        const uploadedBytes = new Array(chunks.length).fill(0);
        const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
        setTotal(totalSize);
        function updateProgressWrapper() {
          const totalUploaded = uploadedBytes.reduce((a, b) => a + b, 0);
          setUploaded(totalUploaded);
          setProgress(Math.round((totalUploaded / totalSize) * 100));
          setUploadingFiles((files: any[]) =>
            files.map((f, idx) =>
              idx === fileIdx
                ? {
                    ...f,
                    uploaded: totalUploaded,
                    progress: Math.round((totalUploaded / totalSize) * 100),
                  }
                : f
            )
          );
        }
        // Round robin upload, concurrent
        let webhookIndex = 0;
        const uploadChunk = async (i: number) => {
          const chunkArrayBuffer = await chunks[i].arrayBuffer();
          const { encryptedData, iv } = await encryptChunk(
            chunkArrayBuffer,
            key
          );
          ivs[i] = iv;
          const queue = webhookQueues[webhookIndex % webhookQueues.length];
          webhookIndex++;
          // Wrap uploadToDiscord with rate limit tracking and retry
          const sendWithRateLimit = async () => {
            let lastError: any = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                return await new Promise<string>((resolve, reject) => {
                  const form = new FormData();
                  const fileObj = new File(
                    [encryptedData],
                    window.crypto.randomUUID()
                  );
                  form.append("file", fileObj);
                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", queue.url, true);
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      uploadedBytes[i] = event.loaded;
                      updateProgressWrapper();
                    }
                  };
                  xhr.onload = () => {
                    queue.updateRateLimit(xhr);
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const data = JSON.parse(xhr.responseText);
                        uploadedBytes[i] = chunks[i].size;
                        updateProgressWrapper();
                        resolve(data.attachments?.[0]?.url || "");
                      } catch {
                        reject(new Error("Invalid Discord response"));
                      }
                    } else if (xhr.status === 429) {
                      // Rate limited, wait and retry
                      queue.updateRateLimit(xhr);
                      setTimeout(() => reject(new Error("Rate limited")), 1000);
                    } else {
                      reject(new Error("Failed to upload chunk to Discord"));
                    }
                  };
                  xhr.onerror = () =>
                    reject(new Error("Failed to upload chunk to Discord"));
                  xhr.send(form);
                });
              } catch (err) {
                lastError = err;
                // Wait a bit before retrying
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              }
            }
            throw lastError || new Error("Failed to upload after retries");
          };
          chunkUrls[i] = await queue.send(sendWithRateLimit);
        };

        const concurrency = 3;
        const semaphore = new Semaphore(concurrency);
        await Promise.all(
          chunks.map(async (_, i) => {
            await semaphore.acquire();
            try {
              await uploadChunk(i);
            } finally {
              semaphore.release();
            }
          })
        );
        // 5. Finish upload
        setStatus("Finalizing upload...");
        const finishRes = await fetch("/api/upload/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId,
            chunkUrls,
            ivs,
            filename: file.name,
            mimeType: file.type,
            encryptedUploadKey,
            size: file.size,
          }),
        });
        if (!finishRes.ok) throw new Error("Failed to finalize upload");
        setUploadingFiles((files: any[]) =>
          files.map((f, idx) =>
            idx === fileIdx ? { ...f, done: true, status: "Done" } : f
          )
        );
        setStatus("Upload complete!");
      } catch (err: any) {
        setError(err.message || "Upload failed");
        setStatus("");
        setUploadingFiles((files: any[]) =>
          files.map((f, idx) =>
            idx === fileIdx
              ? { ...f, error: err.message || "Upload failed", done: true }
              : f
          )
        );
      } finally {
        setUploading(false);
      }
    }
  }

  return {
    progress,
    status,
    error,
    uploading,
    uploaded,
    total,
    startUpload,
    resetUpload,
    fileInputRef,
    uploadingFiles,
  };
}
