import { publicUrlFor, getJson, putJson, r2, BUCKET } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export { CURRENCY } from "@/lib/shop-constants";

const PRODUCTS_KEY = "shop-manifest.json";

export type Product = {
  id: string;
  images: string[]; // R2 keys
  title: string;
  price: number;
  size?: string;
  condition?: string;
  description?: string;
  sold: boolean;
  order: number;
  createdAt: string;
};

export type ProductWithUrls = Product & { imageUrls: string[] };

type StoredProduct = Product;

export async function getProducts(): Promise<ProductWithUrls[]> {
  const entries = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  return entries
    .map((p) => ({ ...p, imageUrls: p.images.map(publicUrlFor) }))
    .sort((a, b) => a.order - b.order);
}

export async function getProduct(id: string): Promise<ProductWithUrls | null> {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

export async function addProduct(
  entry: Omit<Product, "order" | "sold" | "createdAt">
): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const minOrder = current.length ? Math.min(...current.map((p) => p.order)) : 0;
  current.push({
    ...entry,
    sold: false,
    order: minOrder - 1,
    createdAt: new Date().toISOString(),
  });
  await putJson(PRODUCTS_KEY, current);
}

const EDITABLE_FIELDS = [
  "title",
  "price",
  "size",
  "condition",
  "description",
  "sold",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function updateProduct(
  id: string,
  fields: Partial<Pick<Product, EditableField>>
): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const updated = current.map((p) => (p.id === id ? { ...p, ...fields } : p));
  await putJson(PRODUCTS_KEY, updated);
}

// Marks every product referenced by an order as sold — used when an
// order is confirmed, since these are one-off items with no real
// inventory count behind them.
export async function markProductsSold(ids: string[]): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const idSet = new Set(ids);
  const updated = current.map((p) =>
    idSet.has(p.id) ? { ...p, sold: true } : p
  );
  await putJson(PRODUCTS_KEY, updated);
}

// Opposite of markProductsSold — used when an order is reverted away
// from confirmed/fulfilled (e.g. accidentally set, or the buyer
// backed out), so the item goes back on sale.
export async function markProductsAvailable(ids: string[]): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const idSet = new Set(ids);
  const updated = current.map((p) =>
    idSet.has(p.id) ? { ...p, sold: false } : p
  );
  await putJson(PRODUCTS_KEY, updated);
}

export async function deleteProduct(id: string): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const toDelete = current.find((p) => p.id === id);
  const remaining = current.filter((p) => p.id !== id);
  await putJson(PRODUCTS_KEY, remaining);

  if (toDelete) {
    await Promise.all(
      toDelete.images.map((key) =>
        r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => {
          // best-effort — an orphaned R2 object isn't worth failing the delete over
        })
      )
    );
  }
}

export async function reorderProducts(ids: string[]): Promise<void> {
  const current = await getJson<StoredProduct[]>(PRODUCTS_KEY, []);
  const byId = new Map(current.map((p) => [p.id, p]));

  const reordered: StoredProduct[] = [];
  ids.forEach((id, i) => {
    const p = byId.get(id);
    if (p) {
      reordered.push({ ...p, order: i });
      byId.delete(id);
    }
  });
  let next = reordered.length;
  for (const p of byId.values()) {
    reordered.push({ ...p, order: next++ });
  }

  await putJson(PRODUCTS_KEY, reordered);
}
