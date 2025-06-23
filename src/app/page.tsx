import { PasswordPrompt } from "@/components/PasswordPrompt";
import { getSession } from "@/lib/session";
import DashboardClient from "@/components/DashboardClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discord Storage",
};

export default async function Home() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return <PasswordPrompt />;
  }

  const sessionData = session
    ? { isLoggedIn: true, userId: session.userId }
    : { isLoggedIn: false, userId: null };

  return <DashboardClient session={sessionData} />;
}
