import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/upload",
          "/shop/upload",
          "/shop/admin",
          "/earn/admin",
          "/earn/redeem",
          "/mail",
          "/login",
          "/api/",
        ],
      },
    ],
    sitemap: "https://saiaj.in/sitemap.xml",
  };
}
