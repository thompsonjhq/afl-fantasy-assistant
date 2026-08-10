import { NextResponse } from 'next/server'
import { fitProjectionModel } from '@/lib/model'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'

export async function POST() {
  try {
    const fitted = await fitProjectionModel()

    return NextResponse.json({
      success: true,
      ...fitted,
    })
  } catch (error) {
    console.error('build-model error:', error)

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
