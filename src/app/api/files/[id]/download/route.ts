import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, chunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptUploadKey } from "@/lib/crypto.server";

// GET /api/files/[id]/stream
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // No auth check for stream download

  // Use uuid for file lookup
  const fileUuid = params.id;
  // Get file metadata
  const file = await db
    .select()
    .from(files)
    .where(eq(files.uuid, fileUuid))
    .get();

  if (!file) {
    return new NextResponse("File not found", { status: 404 });
  }

  // Get all chunks for this file
  const fileChunks = await db
    .select()
    .from(chunks)
    .where(eq(chunks.file_id, file.id))
    .all();
  if (!fileChunks || fileChunks.length === 0) {
    return new NextResponse("No chunks found", { status: 404 });
  }

  // Get the decrypted upload key (Buffer)
  const uploadKey = decryptUploadKey(file.encryption_key);

  // Sort chunks by index
  fileChunks.sort((a, b) => a.index - b.index);

  // Stream the chunks with a small concurrency window (e.g., 3)
  const CONCURRENCY = 3;
  const stream = new ReadableStream({
    async start(controller) {
      const crypto = await import("crypto");
      let idx = 0;
      while (idx < fileChunks.length) {
        // Prepare a window of up to CONCURRENCY chunks
        const windowChunks = fileChunks.slice(idx, idx + CONCURRENCY);
        // Download and decrypt in parallel
        const results = await Promise.all(
          windowChunks.map(async (chunk) => {
            try {
              const res = await fetch(chunk.url);
              if (!res.ok)
                throw new Error(`Failed to fetch chunk: ${chunk.url}`);
              const encrypted = Buffer.from(await res.arrayBuffer());
              const iv = Buffer.isBuffer(chunk.iv)
                ? chunk.iv
                : Buffer.from(chunk.iv, "base64");
              const authTag = encrypted.slice(encrypted.length - 16);
              const ciphertext = encrypted.slice(0, encrypted.length - 16);
              const decipher = crypto.createDecipheriv(
                "aes-256-gcm",
                uploadKey,
                iv
              );
              decipher.setAuthTag(authTag);
              const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
              ]);
              return { decrypted, error: null };
            } catch (e) {
              return { decrypted: null, error: e };
            }
          })
        );
        // Enqueue in order, stop on error
        for (const [i, result] of results.entries()) {
          if (result.error) {
            controller.error(
              new Error(`Failed to decrypt chunk: ${windowChunks[i].url}`)
            );
            return;
          }
          controller.enqueue(result.decrypted);
        }
        idx += CONCURRENCY;
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename=\"${file.name}\"`,
      "Content-Length": file.size.toString(), // Use the size from file metadata
    },
  });
}
