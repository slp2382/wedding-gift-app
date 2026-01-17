"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "gl_shop_qty_discount_popup_v1";

function nowMs() {
  return Date.now();
}

function readSuppressUntil(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { suppressUntil?: number };
    if (!parsed?.suppressUntil) return null;
    return Number(parsed.suppressUntil) || null;
  } catch {
    return null;
  }
}

function writeSuppressDays(days: number) {
  const suppressUntil = nowMs() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ suppressUntil }));
}

export default function QuantityDiscountModal() {
  const [open, setOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  const canShow = () => {
    const until = readSuppressUntil();
    if (!until) return true;
    return until <= nowMs();
  };

  const close = (days = 45) => {
    try {
      writeSuppressDays(days);
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canShow()) return;

    const t = window.setTimeout(() => {
      if (hasOpenedRef.current) return;
      if (!canShow()) return;
      hasOpenedRef.current = true;
      setOpen(true);
    }, 5000);

    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canShow()) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (hasOpenedRef.current) return;
      if (!canShow()) return;
      if (e.clientY > 0) return;
      hasOpenedRef.current = true;
      setOpen(true);
    };

    document.addEventListener("mouseout", onMouseLeave);
    return () => document.removeEventListener("mouseout", onMouseLeave);
  }, []);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const backdropStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
  };

  const cardStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    background: "#ffffff",
    borderRadius: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    border: "1px solid rgba(186,230,253,0.9)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    padding: 20,
    background: "linear-gradient(135deg, rgba(186,230,253,0.35), rgba(241,245,249,0.35))",
  };

  const bodyStyle: React.CSSProperties = {
    padding: 20,
  };

  const pillStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#0369a1",
    marginBottom: 10,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  };

  const textStyle: React.CSSProperties = {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 14,
    color: "rgba(15,23,42,0.78)",
    lineHeight: 1.5,
  };

  const listStyle: React.CSSProperties = {
    marginTop: 14,
    marginBottom: 0,
    paddingLeft: 18,
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.6,
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid rgba(15,23,42,0.15)",
    background: "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
  };

  const primaryStyle: React.CSSProperties = {
    ...buttonStyle,
    border: "1px solid rgba(3,105,161,0.25)",
    background: "#0369a1",
    color: "#ffffff",
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Quantity discounts">
      <button
        type="button"
        aria-label="Close"
        onClick={() => close(45)}
        style={backdropStyle}
      />

      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={pillStyle}>Automatic pricing</div>
          <h3 style={titleStyle}>Quantity discounts apply automatically</h3>
          <p style={textStyle}>
            Mix any designs in your cart. Your per card price updates automatically at checkout.
          </p>
        </div>

        <div style={bodyStyle}>
          <ul style={listStyle}>
            <li>1 to 2 cards: 5.99 each</li>
            <li>3 to 4 cards: 5.49 each</li>
            <li>5 plus cards: 4.99 each</li>
          </ul>

          <div style={actionsStyle}>
            <button type="button" onClick={() => close(45)} style={buttonStyle}>
              Close
            </button>
            <button type="button" onClick={() => close(45)} style={primaryStyle}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
