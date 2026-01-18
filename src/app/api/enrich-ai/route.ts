import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing in .env.local" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) Pull recent articles
  const { data: recent, error: recentErr } = await supabase
    .from("articles_raw")
    .select("id,title,content_excerpt,published_at")
    .order("published_at", { ascending: false })
    .limit(50);

  if (recentErr) {
    return NextResponse.json({ error: recentErr.message }, { status: 500 });
  }

  const ids = (recent ?? []).map((a) => a.id);
  if (ids.length === 0) return NextResponse.json({ processed: 0, failures: [] });

  // 2) Fetch which of these already have AI rows
  const { data: existing, error: existingErr } = await supabase
    .from("articles_ai")
    .select("article_id")
    .in("article_id", ids);

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const existingSet = new Set((existing ?? []).map((x) => x.article_id));

  // 3) Only summarize the ones missing
  const toProcess = (recent ?? [])
    .filter((a) => !existingSet.has(a.id))
    .slice(0, 10); // cost control

  let processed = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const a of toProcess) {
    try {
      const prompt = `
Summarize the news article below.

Title:
${a.title}

Content:
${a.content_excerpt ?? ""}

Return STRICT JSON with keys:
summary (2–3 sentences),
why_it_matters (1 sentence),
topics (array of short tags).
`;

      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const text = res.choices[0].message.content ?? "{}";

      // Robust parse (sometimes the model adds extra text)
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const cleaned =
        jsonStart >= 0 && jsonEnd >= 0 ? text.slice(jsonStart, jsonEnd + 1) : "{}";

      const parsed = JSON.parse(cleaned);

      const { error: insErr } = await supabase.from("articles_ai").insert({
        article_id: a.id,
        summary: parsed.summary ?? null,
        why_it_matters: parsed.why_it_matters ?? null,
        topics: Array.isArray(parsed.topics) ? parsed.topics : null,
      });

      if (insErr) throw new Error(insErr.message);
      processed += 1;
    } catch (e: any) {
      failures.push({ id: String(a.id), reason: e?.message ?? "unknown error" });
    }
  }

  return NextResponse.json({ processed, failures });
}
