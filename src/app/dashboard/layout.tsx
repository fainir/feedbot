import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - MyFeed",
  description: "Your personalized feeds, all in one place.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="min-h-screen bg-bg">{children}</main>
  );
}
