import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FilePropertiesDialog({
  open,
  onOpenChange,
  file,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Properties</DialogTitle>
        </DialogHeader>
        {file && (
          <div className="space-y-2 text-sm">
            <div>
              <b>Name:</b> {file.name}
            </div>
            <div>
              <b>Type:</b> {file.type}
            </div>
            <div>
              <b>Size:</b> {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <div>
              <b>Uploaded:</b> {new Date(file.created_at).toLocaleString()}
            </div>
            <div>
              <b>UUID:</b> {file.uuid}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
