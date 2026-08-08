import { getOrders } from "@/lib/orders";
import OrdersAdmin from "@/components/shop/OrdersAdmin";

export const dynamic = "force-dynamic";

export default async function ShopAdminPage() {
  const orders = await getOrders();

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl italic">orders</h1>
      <OrdersAdmin orders={orders} />
    </div>
  );
}
