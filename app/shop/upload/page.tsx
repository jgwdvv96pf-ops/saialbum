import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shop";
import ProductForm from "@/components/shop/ProductForm";

export const dynamic = "force-dynamic";

export default async function ShopUploadPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const existing = searchParams.edit
    ? await getProduct(searchParams.edit)
    : null;

  if (searchParams.edit && !existing) notFound();

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl italic">
        {existing ? "edit item" : "list an item"}
      </h1>
      <ProductForm existing={existing || undefined} />
    </div>
  );
}
