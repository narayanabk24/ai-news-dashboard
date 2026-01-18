import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("articles_raw")
    .select("id,title,url,published_at,image_storage_url,articles_ai(summary,topics)")
    .order("published_at", { ascending: false })
    .limit(5);

  const items = (data ?? []).map((a: any) => {
    const ai = a.articles_ai?.[0];
    const topics = ai?.topics?.length ? ai.topics.join(", ") : "AI";
    const summary = ai?.summary ?? "";
    return `
      <div style="margin:14px 0;">
        <div style="font-weight:700">${a.title}</div>
        <div style="color:#555;font-size:12px;margin-top:4px">${topics}</div>
        <div style="margin-top:6px;color:#222">${summary}</div>
        <div style="margin-top:8px"><a href="${a.url}">Read →</a></div>
      </div>
    `;
  }).join("");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>AI News Digest</h2>
      ${items}
    </div>
  `;

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: process.env.DIGEST_FROM_EMAIL!,
    to: process.env.DIGEST_TO_EMAIL!,
    subject: "AI News Digest",
    html,
  });

  return NextResponse.json({ sent: true });
}
