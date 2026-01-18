"use client";

import React from "react";

export default function NewsImage({
  src,
  alt = "",
}: {
  src?: string | null;
  alt?: string;
}) {
  const fallback = "/placeholder.png";
  const initialSrc = src || fallback;

  return (
    <img
      src={initialSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src.includes(fallback)) return; // prevent infinite loop
        img.src = fallback;
      }}
      style={{
        width: "100%",
        height: 180,
        objectFit: "cover",
      }}
    />
  );
}
