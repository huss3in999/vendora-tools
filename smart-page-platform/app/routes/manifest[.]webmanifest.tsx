export async function loader() {
  return new Response(JSON.stringify({
    name: "COS Rota Request Portal",
    short_name: "COS Rota",
    description: "Private shift and leave requests for the COS team.",
    start_url: "/rota",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/cos-rota-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/cos-rota-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  }), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
