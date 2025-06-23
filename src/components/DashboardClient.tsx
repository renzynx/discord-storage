"use client";

import FilesTable from "@/components/FilesTable";
import LogoutButton from "@/components/LogoutButton";
import Upload from "@/components/Upload";
import WebhooksDialog from "@/components/WebhooksDialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export default function DashboardClient({ session }: { session: any }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    async function fetchWebhooks() {
      try {
        const res = await fetch("/api/webhooks");
        if (res.ok) {
          const data = await res.json();
          setWebhooks(data);
        }
      } catch {}
    }

    fetchWebhooks();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 pb-20 gap-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex">
          <div />
          <div className="flex items-center justify-between flex-1 gap-4">
            <span className="text-sm">Welcome, {session.userId}!</span>
            <LogoutButton />
          </div>
        </CardHeader>
      </Card>
      <div className="mx-auto py-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Files Dashboard</h1>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">
              Webhooks: {webhooks.length}
            </span>
            <Upload webhooks={webhooks} />
            <WebhooksDialog
              open={webhookOpen}
              setOpen={setWebhookOpen}
              webhooks={webhooks}
              setWebhooks={setWebhooks}
              trigger={<Button variant="outline">Manage Webhooks</Button>}
            />
          </div>
        </div>

        <FilesTable onUploadClick={() => setUploadOpen(true)} />
      </div>
    </div>
  );
}
