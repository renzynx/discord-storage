// app/api/webhooks/route.ts

import { db, webhooks } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const webhookSchema = z.object({
  url: z.string().url({ message: "Invalid URL format." }),
});

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = webhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { url } = validation.data;

    // Check if the webhook URL already exists
    const existingWebhook = await db.query.webhooks.findFirst({
      where: (webhooks, { eq }) => eq(webhooks.url, url),
    });

    if (existingWebhook) {
      return NextResponse.json(
        { error: "This webhook URL already exists." },
        { status: 409 }
      );
    }

    // Create the new webhook
    const newWebhook = await db
      .insert(webhooks)
      .values({
        url,
      })
      .returning({ url: webhooks.url })
      .get();
    return NextResponse.json(newWebhook, { status: 201 });
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

// Export the protected handler wrapped with withAuth
export const POST = withAuth(postHandler);

// GET - List all webhooks
async function getHandler(request: NextRequest) {
  try {
    const allWebhooks = await db.query.webhooks.findMany({
      orderBy: (webhooks, { desc }) => [desc(webhooks.id)],
    });

    return NextResponse.json(allWebhooks);
  } catch (error) {
    console.error("Webhooks fetch error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

// DELETE - Delete a webhook by URL (passed in request body)
async function deleteHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required for deletion." },
        { status: 400 }
      );
    }

    // Check if webhook exists
    const existingWebhook = await db.query.webhooks.findFirst({
      where: (webhooks, { eq }) => eq(webhooks.url, url),
    });

    if (!existingWebhook) {
      return NextResponse.json(
        { error: "Webhook not found." },
        { status: 404 }
      );
    }

    // Delete the webhook
    await db.delete(webhooks).where(eq(webhooks.url, url));

    return NextResponse.json({ message: "Webhook deleted successfully." });
  } catch (error) {
    console.error("Webhook deletion error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const DELETE = withAuth(deleteHandler);
