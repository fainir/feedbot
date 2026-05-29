import OpenAI from "openai";

// 512-dim text-embedding-3-small: the cost-effective retrieval embedding.
// $0.02 / 1M tokens — embedding the full ~10k/day article intake costs a
// few cents/day, cheaper than the per-article LLM classify it replaces.
const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIMS = 512;

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// OpenAI accepts up to 2048 inputs/request; stay well under to bound payload.
const BATCH = 256;

/**
 * Embed a list of texts. Returns one vector per input (same order), or null
 * for the whole call if embeddings are unavailable. Empty/blank inputs get a
 * zero vector so indices stay aligned with the caller's array.
 */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const client = getClient();
  if (!client) return null;
  if (texts.length === 0) return [];

  const out: number[][] = new Array(texts.length);
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    // OpenAI rejects empty strings; substitute a single space and let the
    // near-zero-signal vector sort itself out at retrieval time.
    const cleaned = slice.map((t) => (t && t.trim().length > 0 ? t.slice(0, 8000) : " "));
    const res = await client.embeddings.create({
      model: EMBED_MODEL,
      input: cleaned,
      dimensions: EMBED_DIMS,
    });
    for (let j = 0; j < res.data.length; j++) {
      out[i + j] = res.data[j].embedding;
    }
  }
  return out;
}

/** Embed a single text (e.g. a feed prompt). Returns null if unavailable. */
export async function embedOne(text: string): Promise<number[] | null> {
  const r = await embedTexts([text]);
  return r ? r[0] : null;
}

/** pgvector literal: a bracketed CSV string, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/**
 * The text we embed for an article — title carries the most signal; a short
 * summary slice adds context without diluting it.
 */
export function articleEmbedText(a: { title?: string | null; summary?: string | null }): string {
  const title = (a.title || "").trim();
  const summary = (a.summary || "").trim().slice(0, 300);
  return summary ? `${title}\n${summary}` : title;
}
