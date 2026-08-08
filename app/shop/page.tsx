import { getProducts } from "@/lib/shop";
import { isAuthed } from "@/lib/auth";
import ShopGrid from "@/components/shop/ShopGrid";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, authed] = await Promise.all([getProducts(), isAuthed()]);

  return <ShopGrid products={products} authed={authed} />;
}
