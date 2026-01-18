import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";

  // 1) ingest
  await fetch(`${base}/api/ingest`, { method: "POST", cache: "no-store" });

  // 2) enrich images + cache to storage
  await fetch(`${base}/api/enrich-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/cache-images`, { method: "POST", cache: "no-store" });

  // 3) AI summaries (now billing fixed)
  await fetch(`${base}/api/enrich-ai`, { method: "POST", cache: "no-store" });

  // 4) Email digest (we’ll add route below)
  await fetch(`${base}/api/email-digest`, { method: "POST", cache: "no-store" });

  return NextResponse.json({ ok: true });
}
