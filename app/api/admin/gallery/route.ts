// app/api/admin/gallery/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const BUCKET = (process.env.SUPABASE_BUCKET_GALLERY || "galeri").trim();
const supabase = createClient(SB_URL, SERVICE_KEY, { auth: { persistSession: false } });

function extFrom(name: string, type: string) {
  const n = name && name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (n) return n;
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  return "bin";
}

function publicUrlToKey(publicUrl: string) {
  const marker = "/storage/v1/object/public/";
  const i = publicUrl.indexOf(marker);
  if (i === -1) return "";
  const rest = publicUrl.slice(i + marker.length);
  const [bucket, ...path] = rest.split("/");
  if (bucket !== BUCKET) return "";
  return path.join("/");
}

async function ensureBucket() {
  const { data: list } = await supabase.storage.listBuckets();
  const exists = (list || []).some((b) => b.name === BUCKET);
  if (!exists) await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: null });
}

export async function GET() {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, kind, media_url, thumb_url, width, height, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  if (!SB_URL || !SERVICE_KEY) return NextResponse.json({ error: "Supabase env eksik" }, { status: 500 });
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) return NextResponse.json({ error: "multipart bekleniyor" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as unknown as File | null;
  const width = form.get("width") ? Number(form.get("width")) : null;
  const height = form.get("height") ? Number(form.get("height")) : null;
  if (!file) return NextResponse.json({ error: "dosya yok" }, { status: 400 });

  const mime = file.type || "";
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "";
  if (!kind) return NextResponse.json({ error: "desteklenmeyen tür" }, { status: 400 });

  await ensureBucket();

  const name = (file as any).name || "";
  const ext = extFrom(name, mime);
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

  const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const row = {
    kind,
    media_url: pub,
    thumb_url: null as string | null,
    width: kind === "image" ? width : null,
    height: kind === "image" ? height : null,
    is_published: true,
  };
  const ins = await supabase.from("gallery_items").insert(row).select().single();
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ data: ins.data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id yok" }, { status: 400 });

  const row = await supabase.from("gallery_items").select("media_url").eq("id", id).single();
  if (row.error) return NextResponse.json({ error: row.error.message }, { status: 500 });

  const key = publicUrlToKey(row.data.media_url);
  if (key) {
    const rm = await supabase.storage.from(BUCKET).remove([key]);
    if (rm.error) return NextResponse.json({ error: rm.error.message }, { status: 500 });
  }
  const del = await supabase.from("gallery_items").delete().eq("id", id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
