// Marketing plan for MyFeed — owner-editable source of truth.
// Edit this file, commit, redeploy. Task status is stored in localStorage per-browser.

export type Pillar = "launch" | "social" | "content" | "communities" | "onboarding" | "metrics";
export type TaskStatus = "todo" | "scheduled" | "doing" | "done" | "blocked";

export type MarketingTask = {
  id: string;
  pillar: Pillar;
  title: string;
  why: string;              // why this matters
  channel?: string;         // PH, HN, X, LinkedIn, r/sub, Blog, etc.
  scheduled?: string;       // ISO date or "Week 1", "Day 1"
  effort?: "S" | "M" | "L"; // size
  copy?: string;            // ready-to-paste content
  assets?: { label: string; url?: string; note?: string }[];
  metric?: string;          // what success looks like
  links?: { label: string; url: string }[];
  status?: TaskStatus;      // default status (overridden by localStorage)
};

export const PILLAR_META: Record<Pillar, { label: string; icon: string; tagline: string }> = {
  launch: { label: "Launch Week", icon: "🚀", tagline: "One-shot distribution plays. Do these in a concentrated 5–7 day sprint." },
  social: { label: "Social Cadence", icon: "📣", tagline: "Repeatable build-in-public rhythm on X + LinkedIn." },
  content: { label: "Content & SEO", icon: "✍️", tagline: "Evergreen articles that drive search traffic for months." },
  communities: { label: "Communities", icon: "🫂", tagline: "Show up where your people already hang out. Contribute first, promote second." },
  onboarding: { label: "First-Time Experience", icon: "🎯", tagline: "Fix the site so the first 30 seconds sell themselves." },
  metrics: { label: "Metrics", icon: "📊", tagline: "What's actually working — signups, feeds, opt-ins." },
};

// ==================================================================
// LAUNCH WEEK
// ==================================================================

