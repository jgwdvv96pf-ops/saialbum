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
    start: String(opts?.start ?? 0),
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
    receivedTime: Number(m.receivedTime),
    summary: m.summary || "",
    unread: m.status === "0" || m.status === 0, // Zoho: status "0" = unread, "1" = read
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
