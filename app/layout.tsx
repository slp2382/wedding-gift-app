import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GiftLink cards",
    template: "%s  GiftLink cards",
  },
  description:
    "Smart wedding and occasion cards with QR links that let guests send cash directly to the couple",
  metadataBase: new URL("https://giftlink.cards"),
  openGraph: {
    title: "GiftLink cards",
    description:
      "Smart wedding and occasion cards with QR links replacing cash envelopes",
    url: "https://giftlink.cards",
    siteName: "GiftLink cards",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GiftLink cards",
    description:
      "Smart wedding and occasion cards with QR links replacing cash envelopes",
  },
  icons: {
    icon: [
      // If you put app/favicon.ico
      { url: "/favicon.ico" },

      // If instead you have app/favicon.png, add this and update the file name
      // { url: "/favicon.png", type: "image/png" },
    ],
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
