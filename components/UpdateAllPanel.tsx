'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

  async function runUpdateAll() {
    setRunning(true)
    setSteps([])

    try {
      const res = await fetch('/api/update-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed')

      setSteps(data.steps || [])
      toast.success('Update All finished - see results below')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Update All Data</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Squad sync, real match-log backfill, injuries/selections, model refit — one call.
          </p>
        </div>
        <Button onClick={runUpdateAll} disabled={running} className="gap-1.5 shrink-0">
          <RefreshCw className={running ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {running ? 'Updating…' : 'Update All'}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <p>
            Footywire blocks scraping from Vercel&apos;s servers — the match-log and injury steps only
            pull real data when this is run from <code className="rounded bg-amber-100 px-1">npm run dev</code> on
            your own machine (pointed at the same database). On the deployed site, only the squad sync
            and model refit steps will do anything.
          </p>
        </div>

        {running && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Running — the backfill step is deliberately slow (polite delay between requests), this can take a few minutes for a full squad.
          </p>
        )}

        {steps.length > 0 && !running && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
            {steps.map((step, index) => (
              <div key={`${step.step}-${index}`} className="text-xs text-foreground">
                <span className="font-semibold">{step.step}:</span> {summariseStep(step)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
