// app/route/galerimiz/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import TanitimCarousel from "@/components/TanitimCarousel";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galerimiz | Palet Evreni",
  description: "Palet Evreni video ve görselleri: atölye anları, çalışmalar ve daha fazlası.",
};

type DBItem = {
  id: string;
  kind: "video" | "image";
  title: string | null;
  description: string | null;
  media_url: string;
  thumb_url: string | null;
  youtube_id: string | null;
  width: number | null;
  height: number | null;
  sort_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getItems(): Promise<DBItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("gallery_items")
    .select(
      "id, kind, title, description, media_url, thumb_url, youtube_id, width, height, sort_order, is_published, created_at"
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export default async function Page() {
  const items = await getItems().catch(() => [] as DBItem[]);
  const videos = items
    .filter((x) => x.kind === "video")
    .map((v) => ({
      title: v.title || "Video",
      src: v.youtube_id ? undefined : v.media_url,
      poster: v.thumb_url || undefined,
      youtubeId: v.youtube_id || undefined,
    }));
  const images = items.filter((x) => x.kind === "image");

  return (
    <main className="relative min-h-[100svh] overflow-hidden text-white">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #041418 0%, #cb6ce6 100%)", transition: "background 500ms ease" }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0,transparent_55%,rgba(0,0,0,0.35)_100%)]" />
      <div className="h-16 md:h-[92px]" aria-hidden />

      <section className="mx-auto max-w-7xl px-4 py-8 md:py-14">
        <header className="mb-6 md:mb-10">
          <h1 className="font-extrabold leading-tight tracking-tight text-[clamp(28px,4.2vw,56px)]">
            <span className="block">Galerimiz</span>
            <span className="mt-1 block bg-gradient-to-r from-pink-200 via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              Video ve Görseller
            </span>
          </h1>
        </header>

        {videos.length > 0 && (
          <section className="mb-10 md:mb-14">
            <TanitimCarousel videos={videos} />
          </section>
        )}

        {images.length > 0 && (
          <section>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {images.map((img) => (
                <figure
                  key={img.id}
                  className="mb-4 break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5 backdrop-blur shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  style={{ breakInside: "avoid" as any }}
                >
                  <div className="relative w-full">
                    {img.width && img.height ? (
                      <Image
                        src={img.media_url}
                        alt={img.title || "Görsel"}
                        width={img.width}
                        height={img.height}
                        className="h-auto w-full object-cover"
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        placeholder={img.thumb_url ? "blur" : undefined}
                        blurDataURL={img.thumb_url || undefined}
                        priority={false}
                      />
                    ) : (
                      <Image
                        src={img.media_url}
                        alt={img.title || "Görsel"}
                        width={1080}
                        height={1440}
                        className="h-auto w-full object-cover"
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        priority={false}
                      />
                    )}
                  </div>
                  {(img.title || img.description) && (
                    <figcaption className="p-3 md:p-4">
                      <div className="text-sm md:text-base font-semibold leading-snug">{img.title}</div>
                      {img.description && (
                        <p className="mt-1 text-xs md:text-sm text-white/80">{img.description}</p>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