const LAUNCH: MarketingTask[] = [
  {
    id: "launch-assets",
    pillar: "launch",
    title: "Ship pre-launch assets",
    why: "Every channel below needs the same 4 assets. Front-load this or you'll redo work.",
    channel: "Assets",
    effort: "M",
    scheduled: "Day -2",
    assets: [
      { label: "Hero screenshot (1200x630 PNG)", note: "Clean homepage with a prompt visible in the banner" },
      { label: "Demo GIF (15–30s)", note: "Type prompt → click Create → feed appears. Kap or Cleanshot X." },
      { label: "1-min Loom walkthrough", note: "For PH / YC / first commenters. Unlisted." },
      { label: "OG image", note: "Already exists — verify renders on X/LinkedIn/WhatsApp preview" },
    ],
    metric: "All 4 assets in Notion/Drive, tested on a real preview",
  },

  {
    id: "launch-ph",
    pillar: "launch",
    title: "Product Hunt launch",
    why: "Still the highest-leverage single event. 48-hour window, designed for exactly this. Launch on a Tuesday or Wednesday — avoid Monday (people catching up), Friday (dead), weekends.",
    channel: "Product Hunt",
    effort: "L",
    scheduled: "Day 1 — Tuesday 12:01 AM PST",
    copy: `Tagline: MyFeed — Create custom AI feeds from any prompt

Description:
Tired of algorithmic feeds and Feedly clutter? Describe a topic in plain English ("React & Next.js tutorials", "SpaceX launches", "AI startup funding") and MyFeed scans 1,000+ sources — Reddit, RSS, Medium, DEV, Bloomberg, YouTube — to build you a custom feed. No login required to browse. Delivered to your inbox daily if you want.

What's different:
• Prompt-to-feed: no source-picking, just describe the topic
• Guest mode: browse immediately, sign up later
• Quality over recency: AI scores every article, junk gets filtered
• Email digests: daily or weekly, pick the feeds you want

Free while I figure out what people want. Would love feedback.

First maker comment (post immediately after launch):
Hey PH! 👋 I built MyFeed because I kept opening Feedly in the morning, scrolling past 80% junk, and closing it. Every feed reader assumes you know which sources you want to follow. But what I actually want is a topic — "AI tools", "Python tutorials" — and I want someone to find the good stuff for me.

So MyFeed takes a prompt, searches across 1,000+ sources (RSS, Reddit, Medium, YouTube, news), and scores each article with an LLM for quality. You get a feed with only the 6+/10 posts. I use it every morning — it's replaced my Twitter/Feedly/HN morning loop.

The guest experience is important to me: you can see the magic in 10 seconds without a signup wall.

Happy to answer anything — about the AI pipeline, the sources, the email setup, anything. 🙏`,
    links: [
      { label: "Submit here", url: "https://www.producthunt.com/posts/new" },
      { label: "PH launch checklist", url: "https://www.producthunt.com/launch" },
    ],
    metric: "Top 5 of the day → 1,000+ visits. Top 10 → ~400 visits.",
  },

  {
    id: "launch-hn",
    pillar: "launch",
    title: "Show HN post",
    why: "HN delivers technical users who give honest feedback and often become power users. Show HN is specifically for launches. Post Tuesday or Wednesday morning PT.",
    channel: "Hacker News",
    effort: "M",
    scheduled: "Day 1 — Tuesday 9:00 AM PST",
    copy: `Title: Show HN: MyFeed – Create custom RSS-style feeds from a plain-English prompt

Body (first comment, as OP):
Hi HN — I built MyFeed because every feed reader I tried assumed I already knew which sources I wanted to follow. What I actually wanted was to describe a topic and get the good posts from anywhere relevant.

How it works:
1. You type a prompt like "Rust systems programming"
2. We scan ~1,000 sources (RSS feeds, Reddit, DEV, Medium, Bloomberg, YouTube channels, Hacker News)
3. Each article is scored with gpt-5-nano (cheap, ~$0.05/1M tokens) for quality + relevance
4. Junk, ads, engagement-bait, non-English, and below-threshold posts are filtered out
5. You see the 6+/10 results, ordered by relevance + recency

You can browse as a guest — no signup wall. Sign up to save feeds and get email digests.

Stack: Next.js 15, Supabase, OpenAI Responses API with structured JSON schema, hosted on Railway. Classification is single-pass (not a pipeline) so cost stays under $3/mo even at current scale.

I'd really value feedback on three things:
1. The first-30-seconds experience — is the value clear?
2. Feed quality for any prompt you try (please share what you typed and what you got)
3. Anything you'd want that's obviously missing

https://myfeed.space`,
    links: [
      { label: "Submit", url: "https://news.ycombinator.com/submit" },
    ],
    metric: "Front page (>30 points in 2h) → 3,000+ visits. Second chance relaunch if it flops.",
  },

  {
    id: "launch-ih",
    pillar: "launch",
    title: "Indie Hackers post",
    why: "The IH audience converts — they're builders who try products and share. Post a build-story, not a pitch.",
    channel: "Indie Hackers",
    effort: "M",
    scheduled: "Day 2 — Wednesday 10:00 AM EST",
    copy: `Title: I built an AI feed reader in 3 months — what I'd do differently

Body:
I just launched MyFeed (https://myfeed.space) — a feed reader where you type a prompt and get a curated feed from 1,000+ sources. Wanted to share what worked and what didn't, because I was stuck on several things for embarrassingly long.

What worked:
• Starting with a 2-pass AI pipeline (classify then re-rank) → scrapping it for single-pass with JSON schema. 674 lines of code → 180 lines. 11 API calls → 1–5. Cost dropped from ~$15/mo projected to $0.50–3/mo actual. Simpler = faster = cheaper.
• Guest-first UX. No signup wall. Sign-ups went up, not down, because people saw value before committing.
• Using gpt-5-nano for scoring. Cheap enough to run on every article, structured output means no parsing errors.

What didn't:
• Trying to auto-discover sources via web search. Too noisy, too expensive. Curated seed list + user-generated custom feeds works better.
• Over-engineering the classifier before seeing real data.
• Waiting to add analytics until "after launch". I shipped without Mixpanel and had no idea what was working for 2 weeks.

If you try it, drop your prompt + result below — I'll use your feedback to prioritize the next week of work.

happy to share more technical details on the pipeline, the email digest system (Resend), or the Supabase + Next.js + Railway stack. AMA.`,
    links: [
      { label: "Submit post", url: "https://www.indiehackers.com/post/new" },
    ],
    metric: "50+ upvotes, 10+ comments, 200+ clicks",
  },

  {
    id: "launch-x-thread",
    pillar: "launch",
    title: "Launch thread on X",
    why: "Thread format lets you tell a story. Pin to profile for 2 weeks.",
    channel: "X (Twitter)",
    effort: "M",
    scheduled: "Day 1 — 9:30 AM local",
    copy: `Tweet 1 (hook):
launching MyFeed today 🎉

describe a topic in plain english.
get a curated feed from 1,000+ sources.
no signup to browse.

myfeed.space

[attach demo GIF]

Tweet 2:
every feed reader assumes you know the sources you want.

but I don't want to maintain an OPML file.
I want to say "AI tools" and get the good stuff.

so MyFeed takes a prompt → LLM scores every article across Reddit/RSS/DEV/Medium/YouTube → only 6+/10 posts get through.

Tweet 3:
under the hood it's cheap:
• gpt-5-nano ($0.05/1M tokens)
• single-pass classify w/ JSON schema
• 180 lines of TS

costs $0.50–3/mo total right now.

originally I had a 2-pass pipeline (674 lines, 11 API calls). scrapped it. simple wins.

Tweet 4:
the thing I'm most proud of: the guest experience.

you hit myfeed.space and you see 15 curated feeds populated with fresh posts. no "create an account to continue". the value is immediately visible.

signups go UP, not down, when you remove the wall.

Tweet 5:
would love your feedback, especially:
• the first-30-seconds experience
• feed quality for a prompt you care about
• anything obviously missing

the repo isn't open source yet but I'll share technical write-ups.

reply/DM with your prompt + result — I'll iterate on real usage.

myfeed.space

Tweet 6 (pin this):
making MyFeed was a build-in-public project — I'll keep sharing:
• what's actually working post-launch
• pipeline iterations
• user-requested features
• the real metrics (signups, feeds created, email opt-ins, cost)

follow along if you like that kind of thing.`,
    metric: "500+ impressions per tweet, 30+ clicks to site",
  },

  {
    id: "launch-linkedin",
    pillar: "launch",
    title: "LinkedIn launch post",
    why: "Different audience than X — more corporate, fewer builders, but higher trust. Tell the 'why' story.",
    channel: "LinkedIn",
    effort: "S",
    scheduled: "Day 1 — 11:00 AM local",
    copy: `Launching MyFeed today — a feed reader where you describe a topic and get a curated feed from 1,000+ sources.

The problem I kept hitting:
- Feedly wanted me to manually pick RSS feeds.
- Twitter's algorithm showed me what it wanted me to see.
- Newsletter subscriptions piled up unread.

What I actually wanted: "show me the 10 best posts this week about [topic]."

So MyFeed does that.

You type "AI tools" or "Python web dev" or "SpaceX launches" and it scans Reddit, DEV, Medium, blogs, Bloomberg, YouTube channels, and more. Each article is scored by an LLM for quality + relevance. Only 6+/10 posts get through.

No signup needed to browse. Daily email digest if you want.

Free while I figure out what people actually need.

🔗 myfeed.space

If you try it, I'd genuinely value:
— your prompt and whether the result was good
— what feels slow or confusing
— what's missing that would make you come back tomorrow

Will share build-in-public lessons as I go.`,
    metric: "200+ impressions, 10+ clicks, 2+ meaningful comments",
  },

  {
    id: "launch-reddit-sideproject",
    pillar: "launch",
    title: "r/SideProject launch",
    why: "Most SideProject-friendly subreddit. Clear rules: Show don't tell, include a demo.",
    channel: "r/SideProject",
    effort: "S",
    scheduled: "Day 2",
    copy: `Title: I built MyFeed — type a prompt, get a curated feed from 1,000+ sources (no signup to try)

Body:
Hey r/SideProject 👋

I made MyFeed because every RSS reader assumed I already knew which sources I wanted. I just wanted to describe a topic and get the good stuff.

Type "Python web dev tutorials" or "startup funding rounds" or "AI tools" — it scans Reddit, DEV, Medium, RSS, YouTube channels, Bloomberg, and scores each article with an LLM for quality. Only 6+/10 posts get through.

No signup needed to browse. Email digest if you want.

Demo: [paste GIF]

Stack: Next.js 15, Supabase, OpenAI gpt-5-nano, Railway. Total cost so far: ~$3/mo.

🔗 https://myfeed.space

Would love to hear:
• What prompt you tried and whether the result was good
• What's missing
• What feels slow

I'll reply to every comment.`,
    links: [{ label: "Rules", url: "https://www.reddit.com/r/SideProject/about/rules" }],
    metric: "30+ upvotes, 10+ comments",
  },

  {
    id: "launch-reddit-interneticbeautiful",
    pillar: "launch",
    title: "r/InternetIsBeautiful",
    why: "1.7M members. Hits front page of Reddit if it sticks.",
    channel: "r/InternetIsBeautiful",
    effort: "S",
    scheduled: "Day 3",
    copy: `Title: MyFeed — describe a topic in English, get a curated feed built from 1,000+ sources

Body (short, per subreddit norms):
No signup to browse. AI scores each article, junk is filtered out. Free.

Try a prompt → myfeed.space

[demo GIF]`,
    links: [{ label: "Rules", url: "https://www.reddit.com/r/InternetIsBeautiful/about/rules" }],
    metric: "100+ upvotes = front page consideration",
  },

  {
    id: "launch-reddit-rss",
    pillar: "launch",
    title: "r/rss + r/selfhosted",
    why: "Small but specifically interested audiences. High conversion rate.",
    channel: "r/rss, r/selfhosted, r/Feedly",
    effort: "S",
    scheduled: "Day 3–4",
    copy: `For r/rss:
Title: MyFeed — prompt-based alternative to manually curating RSS feeds

Body:
Built this because I kept bouncing off Feedly/Inoreader setup (picking feeds, OPML, folders). Wanted to just describe what I care about.

You type "AI tools" or "homelab" or "self-hosted apps" and it aggregates from 1,000+ RSS feeds + Reddit + Medium + DEV + YouTube, with LLM quality filtering.

Doesn't replace an RSS reader if you love manual curation — it's for the "I just want the good stuff about X" use case.

myfeed.space — free, no signup to browse. Feedback welcome.

For r/selfhosted:
Title: MyFeed (not self-hosted, but FYI) — AI-curated feeds, might replace the "discovery" side of your setup

Body:
Disclaimer: hosted product, not self-hostable yet. If that's a dealbreaker, skip.

If you use Miniflux/Tiny Tiny RSS etc. for the feeds you KNOW you want, MyFeed might fit for the "help me find new stuff on topic X" use case. You describe a topic, LLM aggregates + filters from 1,000+ sources.

Would self-hostable be interesting? Trying to gauge demand before investing.

myfeed.space`,
    metric: "20+ upvotes each, 5+ comments of real feedback",
  },

  {
    id: "launch-hn-ask",
    pillar: "launch",
    title: "Follow-up: Ask HN (Day 7)",
    why: "After first week, post an 'Ask HN: how did you find your niche?' — drives engagement, doesn't feel spammy, establishes you as a thoughtful builder.",
    channel: "Hacker News",
    effort: "S",
    scheduled: "Day 7",
    copy: `Title: Ask HN: what do you actually use instead of algorithmic feeds in 2026?

Body:
I've been building a feed reader (MyFeed — won't spam the link, it's in my profile) and the hardest thing is understanding how people actually consume information now. Twitter/X is algorithmic. Feedly/RSS requires manual curation most people won't do. Newsletters pile up. TikTok is a scroll trap.

For those of you who've actively rejected algorithmic feeds — what do you use instead, and why does it work? Especially curious about:
- How you discover new sources
- How you filter signal from noise without an algorithm
- What trade-offs you made`,
    metric: "Front page = 500+ visits even without direct link",
  },
];

