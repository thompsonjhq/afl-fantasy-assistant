import { NextRequest, NextResponse } from 'next/server'
import { getProjectionSettings, saveProjectionSettings } from '@/lib/projectionSettings'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import type { ProjectionSettings } from '@/lib/projections'

export async function GET() {
  try {
    const settings = await getProjectionSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('projection-settings GET error:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = (await request.json()) as ProjectionSettings
    await saveProjectionSettings(settings)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('projection-settings POST error:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
