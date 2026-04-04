"use client";
import Link from "next/link";
export function DashboardHeader() {
  return (
    <header className="p-4 border-b border-border flex items-center justify-between">
      <h1 className="text-xl font-bold">MyFeed Dashboard</h1>
      <Link href="/" className="text-xs text-text-muted hover:text-text transition-colors">Back to feeds</Link>
    </header>
  );
}
export default DashboardHeader;