// ==================================================================
// SOCIAL CADENCE — 30-day rolling
// ==================================================================

const SOCIAL: MarketingTask[] = [
  {
    id: "social-bio",
    pillar: "social",
    title: "Update X + LinkedIn bios to build-in-public mode",
    why: "Anyone who lands on your profile from a launch post should immediately understand what you're doing and why to follow.",
    channel: "X, LinkedIn",
    effort: "S",
    scheduled: "Before launch",
    copy: `X bio:
building MyFeed — AI feed reader where you type a prompt, get the good stuff from 1,000+ sources. build-in-public 🛠️ myfeed.space

Location: remote
Pinned tweet: launch thread

LinkedIn headline:
Building MyFeed — an AI feed reader for people tired of algorithmic slop | Ex-[your past role]

LinkedIn about (3 paragraphs):
I'm building MyFeed (myfeed.space) — a feed reader where you describe a topic and get a curated feed from 1,000+ sources, scored for quality by an LLM. Guest-first UX. Email digests. $0.50–3/mo to run.

Background: [your 2-sentence career history, relevant to why you can build this].

Why I'm building in public: faster feedback, more trust, forces me to ship real things. Following along if you want to see what happens when a solo founder tries to out-ship a category.`,
    metric: "Profile visits post-launch → follow-through to site",
  },

  {
    id: "social-cadence",
    pillar: "social",
    title: "Daily build-in-public post cadence",
    why: "1 post/day on X, 2/week on LinkedIn. This is the job for the next 90 days. Pick 3 post types and rotate.",
    channel: "X, LinkedIn",
    effort: "M",
    scheduled: "Every day",
    copy: `=== THE 5 POST TYPES ===

Type 1: Build update (daily)
"shipped [thing] today. [screenshot/gif].
what it does: [one line]
why it matters: [one line]
what's next: [one line]"

Type 2: Metric share (weekly, Fridays)
"week [N] of building MyFeed in public:
• signups: [x]
• feeds created: [y]
• email opt-ins: [z]
• cost: $[c]/mo
what I'm changing next week: [thing]"

Type 3: Mistake / lesson (weekly)
"I had a [2-pass LLM pipeline / X / Y] for 2 weeks.
it was 674 lines.
replaced with single-pass + json schema → 180 lines, 20x cheaper.
lesson: [one line]"

Type 4: Screenshot + story (2x/week)
Screenshot of a real feature, 2–3 sentences on why it exists, what problem it solves, one tweet-sized lesson.

Type 5: Reply-guy value (daily, passive)
Set 3 X lists: "feed readers", "indie builders", "AI tools". Reply thoughtfully to 3 posts a day. No "check out my product" — just be useful. Product link in bio does the work.

=== 30 DRAFT POSTS (copy-ready, fill in numbers) ===

Day 1: [pinned launch thread]
Day 2: "day 2 post-launch. [X] signups, [Y] feeds created. biggest surprise: [one observation from Mixpanel]"
Day 3: "I kept getting spam/SEO-bait in the feed. added this prompt line to the classifier: 'skip entirely: personal diaries, SEO bait, affiliate lists'. fixed 80% of it. [screenshot before/after]"
Day 4: "turns out guest-mode is doing most of the work. [X]% of visitors create a feed before logging in. removing the signup wall was the best decision."
Day 5: "email digest code path — 40 lines of TS + Resend + a supabase cron. shipping emails is so much simpler than it used to be. [screenshot of digest]"
Day 6: "cost breakdown week 1: $[amount]. mostly openai classification. gpt-5-nano is stupidly cheap and the quality is fine for this use case."
Day 7: [weekly metrics post]
Day 8–14: [similar rhythm]
Day 15: "halfway through month 1. what I learned: [3 bullets]. what I'm doing next: [3 bullets]."
Day 16–21: [continue]
Day 22: "asked friends to try MyFeed. 3 of them couldn't figure out what to type. added a 'popular prompts' row under the input. 80% of new feeds now come from those chips."
Day 23–28: [continue]
Day 29: end-of-month reflection post
Day 30: retrospective thread`,
    metric: "Follower growth 50/week, 3–5 replies per post, 1 post goes >500 impressions each week",
  },

  {
    id: "social-weekly-digest",
    pillar: "social",
    title: "Post weekly metric digests publicly (Fridays)",
    why: "Public metrics force honesty, attract fellow builders, and give you a recurring content hook. See Arvid Kahl, Pieter Levels, Daniel Vassallo.",
    channel: "X, LinkedIn",
    effort: "S",
    scheduled: "Every Friday",
    copy: `Template:
Week [N] building MyFeed in public 📊

signups: [x] (+y from last week)
feeds created: [x]
daily active: [x]
email opt-ins: [x]
top feed: [name]
cost: $[x]/mo

what surprised me: [one sentence]
what I'm changing: [one sentence]

myfeed.space`,
    metric: "Thread each Friday. Reply rate should climb as audience grows.",
  },

  {
    id: "social-reply-guy",
    pillar: "social",
    title: "3 thoughtful replies/day in your niche",
    why: "Unnatural-looking promotional posts fail. Thoughtful replies under bigger accounts expose you to their audience without feeling like ads.",
    channel: "X",
    effort: "S",
    scheduled: "Daily, 15 min/day",
    copy: `Target accounts (replace with your actual niche):
• @rauchg, @leeerob (Next.js)
• @ArvidKahl, @levelsio (indie SaaS)
• @simonw, @marvinvon (AI tooling)
• @feedly, @inoreader (competitors — reply with nuance, not attacks)

Rules:
1. Reply only if you have a genuine thought. No "great post!"
2. Share a concrete experience from building MyFeed when relevant.
3. Never link your product in a reply. Your bio does that.
4. Screenshot/quote-tweet big posts with your own angle.

Bad: "Great point! Check out MyFeed at myfeed.space"
Good: "This resonates — I hit the same wall building MyFeed. My solution was [specific thing]. Still not sure it's right because [honest doubt]."`,
    metric: "2+ new followers per day from replies",
  },
];

