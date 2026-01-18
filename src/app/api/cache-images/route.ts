import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function extFromContentType(ct: string | null) {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  return "jpg";
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "cache-images" });
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get recent articles that have og:image but not yet cached
  const { data: articles, error } = await supabase
    .from("articles_raw")
    .select("id,url,image_url,image_storage_url")
    .not("image_url", "is", null)
    .is("image_storage_url", null)
    .order("published_at", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let cached = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const a of articles ?? []) {
    try {
      const imgUrl = a.image_url as string;
      const articleUrl = a.url as string;

      // Download image server-side (often succeeds even when browser hotlink fails)
      const imgRes = await fetch(imgUrl, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (AI-News-Dashboard)",
          // some CDNs require a referrer
          referer: articleUrl,
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });

      if (!imgRes.ok) {
        throw new Error(`image fetch failed: ${imgRes.status}`);
      }

      const contentType = imgRes.headers.get("content-type");
      const ext = extFromContentType(contentType);
      const buf = Buffer.from(await imgRes.arrayBuffer());

      // Optional: skip tiny "tracking pixel" images
      if (buf.length < 8_000) {
        throw new Error(`image too small (${buf.length} bytes)`);
      }

      const path = `articles/${a.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("news-images")
        .upload(path, buf, {
          contentType: contentType ?? "image/jpeg",
          upsert: true,
        });

      if (upErr) throw new Error(`upload failed: ${upErr.message}`);

      const { data: pub } = supabase.storage.from("news-images").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("articles_raw")
        .update({ image_storage_url: publicUrl })
        .eq("id", a.id);

      if (dbErr) throw new Error(`db update failed: ${dbErr.message}`);

      cached += 1;
    } catch (e: any) {
      failures.push({ id: String(a.id), reason: e?.message ?? "unknown error" });
    }
  }

  return NextResponse.json({
    checked: articles?.length ?? 0,
    cached,
    failures,
  });
}
