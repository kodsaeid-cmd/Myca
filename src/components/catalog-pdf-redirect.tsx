"use client";

import { useEffect } from "react";

export function CatalogPdfRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    window.location.replace("https://mycaapp.com/catalogs/" + encodeURIComponent(slug) + "/pdf");
  }, [slug]);

  return (
    <main dir="rtl" style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, color: "#17395b" }}>
      <p>در حال انتقال به نسخه PDF کاتالوگ مایکا…</p>
    </main>
  );
}
