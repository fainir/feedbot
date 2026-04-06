export function decodeEntities(text: string): string {
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el)
    return text
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  el.innerHTML = text;
  return el.value;
}

export function cleanSummary(text: string): string {
  return decodeEntities(
    text
      .replace(/Continue reading on [^»]+»/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .replace(/^(submitted by \/u\/\w+\s*\[link\]\s*\[comments\])/i, "")
      .replace(/Article URL: https?:\/\/\S+/g, "")
      .replace(/Comments URL: https?:\/\/\S+/g, "")
      .replace(/Points: \d+ # Comments: \d+/g, "")
      .trim()
  );
}

export function cleanTitle(title: string): string {
  return decodeEntities(
    title
      .replace(
        /\s*[-–|]\s*(Google News|Bloomberg\.com|Bioengineer\.org|Pulse 2\.0|technologymagazine\.com|Yahoo Finance|ADWEEK|TradingView|SpaceNews|Entrepreneur|Washington Technology|Sports Video Group|Stock Titan|Physics World|Focus2Move|KIMT|E3-Magazin|Global Design News|Community Impact \| News|Ocean News & Technology|EMJ|Professional Carwash Magazine|EquiManagement|Black PR Wire|carwash\.com|The Cannata Report -).*$/i,
        ""
      )
      .trim()
  );
}

export function cleanSourceDisplay(raw: string): string {
  if (/top scoring links|^r\/|\/r\//i.test(raw)) {
    const match = raw.match(/\/r\/(\w+)/i) || raw.match(/^r\/(\w+)/i);
    if (match) return "r/" + match[1];
    const colonMatch = raw.match(/top scoring links\s*:\s*(.+)/i);
    if (colonMatch) return "r/" + colonMatch[1].trim();
    return "Reddit";
  }
  const KNOWN: Record<string, string> = {
    "Hacker News: Front Page": "Hacker News",
    "Hacker News: Newest": "Hacker News",
    "DEV Community": "DEV Community",
  };
  if (KNOWN[raw]) return KNOWN[raw];
  let name = raw.split(/\s+[-–]\s+|\s+\|\s+|\s+::\s+/)[0].trim();
  if (name.length > 30) name = name.slice(0, 27) + "...";
  return name;
}

export function getSourceInfo(raw: string): { name: string; icon: string; color: string } {
  const s = raw.toLowerCase();
  const cleaned = cleanSourceDisplay(raw);
  if (s.includes("hacker news") || s.includes("hnrss"))
    return { name: "Hacker News", icon: "https://news.ycombinator.com/favicon.ico", color: "bg-orange-500/10 text-orange-400" };
  if (s.includes("reddit") || s.startsWith("r/") || s.includes("everything science") || s.includes("the community for") || s.includes("top scoring links"))
    return { name: cleaned, icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png", color: "bg-orange-600/10 text-orange-300" };
  if (s.includes("medium"))
    return { name: "Medium", icon: "https://cdn-static-1.medium.com/_/fp/icons/Medium-Avatar-500x500.svg", color: "bg-white/10 text-white" };
  if (s.includes("dev community") || s.includes("dev.to"))
    return { name: "DEV", icon: "https://dev.to/favicon.ico", color: "bg-indigo-500/10 text-indigo-400" };
  if (s.includes("ars technica"))
    return { name: "Ars Technica", icon: "https://cdn.arstechnica.net/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("the verge"))
    return { name: "The Verge", icon: "https://www.theverge.com/favicon.ico", color: "bg-purple-500/10 text-purple-400" };
  if (s.includes("techcrunch"))
    return { name: "TechCrunch", icon: "https://techcrunch.com/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("bloomberg"))
    return { name: "Bloomberg", icon: "", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("entrepreneur"))
    return { name: "Entrepreneur", icon: "", color: "bg-red-500/10 text-red-400" };
  if (s.includes("phys.org"))
    return { name: "Phys.org", icon: "", color: "bg-cyan-500/10 text-cyan-400" };
  if (s.includes("nature"))
    return { name: "Nature", icon: "", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("sciencedaily"))
    return { name: "ScienceDaily", icon: "", color: "bg-teal-500/10 text-teal-400" };
  if (
    s.includes("google news") ||
    s.includes("- google") ||
    s.includes("artificial intelligence") ||
    s.includes("machine learning") ||
    s.includes("big tech") ||
    s.includes("startup funding") ||
    s.includes("software engineering") ||
    s.includes("scientific discoveries")
  )
    return { name: "News", icon: "", color: "bg-blue-500/10 text-blue-400" };
  return { name: cleaned, icon: "", color: "bg-text/5 text-text-muted" };
}

export function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
