import { sql } from "@/lib/earn/db";

export type Summary = {
  totalViews: number;
  uniqueIps: number;
  uniqueVisitors: number;
};

export async function getSummary(days: number): Promise<Summary> {
  const rows = await sql`
    select
      count(*)::int as total_views,
      count(distinct ip)::int as unique_ips,
      count(distinct visitor_id)::int as unique_visitors
    from page_views
    where created_at > now() - (${days} || ' days')::interval
  `;
  const r = rows[0] as any;
  return { totalViews: r.total_views, uniqueIps: r.unique_ips, uniqueVisitors: r.unique_visitors };
}

export async function getTopPages(days: number, limit = 20) {
  return sql`
    select path, count(*)::int as views
    from page_views
    where created_at > now() - (${days} || ' days')::interval
    group by path
    order by views desc
    limit ${limit}
  ` as unknown as Promise<{ path: string; views: number }[]>;
}

export async function getTopReferrers(days: number, limit = 20) {
  return sql`
    select coalesce(nullif(referrer, ''), 'direct') as referrer, count(*)::int as views
    from page_views
    where created_at > now() - (${days} || ' days')::interval
    group by referrer
    order by views desc
    limit ${limit}
  ` as unknown as Promise<{ referrer: string; views: number }[]>;
}

export async function getTopLocations(days: number, limit = 20) {
  return sql`
    select
      coalesce(country, 'unknown') as country,
      coalesce(city, 'unknown') as city,
      count(*)::int as views
    from page_views
    where created_at > now() - (${days} || ' days')::interval
    group by country, city
    order by views desc
    limit ${limit}
  ` as unknown as Promise<{ country: string; city: string; views: number }[]>;
}

export type VisitorRow = {
  ip: string;
  country: string | null;
  city: string | null;
  views: number;
  first_seen: string;
  last_seen: string;
  paths: string[];
};

// The core ask: "see people's IP going and browsing multiple times
// and what" — one row per IP, how many times, first/last seen, and
// every distinct path they hit.
export async function getVisitors(days: number, limit = 100) {
  return sql`
    select
      ip,
      max(country) as country,
      max(city) as city,
      count(*)::int as views,
      min(created_at) as first_seen,
      max(created_at) as last_seen,
      array_agg(distinct path) as paths
    from page_views
    where created_at > now() - (${days} || ' days')::interval
      and ip is not null
    group by ip
    order by views desc
    limit ${limit}
  ` as unknown as Promise<VisitorRow[]>;
}
