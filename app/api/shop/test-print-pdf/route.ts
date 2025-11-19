// app/api/shop/test-print-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateGiftlinkInsidePdf } from "@/lib/printTemplate";


export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("cardId") || "card_demo123";

    const pdfBytes = await generateGiftlinkInsidePdf(cardId);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="giftlink-${cardId}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating test print PDF:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
