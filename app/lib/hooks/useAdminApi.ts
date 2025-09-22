"use client";

import { useState, useCallback } from "react";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export function useAdminApi(basePath: string) {
  // basePath örn: "/api/admin/applications"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (method: Method, path = "", body?: any, query?: Record<string, string | number | boolean>) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${basePath}${path ? `/${path}` : ""}`, window.location.origin);
        if (query) {
          Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
        }
        const res = await fetch(url.toString(), {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
        });

        // 404 veya 500 HTML döndüyse:
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(text.slice(0, 120) || "Geçersiz yanıt");
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "İstek başarısız");
        return data;
      } catch (e: any) {
        setError(e.message || "İstek hatası");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [basePath]
  );

  return {
    loading,
    error,
    get: () => request("GET"),
    post: (body: any) => request("POST", "", body),
    patch: (path: string, body: any) => request("PATCH", path, body),
    del: (path: string, query?: Record<string, string | number | boolean>) => request("DELETE", path, undefined, query),
  };
}
