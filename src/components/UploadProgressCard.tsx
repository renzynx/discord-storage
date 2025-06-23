"use client";

import { useUploadContext } from "@/hooks/useUpload";
import { X } from "lucide-react";

export default function UploadProgressCard() {
  const upload = useUploadContext();
  if (!upload.uploadingFiles?.length) return null;
  const allDone = upload.uploadingFiles.every((f: any) => f.done);
  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-xs">
      <div className="shadow-lg border-card rounded-lg bg-card">
        <div className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
          <span className="text-base font-semibold">Uploading Files</span>
          <button
            className="text-lg p-1 rounded hover:bg-muted disabled:opacity-50"
            onClick={upload.resetUpload}
            disabled={!allDone}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {upload.uploadingFiles?.map((f: any) => (
              <div key={f.name} className="border rounded p-2 bg-muted">
                <div className="truncate text-xs font-medium">{f.name}</div>
                <div className="w-full bg-muted rounded h-2 mt-1 mb-1">
                  <div
                    className="bg-primary h-2 rounded"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
                <div className="text-xs flex justify-between mt-1">
                  <span>
                    {f.uploaded.toLocaleString()} / {f.total.toLocaleString()}{" "}
                    bytes
                  </span>
                  <span>
                    {f.done ? (f.error ? "Error" : "Done") : `${f.progress}%`}
                  </span>
                </div>
                {f.status && <div className="text-xs mt-1">{f.status}</div>}
                {f.error && (
                  <div className="text-xs text-destructive mt-1">{f.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
