"use client";

export default function SearchBar({ initial }: { initial: string }) {
  return (
    <form action="/" style={{ marginTop: 14, display: "flex", gap: 10 }}>
      <input
        name="q"
        defaultValue={initial}
        placeholder="Search news…"
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
        }}
      />
      <button
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Search
      </button>
    </form>
  );
}
