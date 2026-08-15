import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts().catch(() => []);

  return [
    {
      url: "https://saiaj.in",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://saiaj.in/shop",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...products
      .filter((p) => !p.sold)
      .map((p) => ({
        url: `https://saiaj.in/shop/${p.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
  ];
}
