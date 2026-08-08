import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop";
import ProductDetail from "@/components/shop/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
