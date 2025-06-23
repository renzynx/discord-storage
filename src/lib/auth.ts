import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export type AuthenticatedHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthenticatedHandler): AuthenticatedHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      // Get session from request
      const session = await getSessionFromRequest(request);

      // Check if user is authenticated
      if (!session.isLoggedIn) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // User is authenticated, proceed with the original handler
      return handler(request, context);
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      );
    }
  };
}

// For page-level authentication
export async function requireAuth() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }

  return session;
}

// Import for page components
import { getSession } from "@/lib/session";
