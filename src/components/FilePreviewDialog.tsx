import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    name: string;
    type: string;
    uuid: string;
  } | null;
}

function isImage(type: string) {
  return type.startsWith("image/");
}
function isVideo(type: string) {
  return type.startsWith("video/");
}
function isAudio(type: string) {
  return type.startsWith("audio/");
}

export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  open,
  onOpenChange,
  file,
}) => {
  if (!file) return null;
  const url = `/api/files/${file.uuid}/download`;
  let content = null;
  if (isImage(file.type)) {
    content = (
      <img
        src={url}
        alt={file.name}
        className="max-h-[60vh] max-w-full mx-auto"
      />
    );
  } else if (isVideo(file.type)) {
    content = (
      <video src={url} controls className="max-h-[60vh] max-w-full mx-auto" />
    );
  } else if (isAudio(file.type)) {
    content = <audio src={url} controls className="w-full" />;
  } else {
    content = (
      <div className="text-center text-muted-foreground">
        No preview available for this file type.
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview: {file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          {content}
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="mt-4">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
