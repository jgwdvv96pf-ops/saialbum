import { NextRequest, NextResponse } from "next/server";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";
import { buildOrderMessagePayload } from "@/lib/discord";
import { updateRedemptionStatus, type RedemptionStatus } from "@/lib/earn/redemptions";
import { buildRedemptionMessagePayload } from "@/lib/earn/discord-redemptions";
import { sql } from "@/lib/earn/db";

const VALID_ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "fulfilled", "cancelled"];
const VALID_REDEMPTION_STATUSES: RedemptionStatus[] = ["pending", "approved", "rejected", "paid"];

// This single endpoint is Discord's one Interactions Endpoint URL for
// the whole bot — shop order buttons and /earn redemption buttons
// both land here and get dispatched by their custom_id prefix,
// since a bot only gets one such URL, not one per feature.
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
    const [prefix, id, targetStatus] = customId.split(":");

    if (prefix === "order_status" && id && VALID_ORDER_STATUSES.includes(targetStatus as OrderStatus)) {
      const updated = await updateOrderStatus(id, targetStatus as OrderStatus, {
        skipDiscordSync: true,
      });
      if (!updated) {
        return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
      }
      const payload = await buildOrderMessagePayload(updated);
      return NextResponse.json({ type: InteractionResponseType.UPDATE_MESSAGE, data: payload });
    }

    if (
      prefix === "redemption_status" &&
      id &&
      VALID_REDEMPTION_STATUSES.includes(targetStatus as RedemptionStatus)
    ) {
      const updated = await updateRedemptionStatus(id, targetStatus as RedemptionStatus, {
        skipDiscordSync: true,
      });
      if (!updated) {
        return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
      }
      const emailRows = await sql`select email from users where id = ${updated.user_id}`;
      const email = (emailRows[0] as { email: string | null } | undefined)?.email ?? null;
      const payload = buildRedemptionMessagePayload(updated, email);
      return NextResponse.json({ type: InteractionResponseType.UPDATE_MESSAGE, data: payload });
    }

    // Unrecognized button — just acknowledge without changing anything.
    return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
  }

  return NextResponse.json({ type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE });
}
