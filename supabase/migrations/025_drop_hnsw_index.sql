-- Drop the dormant HNSW vector index.
--
-- The semantic feed path (EVO_SEMANTIC) is gated OFF: it was too IO-heavy
-- for free-tier Supabase (HNSW write amplification saturated the instance).
-- With it off, nothing writes embeddings, so the index is dead weight — but
-- normal autovacuum on article_pool (driven by scan inserts + prune deletes)
-- still has to process the HNSW index, which is expensive and risks
-- re-triggering the IO exhaustion. Drop it. If semantic feeds are re-enabled
-- on paid compute, recreate it then.
drop index if exists public.idx_article_pool_embedding_hnsw;
