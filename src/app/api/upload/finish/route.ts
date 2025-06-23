import { NextRequest, NextResponse } from "next/server";
import { db, files, chunks } from "@/db";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const finishSchema = z.object({
  uploadId: z.string(),
  chunkUrls: z.array(z.string().url()),
  ivs: z.array(z.string()),
  filename: z.string(),
  mimeType: z.string(),
  encryptedUploadKey: z.string(),
  size: z.number().int().nonnegative(), // Add size field
});

const handler = async (request: NextRequest) => {
  const body = await request.json();
  const parsed = finishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const {
    uploadId,
    chunkUrls,
    ivs,
    filename,
    mimeType,
    encryptedUploadKey,
    size,
  } = parsed.data;

  // Store file metadata and chunks in your DB
  const file = await db
    .insert(files)
    .values({
      uuid: uploadId,
      name: filename,
      type: mimeType,
      encryption_key: encryptedUploadKey,
      size, // Store the provided size
    })
    .returning()
    .get();

  for (let i = 0; i < chunkUrls.length; i++) {
    const url = new URL(chunkUrls[i]);
    const expr = new Date(
      parseInt(url.searchParams.get("ex") ?? "", 16) * 1000
    );

    await db.insert(chunks).values({
      file_id: file.id,
      index: i,
      iv: ivs[i],
      url: chunkUrls[i],
      url_expires: expr,
    });
  }

  return NextResponse.json({
    success: true,
    url: `${new URL(request.nextUrl).origin}/file/${file.uuid}`,
  });
};

export const POST = withAuth(handler);
