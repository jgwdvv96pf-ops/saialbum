import { getJson, putJson } from "@/lib/r2";
import { markProductsSold, markProductsAvailable } from "@/lib/shop";
import { editOrderMessage } from "@/lib/discord";

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
  email: string;
  contact: string; // whatever they gave — IG handle, phone, etc.
  note?: string;
  status: OrderStatus;
  createdAt: string;
  discordMessageId?: string;
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

export async function setDiscordMessageId(
  id: string,
  discordMessageId: string
): Promise<void> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const updated = current.map((o) =>
    o.id === id ? { ...o, discordMessageId } : o
  );
  await putJson(ORDERS_KEY, updated);
}

const SOLD_STATUSES: OrderStatus[] = ["confirmed", "fulfilled"];

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  opts: { skipDiscordSync?: boolean } = {}
): Promise<Order | null> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const order = current.find((o) => o.id === id);
  const previousStatus = order?.status;
  const updated = current.map((o) => (o.id === id ? { ...o, status } : o));
  await putJson(ORDERS_KEY, updated);

  if (!order) return null;

  const wasSold = previousStatus && SOLD_STATUSES.includes(previousStatus);
  const isSold = SOLD_STATUSES.includes(status);

  if (!wasSold && isSold) {
    // Newly confirmed/fulfilled — claim the items.
    await markProductsSold(order.items.map((i) => i.productId));
  } else if (wasSold && !isSold) {
    // Moved back to new/cancelled — release the items, but only
    // ones no *other* active order still has claimed (e.g. if two
    // orders somehow both reference the same item).
    const stillClaimed = new Set<string>();
    for (const o of updated) {
      if (o.id === id) continue;
      if (SOLD_STATUSES.includes(o.status)) {
        o.items.forEach((i) => stillClaimed.add(i.productId));
      }
    }
    const toRelease = order.items
      .map((i) => i.productId)
      .filter((pid) => !stillClaimed.has(pid));
    if (toRelease.length) await markProductsAvailable(toRelease);
  }

  const newOrder = { ...order, status };

  // Reflect the change on Discord too — unless this update *came
  // from* a Discord button click, in which case the interaction
  // handler updates the message directly as part of its response.
  if (!opts.skipDiscordSync) {
    await editOrderMessage(newOrder);
  }

  return newOrder;
}

export async function deleteOrder(id: string): Promise<void> {
  const current = await getJson<Order[]>(ORDERS_KEY, []);
  const remaining = current.filter((o) => o.id !== id);
  await putJson(ORDERS_KEY, remaining);
}
