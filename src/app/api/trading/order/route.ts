import { NextRequest, NextResponse } from "next/server";
import { AlpacaError } from "@/lib/alpaca";
import { alpacaClosePosition, alpacaSubmitBracketOrder } from "@/lib/alpacaTrading";

interface OrderBody {
  symbol?: unknown;
  qty?: unknown;
  takeProfitPrice?: unknown;
  stopLossPrice?: unknown;
}

export async function POST(req: NextRequest) {
  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { symbol, qty, takeProfitPrice, stopLossPrice } = body;
  if (typeof symbol !== "string" || !/^[A-Z0-9.\-]{1,12}$/.test(symbol.trim().toUpperCase())) {
    return NextResponse.json({ error: "Missing or invalid 'symbol'" }, { status: 400 });
  }
  if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "'qty' must be a positive number" }, { status: 400 });
  }
  if (typeof takeProfitPrice !== "number" || !Number.isFinite(takeProfitPrice) || takeProfitPrice <= 0) {
    return NextResponse.json({ error: "'takeProfitPrice' must be a positive number" }, { status: 400 });
  }
  if (typeof stopLossPrice !== "number" || !Number.isFinite(stopLossPrice) || stopLossPrice <= 0) {
    return NextResponse.json({ error: "'stopLossPrice' must be a positive number" }, { status: 400 });
  }
  if (stopLossPrice >= takeProfitPrice) {
    return NextResponse.json({ error: "'stopLossPrice' must be below 'takeProfitPrice'" }, { status: 400 });
  }

  try {
    const order = await alpacaSubmitBracketOrder({
      symbol: symbol.trim().toUpperCase(),
      qty,
      takeProfitPrice,
      stopLossPrice,
    });
    return NextResponse.json(order);
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error submitting order" },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Missing or invalid 'symbol' query param" }, { status: 400 });
  }
  try {
    await alpacaClosePosition(symbol);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof AlpacaError ? err.status ?? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : `Unknown error closing ${symbol}` },
      { status }
    );
  }
}
