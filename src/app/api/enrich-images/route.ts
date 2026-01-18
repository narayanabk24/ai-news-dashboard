import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

export async function GET() {
  return NextResponse.json({ ok: true, route: "enrich-images" });
}

function absUrl(maybeUrl: string, base: string) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

async function fetchOgImage(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, {
    cache: "no-store",
    // some sites block without UA
    headers: {
      "user-agent": "Mozilla/5.0 (AI-News-Dashboard)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);

  const og =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:url"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[name="twitter:image:src"]').attr("content") ||
    null;

  if (!og) return null;
  return absUrl(og, pageUrl);
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // pull recent articles missing images
  const { data: articles, error } = await supabase
    .from("articles_raw")
    .select("id,url")
    .is("image_url", null)
    .order("published_at", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  const failures: Array<{ url: string; reason: string }> = [];

  for (const a of articles ?? []) {
    try {
      const img = await fetchOgImage(a.url);
      if (!img) continue;

      const { error: upErr } = await supabase
        .from("articles_raw")
        .update({ image_url: img })
        .eq("id", a.id);

      if (upErr) throw new Error(upErr.message);
      updated += 1;
    } catch (e: any) {
      failures.push({ url: a.url, reason: e?.message ?? "unknown error" });
    }
  }

  return NextResponse.json({ checked: articles?.length ?? 0, updated, failures });
}
