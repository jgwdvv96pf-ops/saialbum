import { NextRequest, NextResponse } from "next/server";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";
import { buildOrderMessagePayload } from "@/lib/discord";

const VALID_STATUSES: OrderStatus[] = ["new", "confirmed", "fulfilled", "cancelled"];

export async function POST(req: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const valid = await verifyKey(rawBody, signature, timestamp, publicKey);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  // Discord's setup-time verification ping.
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId: string = interaction.data?.custom_id || "";
    const [prefix, orderId, targetStatus] = customId.split(":");

    if (prefix !== "order_status" || !orderId || !VALID_STATUSES.includes(targetStatus as OrderStatus)) {
      // Unrecognized button — just acknowledge without changing anything.
      return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
    }

    // skipDiscordSync: we're about to echo the new state straight
    // back in this same response, no need for a second PATCH call.
    const updated = await updateOrderStatus(orderId, targetStatus as OrderStatus, {
      skipDiscordSync: true,
    });

    if (!updated) {
      return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
    }

    const payload = await buildOrderMessagePayload(updated);
    return NextResponse.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: payload,
    });
  }

  return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
}
