/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite que el build de producción continúe aunque haya errores de TypeScript.
  // Útil durante despliegues iniciales; quitar cuando el proyecto esté estabilizado.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Permite que el build continúe aunque haya errores de ESLint.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
