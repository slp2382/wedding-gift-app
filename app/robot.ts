// app/robots.ts
import type { MetadataRoute } from "next";

const BASE_URL = "https://www.giviocards.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/checkout/",
        "/claim/",
        "/account/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}