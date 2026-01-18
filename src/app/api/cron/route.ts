import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Works on Vercel + local, no env var needed
  const base = req.nextUrl.origin;

  await fetch(`${base}/api/ingest`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/enrich-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/cache-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/enrich-ai`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/email-digest`, { method: "POST", cache: "no-store" });

  return NextResponse.json({ ok: true });
}
