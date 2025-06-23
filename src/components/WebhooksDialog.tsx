import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function WebhooksDialog({
  open,
  setOpen,
  webhooks,
  setWebhooks,
  trigger,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  webhooks: any[];
  setWebhooks: (webhooks: any[]) => void;
  trigger?: React.ReactNode;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookError, setWebhookError] = useState("");
  const [webhookSuccess, setWebhookSuccess] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAddWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookError("");
    setWebhookSuccess("");
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setWebhookSuccess("Webhook added successfully!");
        setWebhookUrl("");
        setWebhooks([...webhooks, { url: webhookUrl }]);
      } else {
        setWebhookError(data.error || "Failed to add webhook");
      }
    } catch {
      setWebhookError("Network error. Please try again.");
    }
  }

  async function handleDeleteWebhook(url: string) {
    setDeleting(url);
    try {
      const res = await fetch("/api/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        setWebhooks(webhooks.filter((w) => w.url !== url));
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Discord Webhooks</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddWebhook} className="space-y-4">
          <Input
            type="url"
            placeholder="Discord Webhook URL"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />
          {webhookError && (
            <div className="text-destructive text-sm">{webhookError}</div>
          )}
          {webhookSuccess && (
            <div className="text-green-600 text-sm">{webhookSuccess}</div>
          )}
          <Button type="submit" className="w-full">
            Add Webhook
          </Button>
        </form>
        <div className="mt-6">
          <div className="font-semibold mb-2">Current Webhooks</div>
          <ul className="space-y-2">
            {webhooks.length === 0 && (
              <li className="text-xs text-muted-foreground">
                No webhooks configured.
              </li>
            )}
            {webhooks.map((w) => (
              <li
                key={w.url}
                className="flex items-center justify-between gap-2 text-xs border rounded px-2 py-1"
              >
                <span className="truncate max-w-xs" title={w.url}>
                  {w.url}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleting === w.url}
                  onClick={() => handleDeleteWebhook(w.url)}
                >
                  {deleting === w.url ? "Deleting..." : "Delete"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
