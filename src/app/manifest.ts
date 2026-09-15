import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PiriLight Studio",
    short_name: "PiriLight",
    description: "Centro de organização e trabalho da equipa PiriLight.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#092634",
    theme_color: "#092634",
    icons: [
      {
        src: "/icons/pirilight-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pirilight-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pirilight-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
