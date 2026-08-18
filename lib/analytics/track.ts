import { sql } from "@/lib/earn/db";

export async function recordPageView(params: {
  visitorId: string;
  ip: string | null;
  path: string;
  referrer: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
}): Promise<void> {
  await sql`
    insert into page_views (visitor_id, ip, path, referrer, user_agent, country, city)
    values (${params.visitorId}, ${params.ip}, ${params.path}, ${params.referrer}, ${params.userAgent}, ${params.country}, ${params.city})
  `;
}
