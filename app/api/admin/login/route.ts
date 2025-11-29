import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const COOKIE_NAME = "gl_admin_session";
const TTL_SECONDS = 60 * 60 * 12;

function bytesToBase64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSha256(secret: string, data: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function isSafeNext(next: string) {
  return next.startsWith("/admin");
}

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";

  if (!adminPassword || !secret) {
    return NextResponse.json(
      { error: "Admin auth is not configured" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/admin");

  if (password !== adminPassword) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("error", "1");
    if (isSafeNext(nextRaw)) url.searchParams.set("next", nextRaw);
    return NextResponse.redirect(url, { status: 303 });
  }

  const now = Math.floor(Date.now() / 1000);
  const payloadJson = JSON.stringify({ exp: now + TTL_SECONDS });
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(payloadJson));
  const sig = await hmacSha256(secret, payloadB64);
  const token = `${payloadB64}.${bytesToBase64Url(sig)}`;

  const dest = isSafeNext(nextRaw) ? nextRaw : "/admin";
  const res = NextResponse.redirect(new URL(dest, req.url), { status: 303 });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });

  return res;
}
