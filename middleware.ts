import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "gl_admin_session";

function padBase64(base64: string) {
  const padLen = (4 - (base64.length % 4)) % 4;
  return base64 + "=".repeat(padLen);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(base64Url: string) {
  const base64 = padBase64(base64Url.replace(/-/g, "+").replace(/_/g, "/"));
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, data: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifySessionToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const payloadB64 = parts[0];
  const sigB64 = parts[1];

  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;

  try {
    payloadBytes = base64UrlToBytes(payloadB64);
    sigBytes = base64UrlToBytes(sigB64);
  } catch {
    return false;
  }

  const expectedSig = await hmacSha256(secret, payloadB64);
  if (!timingSafeEqual(sigBytes, expectedSig)) return false;

  let payload: { exp?: number } | null = null;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return false;
  }

  const exp = typeof payload?.exp === "number" ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);

  return exp > now;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/api/admin/login") return NextResponse.next();
  if (pathname === "/api/admin/logout") return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "ADMIN_SESSION_SECRET is missing" },
        { status: 500 },
      );
    }
    return new NextResponse("Admin auth is not configured", { status: 500 });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const ok = token ? await verifySessionToken(token, secret) : false;

  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
