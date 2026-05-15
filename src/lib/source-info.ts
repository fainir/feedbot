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

export function cleanSummary(text: string, title?: string): string {
  // Strip template syntax entirely
  if (/\{\{|\$json\.|<%=|%>/.test(text)) return "";

  let clean = decodeEntities(
    text
      .replace(/Continue reading on [^»\n]+[»…]?/gi, "")
      .replace(/Read more on [^\n]+/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .replace(/submitted by\s+\/u\/\w+/gi, "")
      .replace(/\[link\]/gi, "")
      .replace(/\[comments\]/gi, "")
      .replace(/Article URL: https?:\/\/\S+/g, "")
      .replace(/Comments URL: https?:\/\/\S+/g, "")
      .replace(/Points: \d+ # Comments: \d+/g, "")
      .replace(/Photo:\s*[^\n]{0,50}$/i, "")
      .replace(/^Introduction\s*$/i, "")
      .replace(/^Abstract\s*$/i, "")
      .replace(/^By:\s*[^\n]{0,60}$/i, "")
      .replace(/^Written by\s*[^\n]{0,60}$/i, "")
      .trim()
  );

  // If summary starts with the title, strip the title portion
  if (title) {
    const cleanedTitle = decodeEntities(title).trim();
    if (clean === cleanedTitle) return "";
    if (clean.startsWith(cleanedTitle)) {
      clean = clean.slice(cleanedTitle.length).replace(/^[\s:—\-–]+/, "").trim();
    }
  }

  return clean;
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
  // Medium subdomains → "Medium"
  if (/\.medium\.com|^medium\.com/i.test(raw)) return "Medium";
  // Domain-based cleanup
  if (/news\.google\.com/i.test(raw)) return "News";
  if (/en\.wikipedia\.org/i.test(raw)) return "Wikipedia";
  if (/sciencedaily|Latest Science News/i.test(raw)) return "ScienceDaily";
  if (/businessinsider|All Content from Business/i.test(raw)) return "Business Insider";
  if (/siliconvalleygradient/i.test(raw)) return "SV Gradient";
  if (/infosecwriteups/i.test(raw)) return "InfoSec";
  if (/osintteam/i.test(raw)) return "OSINT Team";
  if (/theblock\.co/i.test(raw)) return "The Block";
  if (/electrek/i.test(raw)) return "Electrek";
  if (/lifehacker/i.test(raw)) return "Lifehacker";
  if (/arstechnica/i.test(raw)) return "Ars Technica";
  if (/theverge/i.test(raw)) return "The Verge";
  if (/pcgamer/i.test(raw)) return "PC Gamer";
  if (/gamespot/i.test(raw)) return "GameSpot";
  if (/kotaku/i.test(raw)) return "Kotaku";
  if (/theguardian/i.test(raw)) return "The Guardian";
  if (/rockpapershotgun|Rock Paper Shotgun/i.test(raw)) return "RPS";
  if (/variety/i.test(raw)) return "Variety";
  if (/spacenews/i.test(raw)) return "SpaceNews";
  if (/espn/i.test(raw)) return "ESPN";
  if (/ai\.gopubby|pub\.towardsai|ai\.plainenglish/i.test(raw)) return "Medium";
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

/**
 * Google News RSS strips the real publisher and reports source as "Google
 * News" / "news.google.com". The actual outlet usually sits at the end of
 * the headline as " - Publisher". Pull it out so the chip says "CNBC"
 * instead of a generic "News".
 */
export function extractTitleSource(title: string | undefined | null): string | null {
  if (!title) return null;
  // Match the trailing " - Publisher" (separators: hyphen, en-dash, em-dash, vertical bar).
  // Publisher must be 2-40 chars, no trailing punctuation, no digits-only.
  const m = title.match(/[-–—|]\s+([A-Za-z][A-Za-z0-9 .'&!]{1,40})\s*$/);
  if (!m) return null;
  const name = m[1].trim();
  // Reject things that look like sentence endings rather than publishers.
  if (/^(the|a|an|and|or|but|with|for|in|on|of|to)$/i.test(name)) return null;
  if (name.split(/\s+/).length > 5) return null;
  return name;
}

export function getSourceInfo(raw: string, title?: string): { name: string; icon: string; color: string } {
  const s = raw.toLowerCase();
  const cleaned = cleanSourceDisplay(raw);
  if (s.includes("hacker news") || s.includes("hnrss"))
    return { name: "Hacker News", icon: "https://news.ycombinator.com/favicon.ico", color: "bg-orange-500/10 text-orange-400" };
  if (s.includes("reddit") || s.startsWith("r/") || s.includes("everything science") || s.includes("the community for") || s.includes("top scoring links"))
    return { name: cleaned, icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png", color: "bg-orange-600/10 text-orange-300" };
  if (s.includes("medium"))
    return { name: "Medium", icon: "https://cdn-static-1.medium.com/_/fp/icons/Medium-Avatar-500x500.svg", color: "bg-text/10 text-text" };
  if (s.includes("dev community") || s.includes("dev.to"))
    return { name: "DEV", icon: "https://dev.to/favicon.ico", color: "bg-indigo-500/10 text-indigo-400" };
  if (s.includes("ars technica"))
    return { name: "Ars Technica", icon: "https://cdn.arstechnica.net/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("the verge"))
    return { name: "The Verge", icon: "https://www.theverge.com/favicon.ico", color: "bg-purple-500/10 text-purple-400" };
  if (s.includes("techcrunch"))
    return { name: "TechCrunch", icon: "https://techcrunch.com/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("bloomberg"))
    return { name: "Bloomberg", icon: "https://assets.bwbx.io/s3/javelin/public/hub/images/favicon-black-63fe0cd722.png", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("entrepreneur"))
    return { name: "Entrepreneur", icon: "https://www.entrepreneur.com/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("phys.org"))
    return { name: "Phys.org", icon: "https://phys.org/favicon.ico", color: "bg-cyan-500/10 text-cyan-400" };
  if (s.includes("nature"))
    return { name: "Nature", icon: "https://www.nature.com/favicon.ico", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("sciencedaily"))
    return { name: "ScienceDaily", icon: "https://www.sciencedaily.com/favicon.ico", color: "bg-teal-500/10 text-teal-400" };
  if (s.includes("bbc"))
    return { name: "BBC", icon: "https://static.files.bbci.co.uk/core/website/assets/static/icons/favicon/news.ico", color: "bg-red-600/10 text-red-400" };
  if (s.includes("reuters"))
    return { name: "Reuters", icon: "https://www.reuters.com/favicon.ico", color: "bg-orange-500/10 text-orange-400" };
  if (s.includes("al jazeera") || s.includes("aljazeera"))
    return { name: "Al Jazeera", icon: "https://www.aljazeera.com/favicon.ico", color: "bg-amber-500/10 text-amber-400" };
  if (s.includes("space.com") || s.includes("latest from space"))
    return { name: "Space.com", icon: "https://www.space.com/favicon.ico", color: "bg-indigo-500/10 text-indigo-400" };
  if (s.includes("ign"))
    return { name: "IGN", icon: "https://www.ign.com/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("wired"))
    return { name: "Wired", icon: "https://www.wired.com/favicon.ico", color: "bg-text/10 text-text" };
  if (s.includes("forbes"))
    return { name: "Forbes", icon: "https://www.forbes.com/favicon.ico", color: "bg-blue-800/10 text-blue-300" };
  if (s.includes("decrypt"))
    return { name: "Decrypt", icon: "https://decrypt.co/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("coindesk"))
    return { name: "CoinDesk", icon: "https://www.coindesk.com/favicon.ico", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("youtube"))
    return { name: cleaned, icon: "https://www.youtube.com/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("sciencedaily") || s.includes("latest science news"))
    return { name: "ScienceDaily", icon: "https://www.sciencedaily.com/favicon.ico", color: "bg-teal-500/10 text-teal-400" };
  if (s.includes("businessinsider") || s.includes("all content from business"))
    return { name: "Business Insider", icon: "https://www.businessinsider.com/favicon.ico", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("pcgamer"))
    return { name: "PC Gamer", icon: "https://www.pcgamer.com/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("gamespot"))
    return { name: "GameSpot", icon: "https://www.gamespot.com/favicon.ico", color: "bg-yellow-500/10 text-yellow-400" };
  if (s.includes("kotaku"))
    return { name: "Kotaku", icon: "https://kotaku.com/favicon.ico", color: "bg-text/10 text-text" };
  if (s.includes("theguardian") || s.includes("guardian"))
    return { name: "The Guardian", icon: "https://www.theguardian.com/favicon.ico", color: "bg-blue-600/10 text-blue-400" };
  if (s.includes("lifehacker"))
    return { name: "Lifehacker", icon: "https://lifehacker.com/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("electrek"))
    return { name: "Electrek", icon: "https://electrek.co/favicon.ico", color: "bg-green-500/10 text-green-400" };
  if (s.includes("wikipedia"))
    return { name: "Wikipedia", icon: "https://en.wikipedia.org/favicon.ico", color: "bg-text/10 text-text" };
  if (s.includes("variety"))
    return { name: "Variety", icon: "https://variety.com/favicon.ico", color: "bg-red-500/10 text-red-400" };
  if (s.includes("krebsonsecurity"))
    return { name: "Krebs", icon: "", color: "bg-red-500/10 text-red-400" };
  if (s.includes("bleepingcomputer"))
    return { name: "BleepingComputer", icon: "", color: "bg-blue-500/10 text-blue-400" };
  if (s.includes("darkreading"))
    return { name: "Dark Reading", icon: "", color: "bg-purple-500/10 text-purple-400" };
  if (s.includes("techfundingnews"))
    return { name: "TechFunding", icon: "", color: "bg-green-500/10 text-green-400" };
  if (s.includes("runnersworld") || s.includes("runner"))
    return { name: "Runner's World", icon: "", color: "bg-yellow-500/10 text-yellow-400" };
  if (
    s.includes("google news") ||
    s.includes("- google") ||
    s.includes("news.google") ||
    s.includes("artificial intelligence") ||
    s.includes("machine learning") ||
    s.includes("big tech") ||
    s.includes("startup funding") ||
    s.includes("software engineering") ||
    s.includes("scientific discoveries")
  ) {
    // Google News hides the real publisher — pull it from the headline if we can.
    const fromTitle = extractTitleSource(title);
    if (fromTitle) {
      // Recurse into the known-publisher table using the extracted name so we
      // pick up a branded color/icon if there's one for it.
      const better = getSourceInfo(fromTitle);
      if (better.icon || better.color !== "bg-text/5 text-text-muted") return better;
      return { name: fromTitle, icon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(fromTitle.toLowerCase().replace(/[^a-z0-9]/g,""))}.com&sz=32`, color: "bg-text/5 text-text" };
    }
    return { name: "News", icon: "https://news.google.com/favicon.ico", color: "bg-blue-500/10 text-blue-400" };
  }
  // Fallback: use Google Favicons API to get icon from source domain
  return { name: cleaned, icon: "", color: "bg-text/5 text-text-muted" };
}

/**
 * Get favicon URL for any source, with Google Favicons API as fallback.
 * Use this in components to always show an icon.
 */
export function getSourceFavicon(source: string, articleUrl?: string): string {
  const info = getSourceInfo(source);
  if (info.icon) return info.icon;
  // Try to extract domain from article URL
  if (articleUrl) {
    try {
      const domain = new URL(articleUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {}
  }
  // Try to extract domain from source name
  const s = source.toLowerCase();
  if (s.includes(".")) {
    return `https://www.google.com/s2/favicons?domain=${s}&sz=32`;
  }
  return "";
}

/**
 * Medium's `cdn-images-1.medium.com/max/<size>/<id>` URLs respond with a 301
 * to `/v2/resize:fit:<size>/<id>`. Rewriting here saves a round-trip on every
 * article-card image (visible in network panel as 301 followed by 200).
 *
 * Also strips a known-bad fallback: tiny favicon sources that arrive as
 * article images turn into broken cover tiles.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  let u = url;
  u = u.replace(
    /^https:\/\/cdn-images-1\.medium\.com\/max\/(\d+)\//,
    "https://cdn-images-1.medium.com/v2/resize:fit:$1/",
  );
  return u;
}

export function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
