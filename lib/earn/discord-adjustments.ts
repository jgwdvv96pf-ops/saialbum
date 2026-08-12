const API = "https://discord.com/api/v10";

// Purely a log/audit notification — the adjustment already happened
// on the site by the time this fires, so unlike orders/redemptions
// there's no approve/reject flow, just a record of what changed.
export async function notifyPointAdjustment(params: {
  email: string | null;
  points: number;
  reason: string | null;
  newBalance: number;
}): Promise<void> {
  const channelId = process.env.DISCORD_POINTS_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return;

  const isCredit = params.points > 0;

  const payload = {
    embeds: [
      {
        title: `Manual points ${isCredit ? "credit" : "deduction"}`,
        color: isCredit ? 0x57f287 : 0xed4245,
        fields: [
          { name: "User", value: params.email || "unknown", inline: true },
          { name: "Change", value: `${isCredit ? "+" : ""}${params.points} pts`, inline: true },
          { name: "New balance", value: `${params.newBalance} pts`, inline: true },
          ...(params.reason ? [{ name: "Reason", value: params.reason }] : []),
        ],
        footer: { text: "saiaj.in/earn/admin" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort — never block the adjustment itself on Discord failing
  }
}
