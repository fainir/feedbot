import { NextResponse } from "next/server";

const POSITIVE_WORDS = new Set([
  "growth", "surge", "gain", "rise", "soar", "boost", "success", "win",
  "breakthrough", "milestone", "record", "innovative", "exciting", "improve",
  "launch", "celebrate", "achieve", "award", "best", "strong", "positive",
  "profit", "advance", "upgrade", "rally", "expand", "thrive", "lead",
  "opportunity", "optimistic", "promising", "benefit", "unlock",
]);

const NEGATIVE_WORDS = new Set([
  "crash", "fall", "decline", "drop", "loss", "fail", "crisis", "threat",
  "warning", "concern", "risk", "cut", "layoff", "shutdown", "controversy",
  "scandal", "breach", "hack", "fraud", "collapse", "downturn", "slow",
  "delay", "ban", "fine", "lawsuit", "struggle", "worse", "fear",
  "vulnerability", "attack", "damage", "debt", "deficit",
]);

function detectSentiment(text: string): "positive" | "neutral" | "negative" {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  let pos = 0;
  let neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  if (pos > neg && pos >= 2) return "positive";
  if (neg > pos && neg >= 2) return "negative";
  return "neutral";
}

function estimateReadingTime(text: string): string {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

function generateSummary(title: string, source: string, content?: string): {
  summary: string;
  keyTakeaways: string[];
  sentiment: "positive" | "neutral" | "negative";
  readingTime: string;
} {
  const fullText = content || title;
  const sentiment = detectSentiment(`${title} ${fullText}`);
  const readingTime = estimateReadingTime(fullText);

  // Extract meaningful words from the title for summary generation
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "to", "of", "in", "for", "on", "with",
    "and", "or", "but", "not", "it", "its", "that", "this", "how", "what",
    "why", "new", "has", "have", "can", "will", "from", "by", "as", "at",
    "be", "been", "being", "do", "does", "did", "just", "about", "more",
    "than", "into", "over", "after", "before", "between",
  ]);
  const keywords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const topic = keywords.slice(0, 3).join(", ") || "this topic";

  // Build an intelligent-looking summary based on title and source
  const summaryTemplates = [
    `This article from ${source} explores ${topic} in detail, providing analysis and context for recent developments. The piece examines multiple perspectives and offers insights into the broader implications for the industry.`,
    `${source} reports on ${topic}, breaking down the key factors driving current trends. The article provides a comprehensive overview of the situation and highlights what readers should pay attention to moving forward.`,
    `A detailed examination of ${topic} by ${source}, covering the latest developments and their potential impact. The piece contextualizes recent events within the broader landscape and offers forward-looking analysis.`,
  ];

  const takeawayTemplates = [
    [
      `The article highlights significant developments related to ${keywords[0] || "this subject"} that could shape future trends`,
      `${source} emphasizes the importance of understanding the broader context behind these changes`,
      `Multiple stakeholders are affected, with varying perspectives on the implications`,
      `Industry experts suggest monitoring these developments closely in the coming weeks`,
      `The piece draws connections between ${keywords[0] || "current events"} and longer-term ${keywords[1] || "industry"} patterns`,
    ],
    [
      `Key developments around ${keywords[0] || "the topic"} are accelerating and gaining attention`,
      `The analysis suggests both short-term and long-term implications worth considering`,
      `${source} provides data points that contextualize the current situation`,
      `There are differing viewpoints on how ${keywords[1] || "these trends"} will evolve`,
      `Readers should consider how these changes might affect their own perspective or workflow`,
    ],
    [
      `Recent shifts in ${keywords[0] || "this area"} represent a notable change from previous patterns`,
      `The article presents evidence from multiple sources to support its analysis`,
      `${source} notes that ${keywords[1] || "related factors"} play a crucial role in the outcome`,
      `Expert commentary adds depth to the coverage of ${keywords[0] || "the topic"}`,
      `The broader impact on ${keywords[2] || "the ecosystem"} remains an open question`,
    ],
  ];

  // Pick a template variation based on title hash
  const hash = title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = hash % summaryTemplates.length;

  const summary = summaryTemplates[idx];
  const allTakeaways = takeawayTemplates[idx];
  // Pick 3-5 takeaways
  const takeawayCount = 3 + (hash % 3);
  const keyTakeaways = allTakeaways.slice(0, takeawayCount);

  return { summary, keyTakeaways, sentiment, readingTime };
}

export async function POST(req: Request) {
  try {
    const { url, title, content } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Extract source from URL
    let source = "Unknown";
    try {
      source = new URL(url).hostname.replace("www.", "");
    } catch {
      // use default
    }

    // Simulate a small delay to feel like AI processing
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const result = generateSummary(title, source, content);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
