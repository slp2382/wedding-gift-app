// lib/siteUrl.ts

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getServerSiteUrl(): string {
  const url =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.GIFTLINK_BASE_URL ||
    "https://www.giftlink.cards";

  return normalizeBaseUrl(url);
}

export function getPublicSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.GIFTLINK_BASE_URL ||
    "https://www.giftlink.cards";

  return normalizeBaseUrl(url);
}

export function absoluteUrl(path: string, baseUrl?: string): string {
  const base = normalizeBaseUrl(baseUrl || getServerSiteUrl());
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
