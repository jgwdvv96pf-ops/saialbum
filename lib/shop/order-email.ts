import { sendMessage } from "@/lib/mail/zoho";
import type { Order } from "@/lib/orders";
import { CURRENCY } from "@/lib/shop-constants";

function buildOrderConfirmationHtml(order: Order): string {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E4E2DC;font-family:monospace;font-size:13px;color:#161513;">
            ${item.title}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #E4E2DC;font-family:monospace;font-size:13px;color:#161513;text-align:right;white-space:nowrap;">
            ${CURRENCY}${item.price.toLocaleString()}
          </td>
        </tr>`
    )
    .join("");

  return `
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:monospace;background:#FAFAF7;color:#161513;">
    <p style="font-size:12px;color:#8B8A85;margin:0 0 4px;">order confirmed</p>
    <p style="font-size:20px;font-style:italic;margin:0 0 24px;font-family:Georgia,serif;">#${order.id}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${itemRows}
      <tr>
        <td style="padding:12px 0 0;font-size:12px;color:#8B8A85;">total</td>
        <td style="padding:12px 0 0;font-size:14px;text-align:right;">${CURRENCY}${order.total.toLocaleString()}</td>
      </tr>
    </table>

    <p style="font-size:12px;color:#8B8A85;line-height:1.6;margin-top:24px;">
      thanks, ${order.buyerName.split(" ")[0] || order.buyerName} — this just confirms
      your order came through. I'll message you at ${order.contact} to sort
      payment and handoff.
    </p>

    <p style="font-size:11px;color:#8B8A85;margin-top:32px;">saiaj.in/shop</p>
  </div>`;
}

// Best-effort — a missing Zoho connection or a send failure should
// never block the order itself from going through.
export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  const fromAddress = process.env.ZOHO_MAIL_FROM_ADDRESS;
  if (!fromAddress) return;

  try {
    await sendMessage({
      to: order.email,
      subject: `Order confirmed — #${order.id}`,
      content: buildOrderConfirmationHtml(order),
      fromAddress,
    });
  } catch (err) {
    console.error("[order confirmation email error]", err);
  }
}
