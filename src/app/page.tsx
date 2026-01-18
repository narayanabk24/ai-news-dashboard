export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { ingestNow } from "./actions";
import NewsImage from "./NewsImage";
import SearchBar from "./Searchbar";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: { topic?: string; q?: string };
}) {
  const topic = searchParams.topic ?? "All";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("articles_raw")
    .select(
      "id,title,url,published_at,image_storage_url,articles_ai(summary,why_it_matters,topics)"
    )
    .order("published_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []).map((a: any) => {
    const ai = a.articles_ai?.[0] ?? null;
    return { ...a, ai };
  });

  const filtered = rows.filter((a) => {
    const topics: string[] = a.ai?.topics ?? [];
    const topicOk = topic === "All" ? true : topics.includes(topic);
    const text = `${a.title} ${a.ai?.summary ?? ""}`.toLowerCase();
    const qOk = q ? text.includes(q) : true;
    return topicOk && qOk;
  });

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>AI News Dashboard</h1>

      <form action={ingestNow}>
        <button
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
            background: "#fff",
          }}
        >
          Fetch Latest News
        </button>
      </form>

      <SearchBar initial={searchParams.q ?? ""} />



      {/* Link-based filter row (no client state needed) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        {["All", "AI", "Security", "Cloud", "Policy", "Startups", "Chips"].map((t) => (
          <Link
            key={t}
            href={`/?topic=${encodeURIComponent(t)}&q=${encodeURIComponent(
              searchParams.q ?? ""
            )}`}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: topic === t ? "#111827" : "#fff",
              color: topic === t ? "#fff" : "#111827",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            {t}
          </Link>
        ))}
      </div>

      {error && (
        <p style={{ marginTop: 12, color: "crimson" }}>Error: {error.message}</p>
      )}

      <p style={{ marginTop: 8, opacity: 0.7 }}>
        Showing {filtered.length} articles
      </p>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {filtered.slice(0, 30).map((a: any) => (
          <div
            key={a.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <NewsImage src={a.image_storage_url} />

            <div style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{a.title}</div>

              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
                {a.published_at ? new Date(a.published_at).toLocaleString() : "—"}
              </div>

              {a.ai?.summary && (
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>
                  {a.ai.summary}
                </div>
              )}

              {a.ai?.why_it_matters && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  {a.ai.why_it_matters}
                </div>
              )}

              {a.ai?.topics?.length ? (
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {a.ai.topics.map((t: string) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        padding: "4px 8px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 999,
                        opacity: 0.85,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  fontSize: 14,
                  color: "#2563eb",
                  textDecoration: "none",
                }}
              >
                Read article →
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
