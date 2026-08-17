import { sendMessage } from "@/lib/mail/zoho";
import type { Order } from "@/lib/orders";
import { CURRENCY } from "@/lib/shop-constants";

// Table-based layout + all-inline styles on purpose — email clients
// (especially Outlook desktop, which renders with Word's engine) are
// far less forgiving of modern CSS than a browser is. This is the
// safe subset that reliably survives across clients.
function buildOrderConfirmationHtml(order: Order): string {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td width="56" style="padding:14px 0;border-bottom:1px solid #E4E2DC;">
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;object-fit:cover;border-radius:4px;background:#E4E2DC;" />`
                : `<div style="width:48px;height:48px;border-radius:4px;background:#E4E2DC;"></div>`
            }
          </td>
          <td style="padding:14px 0 14px 14px;border-bottom:1px solid #E4E2DC;font-family:'Courier New',monospace;font-size:13px;color:#161513;">
            ${item.title}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #E4E2DC;font-family:'Courier New',monospace;font-size:13px;color:#161513;text-align:right;white-space:nowrap;">
            ${CURRENCY}${item.price.toLocaleString()}
          </td>
        </tr>`
    )
    .join("");

  const firstName = order.buyerName.split(" ")[0] || order.buyerName;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EDEBE5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EDEBE5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#FAFAF7;border-radius:6px;overflow:hidden;">

            <!-- header -->
            <tr>
              <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid #E4E2DC;">
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;color:#161513;">
                  saiaj.in
                </p>
                <p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.05em;color:#8B8A85;text-transform:uppercase;">
                  order confirmed
                </p>
              </td>
            </tr>

            <!-- order id -->
            <tr>
              <td style="padding:24px 32px 0;">
                <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#8B8A85;">reference</p>
                <p style="margin:2px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;color:#161513;">
                  #${order.id}
                </p>
              </td>
            </tr>

            <!-- items -->
            <tr>
              <td style="padding:20px 32px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemRows}
                </table>
              </td>
            </tr>

            <!-- total -->
            <tr>
              <td style="padding:16px 32px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:12px;color:#8B8A85;">total</td>
                    <td style="font-family:'Courier New',monospace;font-size:15px;color:#161513;text-align:right;font-weight:bold;">
                      ${CURRENCY}${order.total.toLocaleString()}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- note -->
            <tr>
              <td style="padding:28px 32px 0;">
                <p style="margin:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.7;color:#8B8A85;">
                  thanks, ${firstName} — this just confirms your order came through.
                  I'll message you at <span style="color:#161513;">${order.contact}</span>
                  to sort payment and handoff.
                </p>
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td style="padding:28px 32px 32px;text-align:center;">
                <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#8B8A85;">
                  saiaj.in/shop
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Best-effort — a missing Zoho connection or a send failure should
// never block the order itself from going through.
export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  // SHOP_ORDER_FROM_ADDRESS lets order confirmations come from a
  // dedicated address (e.g. shop@saiaj.in) instead of your personal
  // inbox's ZOHO_MAIL_FROM_ADDRESS used elsewhere on /mail. Falls
  // back to that if the dedicated one isn't set.
  const fromAddress = process.env.SHOP_ORDER_FROM_ADDRESS || process.env.ZOHO_MAIL_FROM_ADDRESS;
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
