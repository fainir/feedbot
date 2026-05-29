import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { embedTexts, toVectorLiteral, articleEmbedText } from "@/lib/embeddings";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  if (!secret || secret.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Embed article_pool rows that don't have an embedding yet, newest first
// (fresh content matters most for feeds). Bounded by a wall-clock budget so
// it fits inside a cron tick; callable repeatedly to drain a backlog.
const PAGE = 256;
const MAX_PAGES = 12; // up to ~3,000 rows/call
const TIME_BUDGET_MS = 150_000;
const RECENCY_DAYS = 7;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 3600_000).toISOString();
  const startedAt = Date.now();
  let embedded = 0;
  let pages = 0;

  while (pages < MAX_PAGES && Date.now() - startedAt < TIME_BUDGET_MS) {
    pages++;
    const { data: rows } = await supabase
      .from("article_pool")
      .select("id, title, summary")
      .is("embedding", null)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(PAGE);

    if (!rows || rows.length === 0) break;

    const vectors = await embedTexts(rows.map((r) => articleEmbedText(r)));
    if (!vectors) break; // embeddings unavailable — stop cleanly

    // Update rows. Chunk the concurrent updates so we don't exhaust the
    // connection pool.
    const updates = rows.map((r, i) => ({ id: r.id, embedding: toVectorLiteral(vectors[i]) }));
    for (let i = 0; i < updates.length; i += 25) {
      const chunk = updates.slice(i, i + 25);
      await Promise.all(
        chunk.map((u) =>
          supabase.from("article_pool").update({ embedding: u.embedding }).eq("id", u.id),
        ),
      );
    }
    embedded += rows.length;

    if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
      (global as { gc: () => void }).gc();
    }

    if (rows.length < PAGE) break;
  }

  return NextResponse.json({ embedded, pages });
}
