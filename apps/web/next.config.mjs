/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Build ID para cache-busting ─────────────────────────────────────────
  // En Netlify usa el hash del commit (COMMIT_REF).
  // En desarrollo usa un timestamp. Esto garantiza que cada deploy
  // invalida el caché del navegador y de la CDN de Netlify Edge.
  generateBuildId: async () => {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA  ||  // Vercel CI: SHA completo del commit
      process.env.COMMIT_REF             ||  // Netlify CI (fallback / rollback)
      process.env.NEXT_PUBLIC_BUILD_ID   ||  // override manual
      `dev-${Date.now()}`                    // local dev: timestamp único
    );
  },

  // ── TypeScript / ESLint ─────────────────────────────────────────────────
  // Permite que el build continúe aunque haya errores de TypeScript/ESLint.
  // Útil durante despliegues iniciales; quitar cuando el proyecto esté estabilizado.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
