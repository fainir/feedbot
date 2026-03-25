import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — FeedBot",
  description: "Your personalized feeds, all in one place.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg">{children}</main>
  );
}
