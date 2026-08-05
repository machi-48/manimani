import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "manimani",
    short_name: "manimani",
    description: "生活費の家計簿",
    lang: "ja",
    start_url: "/",
    // ブラウザのUIを出さず、アプリとして開く
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // OS が好きな形に切り抜く用。中央80%に収まるよう余白を取ってある
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
