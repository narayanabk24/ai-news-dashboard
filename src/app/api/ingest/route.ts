import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "AI-News-Dashboard/1.0" },
});

const MAX_ITEMS_PER_SOURCE = 10;

async function withTimeout<T>(p: Promise<T>, ms: number) {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sources, error: sourceErr } = await supabase
    .from("sources")
    .select("id,name,url")
    .eq("enabled", true);

  if (sourceErr) {
    return NextResponse.json({ error: sourceErr.message }, { status: 500 });
  }

  let attempted = 0;
  const failures: Array<{ source: string; reason: string }> = [];

  for (const s of sources ?? []) {
    try {
      const feed = await withTimeout(parser.parseURL(s.url), 8000);
      const items = feed.items ?? [];

      const rows = items
        .slice(0, MAX_ITEMS_PER_SOURCE)
        .map((item) => {
          const title = item.title ?? "";
          const url = item.link ?? "";
          const published = item.isoDate ?? item.pubDate ?? null;
          const excerpt =
            (item.contentSnippet ??
              item.content ??
              item.summary ??
              "")?.toString() || null;

          if (!title || !url) return null;
            
          const image =
            (item.enclosure && item.enclosure.url) ||
            (item["media:content"] && item["media:content"].url) ||
            null;

        return {
            source_id: s.id,
            title,
             url,
            published_at: published ? new Date(published).toISOString() : null,
            content_excerpt: excerpt,
            image_url: image,
            };
        })
        .filter(Boolean) as any[];

      if (rows.length > 0) {
        // one DB call per source
        const { error: batchErr } = await supabase
          .from("articles_raw")
          .upsert(rows, { onConflict: "url", ignoreDuplicates: true });

        if (batchErr) throw new Error(batchErr.message);

        attempted += rows.length;
      }
    } catch (e: any) {
      failures.push({ source: s.name, reason: e?.message ?? "unknown error" });
    }
  }

  return NextResponse.json({ attempted, failures });
}