// ==================================================================
// CONTENT & SEO
// ==================================================================

const CONTENT: MarketingTask[] = [
  {
    id: "content-feedly-alternative",
    pillar: "content",
    title: "Blog: 'Feedly alternatives in 2026: honest comparison'",
    why: '"Feedly alternative" is a high-intent search query. A fair comparison article (including Feedly\'s strengths!) ranks well and converts.',
    channel: "Blog + myfeed.space/blog",
    effort: "L",
    scheduled: "Week 1 post-launch",
    copy: `Outline:
# Feedly alternatives in 2026: honest comparison (written by the founder of one of them)

## TL;DR
If you love manual curation, stick with Feedly or move to Inoreader. If you want to describe a topic and have an AI aggregate for you, MyFeed is probably what you want. Skip Reeder if you need cross-device sync without iCloud.

## What Feedly does well
- Manual curation is unbeatable if you know your sources.
- Pro tier (AI summaries) is legit.
- OPML import is still the gold standard.

## Where Feedly falls short for me
- Source picking is a barrier for new users.
- AI features are locked behind Pro.
- Mobile reading experience feels dated.

## Alternatives worth trying
| Tool | Best for | Trade-off |
| Inoreader | Power users who want filters | Complex UI |
| Reeder | Apple ecosystem readers | Apple-only sync |
| NetNewsWire | Free + open-source fans | No cloud sync |
| Miniflux | Self-hosters | Requires server |
| MyFeed | "Just describe what I want" users | Not self-hostable (yet) |

## When MyFeed is the right pick
(Describe your product honestly — who it's NOT for too.)

## My biased conclusion
(End with a link and a "try in 30 seconds, no signup" CTA.)

Word count target: 1,800–2,500.
Publish on myfeed.space/blog/feedly-alternatives-2026.
Schema.org markup for comparison table.
Internal links to product pages.`,
    metric: "Rank top 10 for 'feedly alternative' in 3 months. 500+ visits/mo from organic.",
  },

  {
    id: "content-how-i-built",
    pillar: "content",
    title: "Technical post: 'How I built MyFeed with 180 lines of TS and $3/mo'",
    why: "HN/Lobsters/Reddit love detailed technical writeups. Builds credibility, drives tech-forward users who will give feedback.",
    channel: "Blog + HN/Lobsters",
    effort: "L",
    scheduled: "Week 2",
    copy: `Hook: I replaced a 674-line 2-pass AI classifier with 180 lines and cut costs 20x. Here's how.

Outline:
1. The problem (matching articles to user feed prompts)
2. Attempt #1: 2-pass pipeline (classify → re-rank). Why it was wrong.
3. Attempt #2: single-pass with JSON schema. Why it works.
4. The cost math (gpt-5-nano, batch sizes, skip-already-classified)
5. What I'd do differently

Include: code snippets, actual cost numbers, Mixpanel charts.
Publish on Dev.to + myfeed.space/blog + post to HN as Show HN style.`,
    metric: "100+ HN points or front page Lobsters",
  },

  {
    id: "content-seo-pages",
    pillar: "content",
    title: "Programmatic SEO: /feeds/[topic] pages",
    why: "Every category feed has a URL. Optimize those for SEO. 'Best AI news aggregator' → /ai with proper title/meta/H1. Scales to hundreds of long-tail queries.",
    channel: "myfeed.space",
    effort: "M",
    scheduled: "Week 2",
    copy: `Implementation:
- Each feed page (/ai, /tech, /startups, etc.) gets:
  - <title>: "AI news aggregator — curated by MyFeed"
  - <meta description>: "500+ AI news articles curated daily from Reddit, DEV, Medium, Bloomberg, YouTube. Free, no signup."
  - <h1>: "AI & ML"
  - JSON-LD ItemList schema with top 10 articles
- Sitemap.xml lists every public feed slug
- Internal links from blog posts to relevant feeds
- Create 20 more feeds for long-tail queries: /react, /python, /ml, /devops, /crypto-news, /climate, etc.

Don't go overboard — 30 well-optimized pages > 300 thin pages.`,
    metric: "+200 indexed pages in Google Search Console, 100+ clicks/day from organic in 90 days",
  },

  {
    id: "content-comparison",
    pillar: "content",
    title: "Comparison pages (vs Feedly, vs Inoreader, vs Reeder)",
    why: "High commercial intent. People searching 'MyFeed vs Feedly' are evaluating. Give them an honest table.",
    channel: "myfeed.space/compare",
    effort: "M",
    scheduled: "Week 3",
    copy: `Pages:
- /compare/myfeed-vs-feedly
- /compare/myfeed-vs-inoreader
- /compare/myfeed-vs-reeder

Template per page:
- H1: "MyFeed vs [Competitor]: honest comparison (2026)"
- When to pick each (honest)
- Feature comparison table
- Pricing comparison
- "Try MyFeed free" CTA`,
    metric: "Rank page 1 for each comparison in 6 months",
  },

  {
    id: "content-youtube",
    pillar: "content",
    title: "YouTube: 2-min demo video",
    why: "A real video on the landing page lifts conversion. YouTube doubles as a discovery channel.",
    channel: "YouTube + hero",
    effort: "M",
    scheduled: "Week 1",
    copy: `Script (2 min):
0:00 — problem (Feedly clutter, Twitter algorithm, newsletter piles)
0:20 — demo: type prompt, get feed
0:50 — how it works (sources, LLM scoring, guest mode)
1:20 — email digest
1:40 — "try at myfeed.space, no signup"
2:00 — end card: subscribe for build-in-public updates

Embed on homepage ABOVE the fold (replace static screenshot).
Title: "MyFeed demo — AI feed reader from a prompt (60 seconds)"
Description: lots of keywords, link to site, link to PH/HN launches.`,
    metric: "1,000 views in first month. Homepage conversion lifts 10–20%.",
  },
];

