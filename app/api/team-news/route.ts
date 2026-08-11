import { NextResponse } from 'next/server'
import { getAllInjuries, getLatestSelectionChanges } from '@/lib/teamNews'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'

export async function GET() {
  try {
    const [injuries, selectionChanges] = await Promise.all([
      getAllInjuries(),
      getLatestSelectionChanges(),
    ])

    return NextResponse.json({ success: true, injuries, selectionChanges })
  } catch (error) {
    console.error('team-news API error:', error)

    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
