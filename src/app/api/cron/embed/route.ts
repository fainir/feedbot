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
// (fresh content matters most for feeds). Bounded so it stays gentle on the
// instance's Disk IO budget — embedding writes maintain the HNSW index,
// which is write-amplifying. We only embed the last few days (news value is
// concentrated there anyway) so the cron doesn't perpetually grind the
// older tail, and cap rows/tick to keep write IO modest.
const PAGE = 256;
const MAX_PAGES = 6; // up to ~1,500 rows/call
const TIME_BUDGET_MS = 120_000;
const RECENCY_DAYS = 3;

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

    const literals = vectors.map((v) => toVectorLiteral(v));
    // Fast path: one bulk UPDATE per page via unnest() (256 round-trips → 1).
    const { error } = await supabase.rpc("set_article_embeddings", {
      p_ids: rows.map((r) => r.id),
      p_embeddings: literals,
    });
    if (error) {
      // Fallback (e.g. the RPC migration hasn't landed yet): chunked
      // individual updates. Slower but keeps embedding working.
      for (let i = 0; i < rows.length; i += 25) {
        const chunk = rows.slice(i, i + 25);
        await Promise.all(
          chunk.map((r, j) =>
            supabase.from("article_pool").update({ embedding: literals[i + j] }).eq("id", r.id),
          ),
        );
      }
    }
    embedded += rows.length;

    if (typeof global !== "undefined" && (global as { gc?: () => void }).gc) {
      (global as { gc: () => void }).gc();
    }

    if (rows.length < PAGE) break;
  }

  return NextResponse.json({ embedded, pages });
}
