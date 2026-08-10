'use client'

import { useState } from 'react'

interface StepResult {
  step: string
  [key: string]: unknown
}

function summariseStep(step: StepResult): string {
  switch (step.step) {
    case 'sync':
      return step.success ? `Squad synced (${step.synced} players)` : `Squad sync failed: ${step.error || 'unknown error'}`
    case 'backfill-game-logs':
      if (step.error) return `Game log backfill failed: ${step.error}`
      return `Game logs: ${step.totalRowsUpserted} rows across ${step.totalPlayers} players (${step.batches} batches)`
    case 'sync-injuries':
      return step.success
        ? `Injuries: ${step.injuriesScraped} scraped, ${step.selectionChangesScraped} selection changes, ${step.squadPlayersFlaggedInjured} of your squad flagged`
        : `Injury sync failed: ${step.error || 'unknown error'}`
    case 'build-model':
      return step.success
        ? `Model refit: n=${step.sampleSize}, R²=${step.rSquared}`
        : `Model fit failed: ${step.error || 'unknown error'}`
    default:
      return JSON.stringify(step)
  }
}

export default function UpdateAllPanel() {
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<StepResult[]>([])
  const [error, setError] = useState('')

  async function runUpdateAll() {
    setRunning(true)
    setError('')
    setSteps([])

    try {
      const res = await fetch('/api/update-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Update failed')
      }

      setSteps(data.steps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Update All Data</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Squad sync, real match-log backfill, injuries/selections, model refit — one call.
          </p>
        </div>

        <button
          onClick={runUpdateAll}
          disabled={running}
          className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          {running && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {running ? 'Updating…' : 'Update All'}
        </button>
      </div>

      <div className="px-4 py-3 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
        Footywire blocks scraping from Vercel&apos;s servers — the match-log and injury steps only
        pull real data when this is run from <code className="bg-amber-100 px-1 rounded">npm run dev</code> on
        your own machine (pointed at the same database). On the deployed site, only the squad sync
        and model refit steps will do anything.
      </div>

      {running && (
        <div className="px-4 py-3 text-xs text-blue-600 animate-pulse">
          Running — the backfill step is deliberately slow (polite delay between requests), this can take a few minutes for a full squad.
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50">{error}</div>
      )}

      {steps.length > 0 && !running && (
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {steps.map((step, index) => (
            <div key={`${step.step}-${index}`} className="text-xs text-gray-700">
              <span className="font-semibold text-gray-900">{step.step}:</span> {summariseStep(step)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
