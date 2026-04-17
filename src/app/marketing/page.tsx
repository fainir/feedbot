import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { MARKETING_TASKS, PILLAR_META } from "@/lib/marketing-plan";
import { MarketingDashboard } from "./client";

const OWNER_EMAIL = "fainir2006@gmail.com";

export const metadata = {
  title: "Marketing — MyFeed",
  robots: { index: false, follow: false },
};

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/marketing");
  if (user.email !== OWNER_EMAIL) redirect("/");

  return <MarketingDashboard tasks={MARKETING_TASKS} pillars={PILLAR_META} />;
}
