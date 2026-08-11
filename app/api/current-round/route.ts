import { NextResponse } from 'next/server'
import { getCurrentRound } from '@/lib/afl'

const CURRENT_YEAR = new Date().getFullYear()

export async function GET() {
  const round = await getCurrentRound(CURRENT_YEAR)

  if (round === null) {
    return NextResponse.json({ success: false, error: 'Could not determine current round' }, { status: 502 })
  }

  return NextResponse.json({ success: true, round })
}