// ==================================================================
// COMMUNITIES
// ==================================================================

const COMMUNITIES: MarketingTask[] = [
  {
    id: "community-indie-discord",
    pillar: "communities",
    title: "Join 5 active indie/SaaS Discord servers",
    why: "More intimate than Twitter. Regular presence = people root for you. Contribute before you pitch.",
    channel: "Discord",
    effort: "S",
    scheduled: "Week 1",
    copy: `Join:
• Indie Hackers Discord (official)
• MegaMaker (Justin Jackson's community — paid but worth it)
• WIP Chat (need to apply)
• Starter Story Discord
• Buildspace (if still active)

Rules:
1. Lurk 3 days. Get the vibe. Who's helpful, who's a spam bot.
2. Introduce yourself in #introductions with one paragraph. Link to product only if asked.
3. Answer 5 questions before asking any. Screenshot wins → post in #wins once a week.
4. Never paste launch links cold. Ask if a channel is OK first.`,
    metric: "30+ meaningful interactions/week",
  },

  {
    id: "community-newsletters",
    pillar: "communities",
    title: "Get featured in indie newsletters",
    why: "Each feature = 200–5,000 eyeballs from people actively looking for products to try.",
    channel: "Newsletter submissions",
    effort: "M",
    scheduled: "Weeks 1–4 rolling",
    copy: `Submit to (free submission forms, no payment needed):
• Hacker Newsletter (hackernewsletter.com)
• Refind weekly (refind.com)
• Indie Hackers Weekly
• Sidebar.io (design/dev)
• BetaList (betalist.com)
• Savvycal "Tools we love" if applicable
• Ben's Bites (AI newsletter)
• Product Hunt Daily Digest (automatic if you launch)
• The Hustle Finds
• Growth.Design newsletter

Paid (consider ONLY after you have traction):
• Morning Brew Recommends
• TLDR Newsletter sponsorships
• Refind boosts

Template for each submission:
Name: MyFeed
Tagline: Create custom AI feeds from any prompt
URL: https://myfeed.space
Description: [50–100 words, tailored to each newsletter's audience]
Demo: [link to Loom]
Why now: "Launched on PH on [date], got to #[rank]"`,
    metric: "Featured in 3+ newsletters in month 1",
  },

  {
    id: "community-awesome",
    pillar: "communities",
    title: "Add MyFeed to relevant GitHub 'awesome' lists",
    why: "Evergreen traffic. Some awesome lists have 30k+ stars.",
    channel: "GitHub PRs",
    effort: "S",
    scheduled: "Week 2",
    copy: `Search for and submit PRs to:
• awesome-rss-readers
• awesome-feed-readers
• awesome-saas
• awesome-web-tools
• awesome-ai-tools
• awesome-productivity

PR format:
Add line alphabetically: "[MyFeed](https://myfeed.space) — AI-curated feeds from a plain-English prompt, free tier available."

Follow contribution guidelines strictly. Some require a justification comment.`,
    metric: "5+ merged PRs in month 1",
  },

  {
    id: "community-reply-value",
    pillar: "communities",
    title: "Answer 'what feed reader should I use?' questions",
    why: "Evergreen keyword on Quora, Reddit, StackExchange. One good answer ranks for years.",
    channel: "Quora, Reddit, SE",
    effort: "S",
    scheduled: "Ongoing",
    copy: `Search queries to set alerts for:
• "feedly alternative"
• "best rss reader"
• "ai feed reader"
• "curated news app"
• "news without algorithm"

Template answer:
"Depends on what you need:
- Know your sources, want manual curation: Feedly/Inoreader.
- Want to describe a topic and get the good stuff: MyFeed (I built this — myfeed.space). It's free and you don't need an account to try.
- Apple ecosystem only: Reeder.
- Self-host: Miniflux.

If you try MyFeed, drop a comment with your prompt and whether the result was good. Iterating on real feedback."`,
    metric: "1 answer/week, 5+ upvotes each",
  },

  {
    id: "community-influencers",
    pillar: "communities",
    title: "Reach out to 10 relevant micro-influencers",
    why: "10k-follower accounts in your niche convert better than 500k celebrity accounts. DM with value, not asks.",
    channel: "X, YouTube DMs, email",
    effort: "M",
    scheduled: "Week 2",
    copy: `Targets (people who post about productivity / indie SaaS / tools):
• Tech YouTubers who review tools (search "feedly review" on YT, filter recent)
• Newsletter operators (~5k subs) in tech/AI
• Reddit mods of r/rss, r/Feedly (they're power users)

Template DM:
"Hey [name] — saw your post on [specific thing they made recently]. I built MyFeed, a prompt-based feed reader that might interest your audience. Won't pitch hard — just wanted to offer early access + my time if you want to cover it. Happy to be a source for any 'feed reader alternatives' piece too. Link: myfeed.space. No worries if not a fit."

10 DMs → 2 replies → 1 feature = great ROI.`,
    metric: "1 micro-influencer feature in month 1",
  },
];

