import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        /**
         * setAll se llama cuando Supabase necesita refrescar el token.
         * En Server Components Next.js no permite escribir cookies —
         * solo en Server Actions / Route Handlers. Silenciamos el error
         * aquí; el middleware se encargará de persistir el token en la
         * siguiente request.
         */
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // No-op: fallo esperado en Server Components de solo lectura.
          }
        },
      },
    }
  );
}
