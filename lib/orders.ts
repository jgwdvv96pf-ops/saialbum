import { getJson, putJson } from "@/lib/r2";
import { markProductsSold } from "@/lib/shop";

const ORDERS_KEY = "shop-orders.json";

export type OrderItem = {
  productId: string;
  title: string;
  price: number;
  qty: number;
};

export type OrderStatus = "new" | "confirmed" | "fulfilled" | "cancelled";

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  buyerName: string;
  contact: string; // whatever they gave — IG handle, phone, etc.
  note?: string;
  status: OrderStatus;
  createdAt: string;
};

export async function getOrders(): Promise<Order[]> {
  const orders = await getJson<Order[]>(ORDERS_KEY, []);
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addOrder(
  entry: Omit<Order, "id" | "status" | "createdAt">
): Promise<Order> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const order: Order = {
    ...entry,
    id: crypto.randomUUID().slice(0, 8),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  current.push(order);
  await putJson(ORDERS_KEY, current);
  return order;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const order = current.find((o) => o.id === id);
  const updated = current.map((o) => (o.id === id ? { ...o, status } : o));
  await putJson(ORDERS_KEY, updated);

  // Confirming or fulfilling an order marks its items sold — these
  // are one-of-a-kind pieces, not stocked inventory. Cancelling does
  // NOT auto-unmark sold, since another order might have since
  // claimed the same item; unsell manually from the product if needed.
  if (order && (status === "confirmed" || status === "fulfilled")) {
    await markProductsSold(order.items.map((i) => i.productId));
  }
}

export async function deleteOrder(id: string): Promise<void> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const remaining = current.filter((o) => o.id !== id);
  await putJson(ORDERS_KEY, remaining);
}
