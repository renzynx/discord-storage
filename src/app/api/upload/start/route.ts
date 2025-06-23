import { NextRequest, NextResponse } from "next/server";
import { encryptUploadKey } from "@/lib/crypto.server";
import { randomBytes, randomUUID } from "crypto";
import { withAuth } from "@/lib/auth";

const handler = async (request: NextRequest) => {
  // 1. Generate a random 32-byte upload key
  const uploadKey = randomBytes(32);
  // 2. Encrypt the upload key with the server's master key
  const encryptedUploadKey = encryptUploadKey(uploadKey);
  // 3. Generate a unique uploadId
  const uploadId = randomUUID();

  // Optionally: store uploadId and encryptedUploadKey in DB here

  return NextResponse.json({
    uploadId,
    uploadKey: uploadKey.toString("base64"),
    encryptedUploadKey,
  });
};

export const POST = withAuth(handler);
