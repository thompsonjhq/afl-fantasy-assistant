import { NextResponse } from 'next/server'

// Temporary diagnostic route - not part of the real app, remove once the footywire fetch issue is diagnosed.
export async function GET() {
  const url = 'https://www.footywire.com/afl/footy/pg-adelaide-crows--darcy-fogarty?year=2024'

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; afl-fantasy-assistant/1.0; +https://github.com)' },
      cache: 'no-store',
    })

    const text = await res.text()

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      bodyLength: text.length,
      hasGamesLog: text.includes('Games Log for'),
      snippet: text.slice(0, 500),
      headers: Object.fromEntries(res.headers.entries()),
    })
  } catch (error) {
    return NextResponse.json({
      threw: true,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
