'use client'

import { useCallback, useEffect, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useSquad } from '@/lib/squad-context'
import type { ModelAccuracySummary } from '@/lib/modelAccuracy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ModelAccuracyPage() {
  const { players, round, loading: squadLoading } = useSquad()
  const [summaries, setSummaries] = useState<ModelAccuracySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotting, setSnapshotting] = useState(false)
  const [error, setError] = useState('')

  const loadSummaries = useCallback(() => {
    setLoading(true)
    fetch('/api/model-accuracy')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Failed to load model accuracy')
        setSummaries(data.summaries || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load model accuracy'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummaries()
  }, [loadSummaries])

  async function snapshotCurrentRound() {
    if (players.length === 0) return

    setSnapshotting(true)

    try {
      const res = await fetch('/api/snapshot-projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, round }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Snapshot failed')

      toast.success(`Snapshotted ${data.upserted} projections for Round ${round}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Snapshot failed')
    } finally {
      setSnapshotting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Model accuracy</h2>
          <p className="text-sm text-muted-foreground">
            Compares each round&apos;s projection against the real final score once it&apos;s in, so the heuristic and the
            fitted regression (once it has enough training data) can be judged on real results rather than trusted blindly.
            Builds up round by round - snapshot before each round locks.
          </p>
        </div>
        <Button
          onClick={snapshotCurrentRound}
          disabled={snapshotting || squadLoading || players.length === 0}
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
        >
          <Camera className={`h-3.5 w-3.5 ${snapshotting ? 'animate-pulse' : ''}`} />
          {snapshotting ? 'Snapshotting…' : `Snapshot Round ${round}`}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accuracy by model</CardTitle>
          <Button onClick={loadSummaries} disabled={loading} variant="ghost" size="sm" className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32" />
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed rounds with a snapshot yet. Snapshot the current round above, then check back once it&apos;s final.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Rounds scored</TableHead>
                  <TableHead className="text-right">MAE</TableHead>
                  <TableHead className="text-right">Bias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow key={summary.modelVersion}>
                    <TableCell className="font-medium capitalize text-foreground">{summary.modelVersion}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{summary.games}</TableCell>
                    <TableCell className="text-right">{summary.mae}</TableCell>
                    <TableCell className={`text-right ${summary.bias > 0 ? 'text-emerald-600' : summary.bias < 0 ? 'text-destructive' : ''}`}>
                      {summary.bias > 0 ? '+' : ''}{summary.bias}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
