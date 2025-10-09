import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function serverSupabase() {
  const c = nextCookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await c).get(name)?.value,
        set: async (name: string, value: string, options: any) => {
          (await c).set({ name, value, ...options });
        },
        remove: async (name: string, options: any) => {
          (await c).set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}