import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Validate password
    if (password !== process.env.PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create a mutable response object
    const response = NextResponse.json({ success: true });
    // Get session
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    // Set session data
    session.isLoggedIn = true;
    session.userId = "admin"; // Since it's single user

    // Save session (sets cookie on response)
    await session.save();

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    // Get session
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    // Clear session
    session.destroy();

    await session.save();
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
