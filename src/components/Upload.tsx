"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUploadContext } from "@/hooks/useUpload";

export default function Upload({ webhooks }: { webhooks?: any[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadContext();

  // Open file dialog on button click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // When files selected, start upload for each
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      upload.startUpload(Array.from(files));
    }
  };

  return (
    <>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        disabled={upload.uploading}
        multiple
      />
      <Button onClick={handleButtonClick} disabled={upload.uploading}>
        {upload.uploading ? "Uploading..." : "Upload Files"}
      </Button>
    </>
  );
}
