import { db, files } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const handler = async (request: NextRequest) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 });
  }
  // Find file by uuid
  const file = await db.select().from(files).where(eq(files.uuid, id)).get();
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  // Delete file (cascades to chunks)
  await db.delete(files).where(eq(files.uuid, id));
  return NextResponse.json({ success: true });
};

export const DELETE = withAuth(handler);
