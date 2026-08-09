import type { Order, OrderStatus } from "@/lib/orders";
import { CURRENCY } from "@/lib/shop-constants";
import { getProducts } from "@/lib/shop";

const API = "https://discord.com/api/v10";

const STATUS_META: Record<
  OrderStatus,
  { label: string; emoji: string; color: number }
> = {
  new: { label: "New", emoji: "🆕", color: 0x5865f2 },
  confirmed: { label: "Confirmed", emoji: "✅", color: 0xfaa61a },
  fulfilled: { label: "Fulfilled", emoji: "📦", color: 0x57f287 },
  cancelled: { label: "Cancelled", emoji: "❌", color: 0xed4245 },
};

// custom_id format: "order_status:<orderId>:<targetStatus>"
const BUTTONS: { status: OrderStatus; style: number }[] = [
  { status: "confirmed", style: 1 }, // Primary
  { status: "fulfilled", style: 3 }, // Success
  { status: "cancelled", style: 4 }, // Danger
  { status: "new", style: 2 }, // Secondary — "reset"
];

async function buildPayload(order: Order) {
  const meta = STATUS_META[order.status];

  // Best-effort thumbnail: first item's current product photo, if
  // it's still around (product may have since been deleted).
  let thumbnailUrl: string | undefined;
  try {
    const products = await getProducts();
    const first = order.items[0];
    const product = first && products.find((p) => p.id === first.productId);
    thumbnailUrl = product?.imageUrls[0];
  } catch {
    // no thumbnail — not critical
  }

  const itemLines = order.items
    .map((i) => `• ${i.title} — ${CURRENCY}${i.price.toLocaleString()}`)
    .join("\n");

  return {
    embeds: [
      {
        title: `Order #${order.id}`,
        color: meta.color,
        thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
        fields: [
          { name: "Status", value: `${meta.emoji} ${meta.label}`, inline: true },
          { name: "Total", value: `${CURRENCY}${order.total.toLocaleString()}`, inline: true },
          { name: "Buyer", value: order.buyerName, inline: true },
          { name: "Contact", value: order.contact, inline: true },
          { name: "Items", value: itemLines || "—" },
          ...(order.note ? [{ name: "Note", value: order.note }] : []),
        ],
        footer: { text: "saiaj.in/shop" },
        timestamp: order.createdAt,
      },
    ],
    components: [
      {
        type: 1, // action row
        components: BUTTONS.map((b) => ({
          type: 2, // button
          style: b.style,
          label: STATUS_META[b.status].label,
          custom_id: `order_status:${order.id}:${b.status}`,
          disabled: order.status === b.status,
        })),
      },
    ],
  };
}

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// Posts a new message for a freshly placed order. Returns the
// message id so it can be stored on the order for later edits.
export async function postOrderMessage(order: Order): Promise<string | null> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return null;

  try {
    const payload = await buildPayload(order);
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  } catch {
    return null;
  }
}

// Edits an order's existing Discord message in place — used both
// when status changes from the web admin, and to echo back the new
// state after a Discord button click.
export async function editOrderMessage(order: Order): Promise<void> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN || !order.discordMessageId)
    return;

  try {
    const payload = await buildPayload(order);
    await fetch(
      `${API}/channels/${channelId}/messages/${order.discordMessageId}`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(payload),
      }
    );
  } catch {
    // best-effort — a failed edit shouldn't break the status update itself
  }
}

// Used directly inside the interactions endpoint to build the same
// payload for an immediate UPDATE_MESSAGE response, without a second
// round-trip to Discord's REST API.
export async function buildOrderMessagePayload(order: Order) {
  return buildPayload(order);
}
