import type { Redemption, RedemptionStatus } from "@/lib/earn/redemptions";
import { pointsToPhp } from "@/lib/earn/config";

const API = "https://discord.com/api/v10";

const STATUS_META: Record<RedemptionStatus, { label: string; emoji: string; color: number }> = {
  pending: { label: "Pending", emoji: "🆕", color: 0x5865f2 },
  approved: { label: "Approved", emoji: "✅", color: 0xfaa61a },
  paid: { label: "Paid", emoji: "💸", color: 0x57f287 },
  rejected: { label: "Rejected", emoji: "❌", color: 0xed4245 },
};

// custom_id format: "redemption_status:<id>:<targetStatus>"
const BUTTONS: { status: RedemptionStatus; style: number }[] = [
  { status: "approved", style: 1 }, // Primary
  { status: "paid", style: 3 }, // Success
  { status: "rejected", style: 4 }, // Danger
  { status: "pending", style: 2 }, // Secondary — reset
];

function buildPayload(redemption: Redemption, email?: string | null) {
  const meta = STATUS_META[redemption.status];

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Status", value: `${meta.emoji} ${meta.label}`, inline: true },
    { name: "Points", value: `${redemption.points_cost} pts`, inline: true },
    ...(email ? [{ name: "User", value: email, inline: true }] : []),
  ];

  if (redemption.kind === "cash") {
    fields.push(
      { name: "Payout", value: `₱${redemption.payout_php ?? pointsToPhp(redemption.points_cost)}`, inline: true },
      { name: "GCash number", value: redemption.gcash_number || "—", inline: true }
    );
  } else {
    fields.push({ name: "Item", value: redemption.item_label || "—" });
  }

  if (redemption.note) {
    fields.push({ name: "Note", value: redemption.note });
  }

  return {
    embeds: [
      {
        title: `Redemption #${redemption.id.slice(0, 8)} — ${redemption.kind === "cash" ? "Cash" : "Item"}`,
        color: meta.color,
        fields,
        footer: { text: "saiaj.in/earn" },
        timestamp: redemption.created_at,
      },
    ],
    components: [
      {
        type: 1,
        components: BUTTONS.map((b) => ({
          type: 2,
          style: b.style,
          label: STATUS_META[b.status].label,
          custom_id: `redemption_status:${redemption.id}:${b.status}`,
          disabled: redemption.status === b.status,
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

function channelId() {
  return process.env.DISCORD_REDEMPTIONS_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
}

export async function postRedemptionMessage(
  redemption: Redemption,
  email?: string | null
): Promise<string | null> {
  const channel = channelId();
  if (!channel || !process.env.DISCORD_BOT_TOKEN) return null;

  try {
    const res = await fetch(`${API}/channels/${channel}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(buildPayload(redemption, email)),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  } catch {
    return null;
  }
}

export async function editRedemptionMessage(
  redemption: Redemption,
  email?: string | null
): Promise<void> {
  const channel = channelId();
  if (!channel || !process.env.DISCORD_BOT_TOKEN || !redemption.discord_message_id) return;

  try {
    await fetch(`${API}/channels/${channel}/messages/${redemption.discord_message_id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(buildPayload(redemption, email)),
    });
  } catch {
    // best-effort
  }
}

// Used by the interactions endpoint to echo the update straight back
// as the response, no second REST round-trip needed.
export function buildRedemptionMessagePayload(redemption: Redemption, email?: string | null) {
  return buildPayload(redemption, email);
}
