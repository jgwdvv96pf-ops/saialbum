// Wraps whatever HTML content compose/reply/forward produces in a
// consistent envelope — same table + all-inline-styles approach as
// lib/shop/order-email.ts (Outlook desktop's renderer is picky about
// modern CSS, this is the safe subset). Kept understated on purpose:
// this is personal correspondence, not a marketing email, so no big
// brand header — just clean typography and a small signature line.
export function wrapEmailBody(contentHtml: string, senderName = "saia"): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EDEBE5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EDEBE5;padding:24px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FAFAF7;border-radius:6px;">
            <tr>
              <td style="padding:36px 36px 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#161513;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 28px;">
                <div style="border-top:1px solid #E4E2DC;padding-top:16px;">
                  <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;color:#8B8A85;">
                    ${senderName} · saiaj.in
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
