import { getValidAccessToken } from "@/lib/mail/tokens";

export type MailListItem = {
  messageId: string;
  folderId: string;
  subject: string;
  sender: string;
  senderEmail?: string;
  receivedTime: number; // epoch ms
  summary: string;
  unread: boolean;
  hasAttachment: boolean;
};

export type MailFolder = {
  folderId: string;
  folderName: string;
  unreadCount: number;
};

async function zohoFetch(path: string, apiDomain: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(`${apiDomain}${path}`, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho Mail API error (${res.status}): ${body}`);
  }
  return res.json();
}

export async function listFolders(): Promise<MailFolder[]> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  const data = await zohoFetch(`/api/accounts/${accountId}/folders`, apiDomain, accessToken);
  // NOTE: field names (folderId/folderName/unreadCount) follow Zoho's
  // documented shape — worth double-checking against a real response
  // the first time this runs, in case of minor naming differences.
  return (data.data || []).map((f: any) => ({
    folderId: f.folderId,
    folderName: f.folderName || f.path,
    unreadCount: Number(f.unreadCount || 0),
  }));
}

export async function listMessages(folderId: string, opts?: { start?: number; limit?: number }): Promise<MailListItem[]> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  const params = new URLSearchParams({
    folderId,
    // Zoho's start is 1-indexed (default 1), not 0-indexed.
    start: String(opts?.start ?? 1),
    limit: String(opts?.limit ?? 25),
    sortBy: "date",
    sortorder: "false", // newest first
  });
  const data = await zohoFetch(
    `/api/accounts/${accountId}/messages/view?${params}`,
    apiDomain,
    accessToken
  );
  return (data.data || []).map((m: any) => ({
    messageId: m.messageId,
    folderId: m.folderId || folderId,
    subject: m.subject || "(no subject)",
    sender: m.sender || m.fromAddress || "unknown",
    senderEmail: m.fromAddress,
    receivedTime: Number(m.receivedTime ?? m.receivedtime),
    summary: m.summary || "",
    unread: m.status === "0" || m.status === 0, // Zoho: status "0" = unread, "1" = read
    hasAttachment: !!m.hasAttachment,
  }));
}

// Searches across the whole mailbox (not scoped to one folder) using
// Zoho's search syntax — free text gets wrapped as entire:<query>,
// which matches anywhere in the email (subject, body, sender, etc).
// See https://www.zoho.com/mail/help/search-syntax.html for the full
// syntax if more targeted search (subject:, sender:, etc) is wanted later.
export async function searchMessages(
  query: string,
  opts?: { start?: number; limit?: number }
): Promise<MailListItem[]> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  const params = new URLSearchParams({
    searchKey: `entire:${query}`,
    start: String(opts?.start ?? 1),
    limit: String(opts?.limit ?? 25),
  });
  const data = await zohoFetch(
    `/api/accounts/${accountId}/messages/search?${params}`,
    apiDomain,
    accessToken
  );
  // NOTE: the search endpoint's response uses lowercase `receivedtime`
  // (vs `receivedTime` on /messages/view) per Zoho's docs — handled
  // via the `??` fallback above in the shared mapping below.
  return (data.data || []).map((m: any) => ({
    messageId: m.messageId,
    folderId: m.folderId,
    subject: m.subject || "(no subject)",
    sender: m.sender || m.fromAddress || "unknown",
    senderEmail: m.fromAddress,
    receivedTime: Number(m.receivedTime ?? m.receivedtime),
    summary: m.summary || "",
    unread: m.status === "0" || m.status === 0,
    hasAttachment: !!m.hasAttachment,
  }));
}

export async function getMessageContent(folderId: string, messageId: string): Promise<string> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  const data = await zohoFetch(
    `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
    apiDomain,
    accessToken
  );
  return data.data?.content || "";
}

export async function markMessageRead(folderId: string, messageId: string): Promise<void> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  await zohoFetch(`/api/accounts/${accountId}/updatemessage`, apiDomain, accessToken, {
    method: "PUT",
    body: JSON.stringify({ mode: "markAsRead", messageId: [messageId] }),
  });
}

export async function sendMessage(params: {
  to: string;
  subject: string;
  content: string;
  fromAddress: string;
}): Promise<void> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  await zohoFetch(`/api/accounts/${accountId}/messages`, apiDomain, accessToken, {
    method: "POST",
    body: JSON.stringify({
      fromAddress: params.fromAddress,
      toAddress: params.to,
      subject: params.subject,
      content: params.content,
      mailFormat: "html",
    }),
  });
}

// Reply and forward both go through this same endpoint, distinguished
// by the `action` field — confirmed against Zoho's docs for reply;
// "forward" as the action value follows the same documented pattern
// but is a slightly more confident guess than the reply case, since I
// didn't find a forward-specific example to cross-check against.
export async function sendReplyOrForward(params: {
  messageId: string;
  action: "reply" | "forward";
  fromAddress: string;
  to: string;
  subject: string;
  content: string;
}): Promise<void> {
  const { accessToken, apiDomain, accountId } = await getValidAccessToken();
  await zohoFetch(
    `/api/accounts/${accountId}/messages/${params.messageId}`,
    apiDomain,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        fromAddress: params.fromAddress,
        toAddress: params.to,
        subject: params.subject,
        content: params.content,
        action: params.action,
      }),
    }
  );
}
