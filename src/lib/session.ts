import { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export interface SessionData {
  isLoggedIn: boolean;
  userId?: string;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.MASTER_KEY!,
  cookieName: "sid",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "strict",
  },
};

export async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return defaultSession;
  }

  return session;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionData> {
  const response = new Response();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return defaultSession;
  }

  return session;
}