// ==================================================================
// ONBOARDING / FIRST-TIME EXPERIENCE
// ==================================================================

const ONBOARDING: MarketingTask[] = [
  {
    id: "onboard-popular-prompts",
    pillar: "onboarding",
    title: "Add 'popular prompts' chips below hero input",
    why: "Biggest guest-experience improvement. Users see the input and freeze — they don't know what to type. Pre-filled examples solve this.",
    channel: "Site",
    effort: "S",
    copy: `Design:
Under the "Create my feed" input, a horizontal scroll of chips:
"React + Next.js" · "AI tools" · "SpaceX" · "Python tutorials" · "Startup funding" · "Climate tech" · "Rust" · "Prompt engineering"

Clicking a chip → fills input + auto-submits.
Track event: hero_prompt_chip_click { prompt }

Measurement:
% of feed creations originated from a chip. If >50%, this was the right call.`,
    metric: "Hero → feed creation conversion up 30%+",
  },

  {
    id: "onboard-demo-video",
    pillar: "onboarding",
    title: "Embed 30s autoplaying demo above the fold",
    why: "Landing copy tells, video shows. Autoplaying, muted, looping = best for showing the magic moment.",
    channel: "Site",
    effort: "M",
    copy: `Implementation:
- Record a 15–30s GIF/MP4: user types prompt → hits enter → feed appears.
- Place it ABOVE the feed grid on the homepage.
- Autoplay, muted, loop, no controls.
- Mobile: smaller aspect, or hidden if it slows LCP.
- Fallback static image for prefers-reduced-motion.

Track: hero_video_impression, hero_video_watch_complete`,
    metric: "Homepage → feed-create conversion up 15%+",
  },

  {
    id: "onboard-empty-state",
    pillar: "onboarding",
    title: "Fix empty-feed state with retry + prompt-tuning tips",
    why: "If a new custom feed returns 0 articles in the first 30s, users bounce. Currently there's no guidance.",
    channel: "Site — /my/[id]",
    effort: "M",
    copy: `Replace empty state with:
- Spinner + "Finding posts… usually takes 15–45s"
- Progress text: "Scanning 1,000 sources…"
- If 0 results after 60s: "No great matches yet. Your prompt might be too specific — try broadening it, e.g. 'Python web dev' instead of 'Django 5.1 async ORM patterns'."
- Provide an "Edit prompt" button right in the empty state.
- Show what was searched.`,
    metric: "Drop-off at first-feed-view cut in half",
  },

  {
    id: "onboard-signup-timing",
    pillar: "onboarding",
    title: "Soft signup prompt after 3 article interactions",
    why: "Don't ask for signup until after value is received. After 3 likes/reactions, show a gentle inline card offering email digest.",
    channel: "Site",
    effort: "M",
    copy: `Trigger: user has reacted/saved 3+ articles in a session.
Placement: inline card in the feed (not a modal).
Copy: "Enjoying this feed? Get it in your inbox daily. [Enter email + send me digests]"
One field: email. One button. Auto-create account. Auto-enable digest.
If dismissed, don't show again for 7 days (localStorage + user id).

Track: soft_signup_shown, soft_signup_dismissed, soft_signup_completed`,
    metric: "30%+ of active sessions convert to email signup",
  },

  {
    id: "onboard-share",
    pillar: "onboarding",
    title: "Shareable feed URLs + 'Share this feed' CTA",
    why: "A custom feed is a shareable artifact. 'Look at the feed I made for [topic]' is inherently viral.",
    channel: "Site — /my/[id], feed page",
    effort: "M",
    copy: `Implementation:
- When a custom feed is public-readable, add a Share button.
- Share opens a sheet with: copy link, post to X (pre-filled tweet), post to LinkedIn.
- Pre-filled tweet: "I made a custom MyFeed for [prompt] — the AI curates the good stuff from 1,000+ sources. [link]"

Also: make custom feeds public by default (owner can make private), so any shared link works without auth.`,
    metric: "5%+ of feed creations result in a shared link",
  },

  {
    id: "onboard-welcome-email",
    pillar: "onboarding",
    title: "Welcome email sequence",
    why: "First 72 hours after signup is when retention is won or lost. A 3-email sequence dramatically improves D7 retention.",
    channel: "Email — Resend",
    effort: "M",
    copy: `Email 1 (immediate):
Subject: Welcome to MyFeed — your first feed is ready
Body: "Your [prompt] feed is live at [link]. Here's how to get the most out of it: [3 tips]. Reply to this email if you hit anything confusing — it goes to my personal inbox."

Email 2 (day 2):
Subject: 3 prompts other people are loving right now
Body: "The top community-created feeds this week: [3 examples with links]. Try any of them — no extra signup needed."

Email 3 (day 5):
Subject: Want daily digests? I can send one.
Body: "You haven't enabled email digests yet. Takes one click: [CTA]. You can unsubscribe anytime."

Build with Resend + Supabase cron (you already have both).
A/B test subject lines.`,
    metric: "D7 retention up to 35%+",
  },

  {
    id: "onboard-landing-rewrite",
    pillar: "onboarding",
    title: "Rewrite landing headline for clarity",
    why: "'Your Internet, Curated by AI' is poetic but vague. 'Create custom AI feeds from any topic' is clearer. Test both.",
    channel: "Site",
    effort: "S",
    copy: `Test variants (split-test with simple localStorage-bucketed users):
A (current): "Your Internet, Curated by AI"
B: "Create custom feeds from any topic — AI does the curation"
C: "Describe a topic, get a curated feed from 1,000+ sources"
D: "The feed reader where you type a prompt instead of picking sources"

Winner = whichever has highest CTR on "Create my feed".
Track: headline_variant_seen, headline_variant_converted`,
    metric: "Hero CTR +20%",
  },

  {
    id: "onboard-proof",
    pillar: "onboarding",
    title: "Add social proof ('join N others reading')",
    why: "If you have ANY signups at all, surface the number. Even 'Used by 143 people this week' beats 'Free to try'.",
    channel: "Site — hero",
    effort: "S",
    copy: `Placement: small line under the create-feed banner.
Dynamic (read from Supabase daily aggregate):
"Join 143 people reading custom feeds this week"
"2,104 articles curated in the last 24 hours"
"Top feed today: AI & ML (412 readers)"

Or static trust badges:
• "As seen on Product Hunt" (after PH launch)
• "Featured in [newsletter]" (after feature)

Avoid fake numbers. Real ones — even small — build trust.`,
    metric: "Not directly measurable, but feels legit",
  },
];

