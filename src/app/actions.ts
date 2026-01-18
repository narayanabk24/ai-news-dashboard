"use server";

export async function ingestNow() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";

  await fetch(`${base}/api/ingest`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/enrich-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/cache-images`, { method: "POST", cache: "no-store" });

  // Try AI summaries first
  const aiRes = await fetch(`${base}/api/enrich-ai`, { method: "POST", cache: "no-store" });

  // If AI fails (quota/rate/etc.), use fallback summaries
  if (!aiRes.ok) {
    await fetch(`${base}/api/enrich-fallback`, { method: "POST", cache: "no-store" });
  }
}
