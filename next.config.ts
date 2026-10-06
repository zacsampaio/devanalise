import type { NextConfig } from "next";

/**
 * Origens extras liberadas para o `npm run dev` (ex.: abrir pelo IP da máquina
 * na rede). Fica vazio por padrão: o servidor de desenvolvimento expõe código
 * e HMR, então só abre para quem for listado em PAINEL_DEV_ORIGENS.
 */
const origensDev = (process.env.PAINEL_DEV_ORIGENS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: origensDev,
  // foto do perfil no portfólio (avatar do GitHub)
  images: { remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // o painel não é para indexação: os dados são privados
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
