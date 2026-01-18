"use client";

export default function Filters({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ["All", "AI", "Security", "Cloud", "Policy", "Startups", "Chips"];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: value === o ? "#111827" : "#fff",
            color: value === o ? "#fff" : "#111827",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
