import RssParser from "rss-parser";
import { getServiceClient } from "@/lib/supabase";
import type { SearchPlan } from "@/lib/prompt-intelligence";

const rssParser = new RssParser({
  timeout: 10_000,
  headers: {
    "User-Agent": "MyFeed/1.0 (RSS Aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: { item: [["source", "gnSource"]] },
});

interface RawArticle {
  title: string;
  url: string;
  summary: string;
  source: string;
  image_url: string | null;
  category: string;
  published_at: string;
}

// ─── TIER 1: High-quality curated sources (always scanned) ───
// No Reddit — Reddit discussions are low-quality primary sources; they surface via per-feed scans.
const GLOBAL_SOURCES: { url: string; category: string }[] = [
  // ── Tech ──
  { url: "https://hnrss.org/frontpage", category: "technology" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", category: "technology" },
  { url: "https://www.theverge.com/rss/index.xml", category: "technology" },
  { url: "https://www.wired.com/feed/rss", category: "technology" },
  { url: "https://www.technologyreview.com/feed/", category: "technology" },
  { url: "https://medium.com/feed/tag/technology", category: "technology" },

  // ── AI & ML ──
  { url: "https://the-decoder.com/feed/", category: "ai" },
  { url: "https://medium.com/feed/tag/artificial-intelligence", category: "ai" },
  { url: "https://medium.com/feed/tag/machine-learning", category: "ai" },
  { url: "https://dev.to/feed/tag/ai", category: "ai" },
  { url: "http://arxiv.org/rss/cs.AI", category: "ai" },
  { url: "https://venturebeat.com/category/ai/feed/", category: "ai" },

  // ── Startups ──
  { url: "https://news.google.com/rss/search?q=startup+funding+round&hl=en-US&gl=US&ceid=US:en", category: "startups" },
  { url: "https://hnrss.org/newest?q=funding+startup+launch", category: "startups" },
  { url: "https://techcrunch.com/category/startups/feed/", category: "startups" },
  { url: "https://medium.com/feed/tag/startup", category: "startups" },

  // ── Programming & Dev ──
  { url: "https://dev.to/feed", category: "programming" },
  { url: "https://medium.com/feed/tag/programming", category: "programming" },
  { url: "https://hnrss.org/newest?q=programming+developer+tool", category: "programming" },
  { url: "https://medium.com/feed/tag/software-engineering", category: "programming" },
  { url: "https://medium.com/feed/tag/web-development", category: "programming" },
  { url: "https://dev.to/feed/tag/typescript", category: "programming" },
  { url: "https://dev.to/feed/tag/rust", category: "programming" },
  { url: "https://dev.to/feed/tag/golang", category: "programming" },
  { url: "https://lobste.rs/rss", category: "programming" },
  { url: "https://dev.to/feed/tag/webdev", category: "programming" },
  { url: "https://github.com/trending.atom", category: "programming" },

  // ── Science ──
  { url: "https://news.google.com/rss/search?q=scientific+discovery+research+breakthrough&hl=en-US&gl=US&ceid=US:en", category: "science" },
  { url: "https://www.nature.com/nature.rss", category: "science" },
  { url: "https://www.sciencedaily.com/rss/all.xml", category: "science" },
  { url: "https://phys.org/rss-feed/", category: "science" },
  { url: "https://www.newscientist.com/feed/home/", category: "science" },

  // ── Business & Finance ──
  { url: "https://news.google.com/rss/search?q=business+economy+market&hl=en-US&gl=US&ceid=US:en", category: "business" },
  { url: "https://feeds.bloomberg.com/markets/news.rss", category: "business" },
  { url: "https://www.forbes.com/innovation/feed2", category: "business" },
  { url: "https://www.businessinsider.com/rss", category: "business" },
  { url: "https://feeds.reuters.com/reuters/businessNews", category: "business" },
  { url: "https://www.ft.com/rss/home", category: "business" },
  { url: "https://medium.com/feed/tag/economics", category: "business" },
  { url: "https://news.google.com/rss/search?q=stock+market+investing+wall+street&hl=en-US&gl=US&ceid=US:en", category: "business" },

  // ── World News ──
  { url: "https://feeds.bbci.co.uk/news/rss.xml", category: "news" },
  { url: "http://rss.cnn.com/rss/edition.rss", category: "news" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", category: "news" },
  { url: "https://feeds.reuters.com/reuters/topNews", category: "news" },
  { url: "https://rss.app/feeds/v1.1/apnews.com.rss", category: "news" },
  { url: "https://feeds.npr.org/1001/rss.xml", category: "news" },
  { url: "https://www.theguardian.com/world/rss", category: "news" },

  // ── Sports ──
  { url: "https://www.espn.com/espn/rss/news", category: "sports" },
  { url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "sports" },
  { url: "https://bleacherreport.com/articles/feed", category: "sports" },
  { url: "https://theathletic.com/feed/", category: "sports" },
  { url: "https://news.google.com/rss/search?q=sports+news+results&hl=en-US&gl=US&ceid=US:en", category: "sports" },

  // ── Creative & Design ──
  { url: "https://medium.com/feed/tag/ux-design", category: "design" },
  { url: "https://dribbble.com/stories.rss", category: "design" },
  { url: "https://www.creativebloq.com/feed", category: "design" },
  { url: "https://www.smashingmagazine.com/feed/", category: "design" },
  { url: "https://css-tricks.com/feed/", category: "design" },
  { url: "https://dev.to/feed/tag/design", category: "design" },
  { url: "https://alistapart.com/main/feed/", category: "design" },

  // ── Music ──
  { url: "https://pitchfork.com/feed/feed-news/rss", category: "music" },
  { url: "https://www.nme.com/feed", category: "music" },
  { url: "https://www.billboard.com/feed/", category: "music" },
  { url: "https://news.google.com/rss/search?q=music+album+release&hl=en-US&gl=US&ceid=US:en", category: "music" },
  { url: "https://consequence.net/feed/", category: "music" },

  // ── Film & TV ──
  { url: "https://variety.com/feed/", category: "entertainment" },
  { url: "https://deadline.com/feed/", category: "entertainment" },
  { url: "https://www.hollywoodreporter.com/feed/", category: "entertainment" },
  { url: "https://www.indiewire.com/feed/", category: "entertainment" },
  { url: "https://news.google.com/rss/search?q=movie+review+film&hl=en-US&gl=US&ceid=US:en", category: "entertainment" },
  { url: "https://news.google.com/rss/search?q=anime+manga+release&hl=en-US&gl=US&ceid=US:en", category: "entertainment" },

  // ── Gaming ──
  { url: "https://news.google.com/rss/search?q=video+game+release+esports+gaming+industry&hl=en-US&gl=US&ceid=US:en", category: "gaming" },
  { url: "https://feeds.ign.com/ign/all", category: "gaming" },
  { url: "https://kotaku.com/rss", category: "gaming" },
  { url: "https://www.pcgamer.com/rss/", category: "gaming" },
  { url: "https://www.gamespot.com/feeds/mashup/", category: "gaming" },
  { url: "https://www.rockpapershotgun.com/feed", category: "gaming" },
  { url: "https://www.eurogamer.net/?format=rss", category: "gaming" },

  // ── Cooking & Food ──
  { url: "https://www.seriouseats.com/feeds/atom", category: "food" },
  { url: "https://www.bonappetit.com/feed/rss", category: "food" },
  { url: "https://www.eater.com/rss/index.xml", category: "food" },
  { url: "https://news.google.com/rss/search?q=cooking+recipe+food&hl=en-US&gl=US&ceid=US:en", category: "food" },

  // ── Health & Fitness ──
  { url: "https://www.statnews.com/feed/", category: "health" },
  { url: "https://medium.com/feed/tag/health", category: "health" },
  { url: "https://news.google.com/rss/search?q=medical+research+health+breakthrough&hl=en-US&gl=US&ceid=US:en", category: "health" },
  { url: "https://www.webmd.com/rss/default.xml", category: "health" },
  { url: "https://www.healthline.com/rss", category: "health" },
  { url: "https://www.runnersworld.com/rss/all.xml/", category: "health" },
  { url: "https://news.google.com/rss/search?q=fitness+workout+exercise&hl=en-US&gl=US&ceid=US:en", category: "health" },
  { url: "https://www.medicalnewstoday.com/rss", category: "health" },

  // ── Travel ──
  { url: "https://www.lonelyplanet.com/feed.xml", category: "travel" },
  { url: "https://www.travelandleisure.com/feeds/all", category: "travel" },
  { url: "https://www.nomadicmatt.com/feed/", category: "travel" },
  { url: "https://medium.com/feed/tag/travel", category: "travel" },
  { url: "https://news.google.com/rss/search?q=travel+destination&hl=en-US&gl=US&ceid=US:en", category: "travel" },

  // ── Photography ──
  { url: "https://petapixel.com/feed/", category: "photography" },
  { url: "https://www.dpreview.com/feeds/news.xml", category: "photography" },
  { url: "https://fstoppers.com/rss.xml", category: "photography" },
  { url: "https://medium.com/feed/tag/photography", category: "photography" },

  // ── Lifestyle & Productivity ──
  { url: "https://lifehacker.com/feed/rss", category: "lifestyle" },
  { url: "https://zenhabits.net/feed/", category: "lifestyle" },
  { url: "https://medium.com/feed/tag/productivity", category: "lifestyle" },
  { url: "https://medium.com/feed/tag/psychology", category: "lifestyle" },

  // ── Robotics & EVs ──
  { url: "https://spectrum.ieee.org/feeds/feed.rss", category: "robotics" },
  { url: "https://electrek.co/feed/", category: "robotics" },
  { url: "https://insideevs.com/rss/", category: "robotics" },
  { url: "https://www.therobotreport.com/feed/", category: "robotics" },
  { url: "https://news.google.com/rss/search?q=robotics+autonomous+vehicles+EV+2025&hl=en-US&gl=US&ceid=US:en", category: "robotics" },

  // ── Crypto ──
  { url: "https://medium.com/feed/tag/cryptocurrency", category: "crypto" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "crypto" },
  { url: "https://decrypt.co/feed", category: "crypto" },
  { url: "https://www.theblock.co/rss.xml", category: "crypto" },

  // ── Open Source ──
  { url: "https://opensource.com/feed", category: "opensource" },
  { url: "https://itsfoss.com/feed/", category: "opensource" },
  { url: "https://dev.to/feed/tag/opensource", category: "opensource" },
  { url: "https://dev.to/feed/tag/linux", category: "opensource" },
  { url: "https://news.google.com/rss/search?q=open+source+software+github+trending&hl=en-US&gl=US&ceid=US:en", category: "opensource" },
  { url: "https://hnrss.org/newest?q=open+source+github", category: "opensource" },
  { url: "https://www.linuxjournal.com/node/feed", category: "opensource" },

  // ── Education ──
  { url: "https://www.edsurge.com/feeds/articles", category: "education" },
  { url: "https://www.insidehighered.com/rss/all", category: "education" },
  { url: "https://medium.com/feed/tag/education", category: "education" },
  { url: "https://news.google.com/rss/search?q=education+technology+edtech+learning&hl=en-US&gl=US&ceid=US:en", category: "education" },

  // ── Books & Literature ──
  { url: "https://lithub.com/feed/", category: "books" },
  { url: "https://bookriot.com/feed/", category: "books" },
  { url: "https://www.theparisreview.org/feed/", category: "books" },
  { url: "https://medium.com/feed/tag/books", category: "books" },
  { url: "https://news.google.com/rss/search?q=book+review+bestseller&hl=en-US&gl=US&ceid=US:en", category: "books" },

  // ── Security ──
  { url: "https://krebsonsecurity.com/feed/", category: "security" },
  { url: "https://www.bleepingcomputer.com/feed/", category: "security" },
  { url: "https://therecord.media/feed", category: "security" },
  { url: "https://www.darkreading.com/rss.xml", category: "security" },
  { url: "https://threatpost.com/feed/", category: "security" },
  { url: "https://news.google.com/rss/search?q=cybersecurity+data+breach+zero+day&hl=en-US&gl=US&ceid=US:en", category: "security" },
  { url: "https://dev.to/feed/tag/security", category: "security" },
  { url: "https://www.schneier.com/blog/atom.xml", category: "security" },

  // ── Space ──
  { url: "https://www.nasa.gov/feed/", category: "space" },
  { url: "https://spacenews.com/feed/", category: "space" },
  { url: "https://www.space.com/feeds/all", category: "space" },
  { url: "https://www.universetoday.com/feed/", category: "space" },

  // ── Climate ──
  { url: "https://news.google.com/rss/search?q=climate+change+renewable+energy+sustainability&hl=en-US&gl=US&ceid=US:en", category: "climate" },
  { url: "https://www.carbonbrief.org/feed/", category: "climate" },
  { url: "https://news.google.com/rss/search?q=solar+wind+energy+carbon+emissions+net+zero&hl=en-US&gl=US&ceid=US:en", category: "climate" },
  { url: "https://insideclimatenews.org/feed/", category: "climate" },
  { url: "https://cleantechnica.com/feed/", category: "climate" },

  // ── Fintech ──
  { url: "https://news.google.com/rss/search?q=fintech+digital+banking+neobank+payment+technology&hl=en-US&gl=US&ceid=US:en", category: "fintech" },
  { url: "https://medium.com/feed/tag/fintech", category: "fintech" },
  { url: "https://www.fintechfutures.com/feed/", category: "fintech" },

  // ── DevOps ──
  { url: "https://devops.com/feed/", category: "devops" },
  { url: "https://thenewstack.io/feed/", category: "devops" },
  { url: "https://kubernetes.io/feed.xml", category: "devops" },

  // ── Data Science ──
  { url: "https://medium.com/feed/tag/data-science", category: "data" },
  { url: "http://arxiv.org/rss/cs.LG", category: "data" },
  { url: "https://www.kdnuggets.com/feed", category: "data" },

  // ── Mobile ──
  { url: "https://developer.apple.com/news/rss/news.rss", category: "mobile" },
  { url: "https://android-developers.googleblog.com/feeds/posts/default", category: "mobile" },
  { url: "https://news.google.com/rss/search?q=iOS+Android+mobile+app+development&hl=en-US&gl=US&ceid=US:en", category: "mobile" },

  // ── Marketing ──
  { url: "https://searchengineland.com/feed", category: "marketing" },
  { url: "https://medium.com/feed/tag/marketing", category: "marketing" },
  { url: "https://www.marketingweek.com/feed/", category: "marketing" },

  // ── YouTube Channels (free RSS, no API budget) ──
  // Tech/AI
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA", category: "technology" },      // Fireship
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg", category: "ai" },              // Two Minute Papers
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC9-y-6csu5WGm29I7JiwpnA", category: "technology" },      // Computerphile
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCddiUEpeqJcYeBxX1IVBKvQ", category: "technology" },      // The Verge
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ", category: "technology" },      // MKBHD
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC9x0AN7BWHpCDHSm9NiJFJQ", category: "technology" },      // NetworkChuck
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbRP3c757lWg9M-U7TyEkXA", category: "technology" },      // Theo - t3.gg
  // Science/Space
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q", category: "science" },         // Kurzgesagt
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA", category: "science" },         // Veritasium
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCLA_DiR1FfKNvjuUpBHmylQ", category: "space" },           // NASA
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC6107grRI4m0o2-emgoDnAA", category: "science" },         // SmarterEveryDay
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC7_gcs09iThXybpVgjHZ_7g", category: "space" },           // PBS Space Time
  // Business/Startups
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCcefcZRL2oaA_uBNeo5UOWg", category: "startups" },        // Y Combinator
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCCjyq_K1Xwfg8Lndy7lKMpA", category: "startups" },        // TechCrunch
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCkkhmBWfS7pILYIk0iBeTnQ", category: "startups" },        // This Week in Startups
  // Gaming
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCKy1dAqELo0zrOtPkf0eTMw", category: "gaming" },          // IGN
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNvzD7Z-g64bPXxGzaQaa4g", category: "gaming" },          // Gameranx
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC-2Y8dQb0S6DtpxNgAKoJKA", category: "gaming" },          // PlayStation
  // Creative/Design
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC-b3c7kxa5vU-bnmaROgvog", category: "design" },          // The Futur
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCvK4bOhULCpmLabd2pDMtnA", category: "lifestyle" },       // Yes Theory
  // Cooking
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCJHA_jMfCvEnv-3kRjTCQXw", category: "food" },            // Binging with Babish
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UChBEbMKI1eCcejTtmI32UEw", category: "food" },            // Joshua Weissman
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbpMy0Fg74eXXkvxJrtEn3w", category: "food" },            // Bon Appetit
  // Health/Fitness
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC68KOHp3neoaKBGvQ-Y8JPA", category: "health" },          // Jeff Nippard
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCe0TLA0EsQbE-MjuHXevj2A", category: "health" },          // AthleanX
  // Music
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC2Qw1dzXDBAZPwS7zm37g8g", category: "music" },           // COLORS
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC4eYXhJI4-7wSWc8UNRwD4A", category: "music" },           // NPR Music
  // World News
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC16niRr50-MSBwiO3YDb3RA", category: "news" },            // BBC News
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNye-wNBqNL5ZzHSJj3l8Bg", category: "news" },            // Al Jazeera English
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCvJJ_dzjViJCoLf5uKUTwoA", category: "business" },        // CNBC
  // Photography
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC3DkFux8Iv-aYnTRWzwaiBA", category: "photography" },     // Peter McKinnon
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCaFRjcbTlBn3-AGOxPmobOQ", category: "photography" },     // Mango Street
];

// ─── Source quality weights ───
// Used to boost/penalize articles from known sources
const SOURCE_QUALITY: Record<string, number> = {
  // Tech
  "news.ycombinator.com": 20,
  "arstechnica.com": 15,
  "theverge.com": 15,
  "wired.com": 15,
  "techcrunch.com": 15,
  // Science
  "nature.com": 15,
  "sciencedaily.com": 12,
  "phys.org": 12,
  // Space
  "nasa.gov": 15,
  "spacenews.com": 12,
  "space.com": 10,
  // Health
  "statnews.com": 15,
  "webmd.com": 10,
  "healthline.com": 10,
  "runnersworld.com": 10,
  // Climate
  "carbonbrief.org": 12,
  // Business & Finance
  "bloomberg.com": 18,
  "forbes.com": 12,
  "businessinsider.com": 10,
  "reuters.com": 18,
  "ft.com": 18,
  // World News
  "bbc.co.uk": 18,
  "cnn.com": 12,
  "aljazeera.com": 15,
  "npr.org": 15,
  "theguardian.com": 15,
  "apnews.com": 15,
  // Sports
  "espn.com": 15,
  "theathletic.com": 15,
  "bleacherreport.com": 10,
  // Design
  "dribbble.com": 12,
  "smashingmagazine.com": 15,
  "css-tricks.com": 12,
  "creativebloq.com": 10,
  // Music
  "pitchfork.com": 15,
  "nme.com": 10,
  "billboard.com": 12,
  // Film & TV
  "variety.com": 15,
  "deadline.com": 15,
  "hollywoodreporter.com": 15,
  "indiewire.com": 12,
  // Gaming
  "ign.com": 12,
  "kotaku.com": 10,
  "pcgamer.com": 12,
  "gamespot.com": 10,
  "rockpapershotgun.com": 12,
  // Food
  "seriouseats.com": 15,
  "bonappetit.com": 12,
  "eater.com": 12,
  // Travel
  "lonelyplanet.com": 15,
  "nomadicmatt.com": 10,
  // Photography
  "petapixel.com": 15,
  "dpreview.com": 12,
  "fstoppers.com": 10,
  // Lifestyle
  "lifehacker.com": 10,
  "zenhabits.net": 10,
  // Robotics & EVs
  "spectrum.ieee.org": 18,
  "electrek.co": 12,
  "insideevs.com": 10,
  "therobotreport.com": 12,
  // Crypto
  "coindesk.com": 12,
  "decrypt.co": 10,
  "theblock.co": 12,
  // Open Source
  "opensource.com": 10,
  "itsfoss.com": 10,
  // Education
  "edsurge.com": 12,
  "insidehighered.com": 12,
  // Books
  "lithub.com": 15,
  "bookriot.com": 10,
  "theparisreview.org": 15,
  // YouTube
  "youtube.com": 12,
  // New sources
  "the-decoder.com": 15,
  "venturebeat.com": 12,
  "thenewstack.io": 12,
  "kdnuggets.com": 10,
  "insideclimatenews.org": 12,
  "cleantechnica.com": 10,
  "fintechfutures.com": 10,
  "schneier.com": 15,
  "universetoday.com": 12,
  "newscientist.com": 15,
  "searchengineland.com": 10,
  "marketingweek.com": 10,
  "medicalnewstoday.com": 8,
  "consequence.net": 10,
  "eurogamer.net": 10,
  "alistapart.com": 12,
  // Aggregators
  "reddit.com": 5,
  "dev.to": 5,
  "medium.com": 5,
  "news.google.com": 0,
};

export function getSourceBoost(source: string): number {
  const lower = source.toLowerCase();
  for (const [domain, boost] of Object.entries(SOURCE_QUALITY)) {
    if (lower.includes(domain)) return boost;
  }
  return 0;
}

function extractImageUrl(item: RssParser.Item): string | null {
  const raw = item as Record<string, unknown>;

  // media:content
  const mediaContent = raw["media:content"] as
    | { $?: { url?: string; medium?: string } }
    | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  // media:thumbnail
  const mediaThumbnail = raw["media:thumbnail"] as
    | { $?: { url?: string } }
    | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  // media:group > media:content (YouTube, etc.)
  const mediaGroup = raw["media:group"] as
    | { "media:thumbnail"?: Array<{ $?: { url?: string } }> }
    | undefined;
  if (mediaGroup?.["media:thumbnail"]?.[0]?.$?.url) return mediaGroup["media:thumbnail"][0].$.url;

  // enclosure with image type
  const enclosure = raw.enclosure as
    | { url?: string; type?: string }
    | undefined;
  if (enclosure?.url && (enclosure.type?.startsWith("image") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(enclosure.url))) return enclosure.url;

  // itunes:image (podcasts)
  const itunesImage = raw["itunes:image"] as
    | { $?: { href?: string } }
    | undefined;
  if (itunesImage?.$?.href) return itunesImage.$.href;

  // Parse from HTML content
  const content = item.content || "";
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch?.[1] && !imgMatch[1].includes("tracking") && !imgMatch[1].includes("pixel")) return imgMatch[1];

  return null;
}

function cleanSourceFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function cleanSourceName(raw: string, articleUrl?: string): string {
  // YouTube feeds: use channel name from feed title
  if (articleUrl?.includes("youtube.com/watch") || articleUrl?.includes("youtu.be")) {
    // YouTube RSS feed titles are just the channel name — use as-is if short enough
    const name = raw.trim();
    if (name && name.length <= 30 && !name.includes("http")) return name;
    return "YouTube";
  }

  // Reddit feeds: extract subreddit name
  if (/top scoring links|^r\/|\/r\//i.test(raw)) {
    const match = raw.match(/\/r\/(\w+)/i) || raw.match(/^r\/(\w+)/i);
    if (match) return "r/" + match[1];
    // "top scoring links : cybersecurity" → extract topic
    const colonMatch = raw.match(/top scoring links\s*:\s*(.+)/i);
    if (colonMatch) return "r/" + colonMatch[1].trim();
    return "Reddit";
  }

  // Known source mappings
  const KNOWN: Record<string, string> = {
    "Hacker News: Front Page": "Hacker News",
    "Hacker News: Newest": "Hacker News",
    "DEV Community": "DEV Community",
  };
  if (KNOWN[raw]) return KNOWN[raw];

  // Strip after common separators: " - ", " | ", " :: "
  let name = raw.split(/\s+[-–]\s+|\s+\|\s+|\s+::\s+/)[0].trim();

  // Truncate to 30 chars
  if (name.length > 30) name = name.slice(0, 27) + "...";

  // Fallback: if name still contains quotes or looks like a search query, extract domain from URL
  if (articleUrl && (name.includes('"') || name.includes("'") || (name.includes(" ") && !name.includes(".")))) {
    const domain = cleanSourceFromUrl(articleUrl);
    if (domain) return domain;
  }

  return name;
}

function summarize(text: string): string {
  let clean = text
    .replace(/<[^>]+>/g, "")
    .replace(/Continue reading on [^»\n]+[»…]?/gi, "")
    .replace(/submitted by\s+\/u\/\w+/gi, "")
    .replace(/\[link\]/gi, "")
    .replace(/\[comments\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= 200) return clean;
  const truncated = clean.slice(0, 197);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 150 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

async function fetchRss(url: string, category: string): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL(url);
    const isGoogleNews = url.includes("news.google.com");
    return (feed.items || []).map((item) => {
      const itemUrl = item.link || url;
      const rawItem = item as unknown as Record<string, unknown>;
      let source: string;

      if (isGoogleNews) {
        // Google News RSS: each item has <source>Publisher Name</source>
        const gnSource = rawItem["gnSource"];
        if (typeof gnSource === "string" && gnSource.length > 0 && gnSource.length <= 60) {
          source = gnSource;
        } else {
          // Fallback: extract publisher domain from the article URL
          source = cleanSourceFromUrl(itemUrl) || "News";
        }
      } else {
        source = cleanSourceName(feed.title || new URL(url).hostname, itemUrl);
      }

      return {
        title: item.title || "Untitled",
        url: itemUrl,
        summary: summarize(item.contentSnippet || item.content || item.title || ""),
        source,
        image_url: extractImageUrl(item),
        category,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip tracking params (utm_*, source, ref, etc.)
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source", "ref", "gi", "sk"];
    for (const p of stripParams) u.searchParams.delete(p);
    // Normalize Medium URLs: strip ?source= and #--- fragments
    let clean = u.toString().split("#")[0];
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    return clean;
  } catch {
    return url;
  }
}

/**
 * Check if an article is junk that should be filtered out.
 */
// Spam keywords — gambling, crypto scams, SEO spam, promotional junk
const SPAM_PATTERNS = /\b(aviator|crash game|1win|slot machine|slot online|situs game|terpercaya|judi online|casino|betting tips|win real money|free spins|promo code|bonus code|referral code|airdrop claim|token presale|pump and dump|get rich quick|make \$\d+.*day|training institute|best institute|join now free|tour packages?\b.*\b(couple|family|honeymoon)|pole danc(er|ing)|bitunix|buy now|order now|click here to|limited time offer|act fast|hurry up|free strategy call|seed.?s? phrase|made \$\d[\d,]+\s*in\s*\d+\s*days?|my .{0,20}wallet holds|usdt.{0,30}seed|rtp.*slot|pola rtp|gamdom|crypto casino|top .{0,20}designer in|best .{0,20}developer in|hire .{0,20}freelancer|APK.*download|APK.*guide|APK.*install|complete guide to .{0,20}(features|download|usage)|you need to know about .{0,10}(fitness|gym|health)|Fidelity Capital Investment|cost me \$\d[\d,]+|step-by-step guide to start.{0,20}exchange|that'?s why we'?re building|something bigger than just)\b/i;

function isJunkArticle(a: RawArticle): boolean {
  // Homepage/index URLs (not real articles)
  try {
    const u = new URL(a.url);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "" || path === "/index" || path === "/index.html") return true;

    // Reddit discussion threads surfaced via Google News search — not primary sources.
    // Curated subreddit RSS feeds (from GLOBAL_SOURCES) are still allowed through classify().
    if (u.hostname === "www.reddit.com" && /search results/i.test(a.source)) return true;
  } catch { return true; }

  // Template/broken content in title or summary
  const templatePatterns = /\{\{|\$json\.|<%=|%>|\{%|undefined|null|NaN/;
  if (templatePatterns.test(a.title) || templatePatterns.test(a.summary)) return true;

  // Title is too short, generic, or truncated
  if (a.title.length < 10 || a.title === "Untitled") return true;
  if (a.title.endsWith(":") && a.title.length < 30) return true;

  // Spam/gambling/scam content
  if (SPAM_PATTERNS.test(a.title) || SPAM_PATTERNS.test(a.summary)) return true;

  // Non-English content — non-Latin script detection (Bengali, Chinese, Arabic, Cyrillic, Thai, Hindi, Japanese, Korean)
  const nonLatinScript = /[\u0980-\u09FF\u4E00-\u9FFF\u3400-\u4DBF\u0600-\u06FF\u0400-\u04FF\u0E00-\u0E7F\u0900-\u097F\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  if (nonLatinScript.test(a.title)) {
    // Allow if mostly Latin (e.g. "What is 人工智能?" should pass)
    const latinChars = (a.title.match(/[a-zA-Z]/g) || []).length;
    if (latinChars / a.title.length < 0.5) return true;
  }
  const latinChars = (a.title.match(/[a-zA-Z]/g) || []).length;
  if (a.title.length > 20 && latinChars / a.title.length < 0.3) return true;
  // Non-English detection: check for Spanish/Portuguese/Indonesian/French/German/Italian articles
  const nonEnglish = /\b(dalam|dengan|untuk|yang|dari|adalah|merupakan|perjalanan|menuju|melampaui|kedewasaan|peristiwa|terjebak|membangun|budidaya|berbasis|studi|kasus|aprendimos|ignorar|porque|también|después|además|mientras|através|você|fazer|quando|então|bienvenida|exploradores|lunares|batieron|récords|astronautas|primeros|regresado|mengenal|pola|pourquoi|nous|cette|notre|même|était|depuis|können|werden|durch|zwischen|über|delle|degli|questa|quello|quando|essere|delle|membaca|kripto|tuntas|halo|bicara|rasanya|sekarang|delegá|sueño|vivir|parece)\b/i;
  if (nonEnglish.test(a.title)) return true;
  // Also check: if title has 3+ Spanish/Portuguese/French/German/Italian articles/prepositions, it's non-English
  const foreignArticles = (a.title.match(/\b(la|el|los|las|del|una|les|des|une|sur|avec|dans|pelo|pela|pelo|aos|nas|nos|der|die|das|den|dem|ein|eine|gli|dei|dello|alla|il|und|est|sont|mais|pour|qui|que|von|wie|wir|sie)\b/gi) || []).length;
  if (foreignArticles >= 3) return true;

  // Job postings / hiring announcements — not news
  if (/\b(we.?re hiring|join our team|open position|job opening|now hiring|apply (now|today)|careers? at|looking for (a |an )?.{0,30}(developer|engineer|designer|analyst|manager))\b/i.test(a.title)) return true;

  // Summary is just the site tagline (contains "Breaking news" / "covering" / "the best" + short)
  if (a.summary.length < 30 && /breaking news|covering|the best|subscribe|sign up/i.test(a.summary)) return true;

  return false;
}

/**
 * Clean up summary text — strip broken content, avoid title duplication.
 */
function cleanSummary(summary: string, title: string): string {
  // Strip template syntax
  if (/\{\{|\$json\.|<%=/.test(summary)) return "";

  // If summary starts with or equals the title, strip it
  if (summary === title) return "";
  if (summary.startsWith(title)) {
    const rest = summary.slice(title.length).replace(/^[\s:—\-–]+/, "").trim();
    return rest.length > 20 ? rest : "";
  }

  return summary;
}

export async function insertToPool(articles: RawArticle[]): Promise<number> {
  if (articles.length === 0) return 0;

  // Filter junk articles
  articles = articles.filter((a) => !isJunkArticle(a));

  // Clean summaries
  for (const a of articles) {
    a.summary = cleanSummary(a.summary, a.title);
  }

  // Deduplicate by normalized URL before inserting
  const seen = new Set<string>();
  articles = articles.filter((a) => {
    const norm = normalizeUrl(a.url);
    if (seen.has(norm)) return false;
    seen.add(norm);
    a.url = norm;
    return true;
  });

  const supabase = getServiceClient();
  const rows = articles.map((a) => ({
    title: a.title,
    url: a.url,
    summary: a.summary,
    source: a.source,
    image_url: a.image_url,
    category: a.category,
    published_at: a.published_at,
  }));

  let totalAdded = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data, error } = await supabase
      .from("article_pool")
      .upsert(chunk, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
    if (!error && data) totalAdded += data.length;
  }
  return totalAdded;
}

/**
 * PHASE 1A: Scan global high-quality sources into article_pool.
 * Covers 80% of prompts. Runs every 15 min.
 * Cost: $0 (all RSS).
 */
export async function scanGlobal(): Promise<{ scanned: number; added: number }> {
  const results = await Promise.allSettled(
    GLOBAL_SOURCES.map(({ url, category }) => fetchRss(url, category))
  );

  const articles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  const added = await insertToPool(articles);
  return { scanned: articles.length, added };
}

/**
 * PHASE 1B: Scan sources specific to a feed's AI-generated search plan.
 * Covers the other 20% — niche topics, custom interests.
 * Cost: $0 (RSS) — the AI cost was in generating the plan.
 */
export async function scanForPlan(plan: SearchPlan): Promise<{ scanned: number; added: number }> {
  const urls: { url: string; category: string }[] = [];
  const category = "custom";

  // Google News with AI-optimized queries
  for (const q of plan.google_queries.slice(0, 3)) {
    urls.push({
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
      category,
    });
  }

  // Subreddits (top of day for quality)
  for (const sub of plan.subreddits.slice(0, 4)) {
    const name = sub.replace(/^r\//, "");
    urls.push({ url: `https://www.reddit.com/r/${name}/top/.rss?t=day`, category });
  }

  // HN search
  for (const q of plan.hn_queries.slice(0, 2)) {
    urls.push({ url: `https://hnrss.org/newest?q=${encodeURIComponent(q)}`, category });
  }

  // Medium tags
  for (const tag of plan.medium_tags.slice(0, 2)) {
    urls.push({ url: `https://medium.com/feed/tag/${tag}`, category });
  }

  // Dev.to tags
  for (const tag of plan.devto_tags.slice(0, 2)) {
    urls.push({ url: `https://dev.to/feed/tag/${tag}`, category });
  }

  const results = await Promise.allSettled(
    urls.map(({ url, category: cat }) => fetchRss(url, cat))
  );

  const articles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  const added = await insertToPool(articles);
  return { scanned: articles.length, added };
}

/**
 * Brave Search scan for maximum coverage. Uses API tokens.
 * Used for custom feeds when RSS doesn't cover the topic well.
 */
export async function scanBrave(queries?: string[]): Promise<{ scanned: number; added: number }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { scanned: 0, added: 0 };

  const defaultQueries = [
    { q: "technology news today", category: "technology" },
    { q: "artificial intelligence latest", category: "ai" },
    { q: "startup funding news", category: "startups" },
    { q: "software engineering programming", category: "programming" },
    { q: "science discovery research", category: "science" },
  ];

  const searchQueries = queries
    ? queries.map((q) => ({ q, category: "custom" }))
    : defaultQueries;

  let totalScanned = 0;
  let totalAdded = 0;

  for (const { q, category } of searchQueries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=20&freshness=pd`,
        { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const results = data.web?.results || [];
      totalScanned += results.length;

      const articles: RawArticle[] = results.map((r: { title: string; description: string; url: string }) => ({
        title: r.title,
        url: r.url,
        summary: r.description || "",
        source: new URL(r.url).hostname.replace("www.", ""),
        image_url: null,
        category,
        published_at: new Date().toISOString(),
      }));

      totalAdded += await insertToPool(articles);
    } catch {
      // continue
    }
  }

  return { scanned: totalScanned, added: totalAdded };
}

/**
 * PHASE 1C: Google News RSS per active feed.
 * Generates a targeted Google News RSS URL from each feed's query_text so
 * niche/custom feeds get articles that the generic GLOBAL_SOURCES may miss.
 * Processes up to `limit` feeds per run to avoid hammering Google.
 */
export async function scanGoogleNews(limit = 25): Promise<{ scanned: number; added: number; feeds: number }> {
  const supabase = getServiceClient();

  const { data: feeds } = await supabase
    .from("feeds")
    .select("id, name, query_text, last_refreshed_at")
    .eq("is_active", true);

  if (!feeds || feeds.length === 0) return { scanned: 0, added: 0, feeds: 0 };

  // Count recent items per feed to prioritize niche feeds (fewer items = higher priority)
  const feedIds = feeds.map((f) => f.id);
  const { data: recentItems } = await supabase
    .from("feed_items")
    .select("feed_id")
    .in("feed_id", feedIds)
    .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString());

  const recentCountByFeed = new Map<string, number>();
  for (const item of recentItems || []) {
    recentCountByFeed.set(item.feed_id, (recentCountByFeed.get(item.feed_id) || 0) + 1);
  }

  // Sort: feeds with 0 recent items first (niche/unserved), then by oldest refresh time
  const sorted = [...feeds].sort((a, b) => {
    const aCount = recentCountByFeed.get(a.id) || 0;
    const bCount = recentCountByFeed.get(b.id) || 0;
    if (aCount === 0 && bCount > 0) return -1;
    if (bCount === 0 && aCount > 0) return 1;
    const at = (a as Record<string, unknown>).last_refreshed_at as string | null;
    const bt = (b as Record<string, unknown>).last_refreshed_at as string | null;
    if (!at && !bt) return 0;
    if (!at) return -1;
    if (!bt) return 1;
    return at.localeCompare(bt);
  });

  const batch = sorted.slice(0, limit);

  const allResults: PromiseSettledResult<RawArticle[]>[] = [];
  for (let i = 0; i < batch.length; i += 5) {
    const chunk = batch.slice(i, i + 5);
    const chunkResults = await Promise.allSettled(
      chunk
        .map((f) => {
          const q = (f.query_text || f.name || "").trim();
          if (!q) return null;
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;
          return fetchRss(url, "custom");
        })
        .filter(Boolean) as Promise<RawArticle[]>[]
    );
    allResults.push(...chunkResults);
  }

  const articles: RawArticle[] = [];
  const seenUrls = new Set<string>();

  for (const result of allResults) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      if (seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      articles.push(article);
    }
  }

  const added = await insertToPool(articles);
  return { scanned: articles.length, added, feeds: batch.length };
}

// Search Brave Videos API for YouTube content
export async function scanBraveVideos(queries?: string[]): Promise<{ scanned: number; added: number }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return { scanned: 0, added: 0 };

  const defaultQueries = [
    "AI technology explained",
    "startup pitch funding",
    "programming tutorial 2026",
    "science documentary new",
    "tech review 2026",
    "cybersecurity explained",
    "space exploration news",
    "design process tutorial",
    "game development devlog",
    "robotics demo 2026",
    "crypto blockchain explained",
    "machine learning project",
    "open source project demo",
    "cooking technique tutorial",
    "fitness workout routine",
    "business strategy explained",
    "climate change science",
    "indie game trailer",
    "web development tutorial",
    "photography tips tricks",
  ];

  const searchQueries = queries || defaultQueries;
  let totalScanned = 0;
  let totalAdded = 0;

  for (const q of searchQueries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(q)}&count=20&freshness=pw`,
        { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const results = data.results || [];
      totalScanned += results.length;

      const articles: RawArticle[] = results
        .filter((r: { url: string }) => r.url?.includes("youtube.com") || r.url?.includes("youtu.be"))
        .map((r: { title: string; description: string; url: string; thumbnail?: { src: string } }) => ({
          title: r.title,
          url: r.url,
          summary: r.description || "",
          source: "YouTube",
          image_url: r.thumbnail?.src || null,
          category: "video",
          published_at: new Date().toISOString(),
        }));

      totalAdded += await insertToPool(articles);
    } catch {
      // continue
    }
  }

  return { scanned: totalScanned, added: totalAdded };
}
