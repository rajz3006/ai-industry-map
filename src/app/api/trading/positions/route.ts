import { NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { alpacaGetPositions } from "@/lib/alpacaTrading";

// No caching here (unlike /api/trading/account): unrealized P/L is the number the user is
// actively watching while deciding whether to close a position, so it should always be fresh.
export async function GET() {
  try {
    const positions = await alpacaGetPositions();
    return NextResponse.json({ positions });
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error fetching positions" },
      { status }
    );
  }
}
