import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, chunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptUploadKey } from "@/lib/crypto.server";
import { refreshChunkUrls, encodeFilename } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fileUuid = (await params).id;

  const file = await db
    .select()
    .from(files)
    .where(eq(files.uuid, fileUuid))
    .get();

  if (!file) {
    return new NextResponse("File not found", { status: 404 });
  }

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
  const CONCURRENCY = 5;

  const now = Date.now();
  // Find chunks with expired or soon-to-expire URLs (5 min buffer)
  const EXPIRE_BUFFER_MS = 5 * 60 * 1000;

  const expiredChunks = fileChunks.filter(
    (c) =>
      c.url_expires &&
      new Date(c.url_expires).getTime() < now + EXPIRE_BUFFER_MS
  );

  if (expiredChunks.length > 0) {
    // Refresh in batches of 10
    for (let i = 0; i < expiredChunks.length; i += 10) {
      const batch = expiredChunks.slice(i, i + 10);
      const refreshed = await refreshChunkUrls(batch);
      // Update fileChunks with new urls and expiries
      for (let j = 0; j < batch.length; j++) {
        const idx = fileChunks.findIndex((c) => c.id === batch[j].id);
        if (idx !== -1) {
          fileChunks[idx].url = refreshed[j].url;
          fileChunks[idx].url_expires = refreshed[j].url_expires;
        }
      }
    }
  }

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
              const iv: Buffer = (() => {
                if (typeof chunk.iv === "string") {
                  const buf = Buffer.from(chunk.iv, "base64");
                  if (buf.length !== 12) {
                    throw new Error(
                      `IV for chunk is not 12 bytes after base64 decode: got ${buf.length}`
                    );
                  }
                  return buf;
                } else if (
                  chunk.iv &&
                  typeof (chunk.iv as any).length === "number"
                ) {
                  // Defensive: handle Buffer or Uint8Array
                  if ((chunk.iv as any).length !== 12) {
                    throw new Error(
                      `IV buffer for chunk is not 12 bytes: got ${
                        (chunk.iv as any).length
                      }`
                    );
                  }
                  return chunk.iv as Buffer;
                } else {
                  throw new Error(
                    `IV is not a string or Buffer: ${JSON.stringify(chunk.iv)}`
                  );
                }
              })();

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
              // Attach IV and error message for easier debugging
              return {
                decrypted: null,
                error: new Error(
                  `Failed to decrypt chunk: ${chunk.url}\nIV: ${JSON.stringify(
                    chunk.iv
                  )}\nError: ${e instanceof Error ? e.message : e}`
                ),
              };
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
      "Content-Type": file.type || "application/octet-stream",
      "Content-Disposition": `attachment; ${encodeFilename(file.name)}`,
      "Content-Length": file.size.toString(),
    },
  });
}