// ==================================================================
// METRICS
// ==================================================================

const METRICS: MarketingTask[] = [
  {
    id: "metrics-live",
    pillar: "metrics",
    title: "Live metrics from Supabase",
    why: "Auto-populated below. This card is informational.",
    effort: "S",
    metric: "See live numbers above",
  },
  {
    id: "metrics-funnels",
    pillar: "metrics",
    title: "Define 3 core Mixpanel funnels",
    why: "Most analytics dashboards are vanity. Define 3 funnels that actually predict success: Activation, Retention, Referral.",
    channel: "Mixpanel",
    effort: "S",
    copy: `Funnels to build in Mixpanel (project 4014893):

1. Activation: Page View → feed_refresh or article_click → signup
   Goal: 15%+ of visitors convert to signup.

2. Custom feed creation: Page View → hero_create_feed → feed_created successfully
   Goal: 20% of visitors create a custom feed.

3. Retention: signup → returns within 7 days with article_click
   Goal: 35%+ D7 retention.

Additional metrics to watch weekly:
- Email opt-in rate among signed-up users
- Article reaction rate per session
- Top-5 prompts used in custom feed creation`,
    links: [{ label: "Mixpanel MyFeed project", url: "https://mixpanel.com/project/4014893" }],
  },
];

// ==================================================================
// EXPORT
// ==================================================================

export const MARKETING_TASKS: MarketingTask[] = [
  ...LAUNCH,
  ...SOCIAL,
  ...CONTENT,
  ...COMMUNITIES,
  ...ONBOARDING,
  ...METRICS,
];

export function tasksByPillar(pillar: Pillar): MarketingTask[] {
  return MARKETING_TASKS.filter((t) => t.pillar === pillar);
}
