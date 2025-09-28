// app/admin/(protected)/galeri/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";

type Item = {
  id: string;
  kind: "video" | "image";
  media_url: string;
  thumb_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
};

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const imgW = useRef<number | null>(null);
  const imgH = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/gallery", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Liste alınamadı");
      setItems(json?.data || []);
    } catch (e: any) {
      setErr(e?.message || "Bilinmeyen hata");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onFile = (f: File | null) => {
    setFile(f);
    setErr("");
    setPreviewUrl("");
    imgW.current = null;
    imgH.current = null;
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    if (f.type.startsWith("image/")) {
      const probe = new window.Image();
      probe.onload = () => {
        imgW.current = probe.width;
        imgH.current = probe.height;
      };
      probe.src = url;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (imgW.current && imgH.current) {
        fd.append("width", String(imgW.current));
        fd.append("height", String(imgH.current));
      }
      const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Yükleme başarısız");
      setFile(null);
      setPreviewUrl("");
      await fetchData();
    } catch (e: any) {
      setErr(e?.message || "Yükleme hatası");
    }
    setUploading(false);
  };

  const del = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    setErr("");
    const res = await fetch(`/api/admin/gallery?id=${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setErr(json?.error || "Silme başarısız");
    else fetchData();
  };

  const videos = useMemo(() => items.filter((x) => x.kind === "video"), [items]);
  const images = useMemo(() => items.filter((x) => x.kind === "image"), [items]);

  return (
    <main className="min-h-[100svh] bg-white text-slate-900 px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold">Galeri</h1>

      <section className="mt-6 rounded-2xl bg-white border border-slate-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Yükle</h2>
        {err && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">{err}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:px-3 file:py-2 file:bg-white file:text-slate-900"
              required
            />
            <p className="text-xs text-slate-600">Görsel: JPG/PNG/WebP • Video: MP4/WEBM</p>
          </div>

          <div className="min-h-[120px]">
            {previewUrl && file?.type.startsWith("image/") && (
              <div className="relative w-40 h-56 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <NextImage src={previewUrl} alt="" fill className="object-cover" />
              </div>
            )}
            {previewUrl && file?.type.startsWith("video/") && (
              <video src={previewUrl} className="w-64 rounded-lg border border-slate-200" controls />
            )}
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-full px-5 py-3 font-semibold text-white shadow-xl disabled:opacity-60 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500"
            >
              {uploading ? "Yükleniyor..." : "Yükle"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Videolar</h2>
        {loading && <div className="text-slate-600">Yükleniyor...</div>}
        {!loading && videos.length === 0 && <div className="text-slate-600">Kayıt yok.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
              <video src={v.media_url} className="w-full rounded-lg border border-slate-200" controls />
              <div className="mt-3 flex justify-between">
                <span className="text-xs text-slate-600">{new Date(v.created_at || "").toLocaleString()}</span>
                <button
                  onClick={() => del(v.id)}
                  className="rounded-full px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-sm"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Görseller</h2>
        {!loading && images.length === 0 && <div className="text-slate-600">Kayıt yok.</div>}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {images.map((img) => (
            <figure
              key={img.id}
              className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              style={{ breakInside: "avoid" as any }}
            >
              <NextImage
                src={img.media_url}
                alt=""
                width={img.width || 1080}
                height={img.height || 1440}
                className="h-auto w-full object-cover"
                sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              />
              <div className="flex items-center justify-between p-3">
                <span className="text-xs text-slate-600">{new Date(img.created_at || "").toLocaleDateString()}</span>
                <button
                  onClick={() => del(img.id)}
                  className="rounded-full px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-sm"
                >
                  Sil
                </button>
              </div>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
