"use server";

import { headers } from "next/headers";

async function baseUrlFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  // local dev fallback
  if (!host) return "http://127.0.0.1:3000";
  return `${proto}://${host}`;
}

export async function ingestNow() {
  const base = baseUrlFromHeaders();

  await fetch(`${base}/api/ingest`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/enrich-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/cache-images`, { method: "POST", cache: "no-store" });
  await fetch(`${base}/api/enrich-ai`, { method: "POST", cache: "no-store" });
}
