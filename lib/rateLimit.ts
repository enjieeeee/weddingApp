// Best-effort in-memory limiter. On serverless each instance has its own memory,
// so this stops casual abuse, not a distributed attack.
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

// Remembers recent submission keys so a retry or double-click does not write twice.
const seen = new Map<string, { at: number; count: number }>();
const SEEN_TTL_MS = 10 * 60 * 1000;

export function getDuplicate(id: string): number | null {
  const hit = seen.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > SEEN_TTL_MS) {
    seen.delete(id);
    return null;
  }
  return hit.count;
}

export function rememberSubmission(id: string, count: number) {
  seen.set(id, { at: Date.now(), count });
  if (seen.size > 2000) {
    const cutoff = Date.now() - SEEN_TTL_MS;
    for (const [k, v] of seen) if (v.at < cutoff) seen.delete(k);
  }
}
