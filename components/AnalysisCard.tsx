'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FreeAgentComparison } from '@/lib/freeAgents'
import FreeAgentComparisonTable from '@/components/FreeAgentComparisonTable'

interface ProjectionResult {
  id: string
  name: string
  projectedScore: number
  projectionLow: number
  projectionHigh: number
  projectionConfidence: 'Low' | 'Medium' | 'High'
  projectionReason: string
}

interface AnalysisCardProps {
  description: string
  type: 'strengths' | 'projections' | 'freeagents' | 'trades' | 'captain'
  players: object[]
  round: number
  freeAgents?: object[]
}

export default function AnalysisCard({ description, type, players, round, freeAgents = [] }: AnalysisCardProps) {
  const [result, setResult] = useState<string>('')
  const [projections, setProjections] = useState<ProjectionResult[]>([])
  const [comparisons, setComparisons] = useState<FreeAgentComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setResult('')
    setProjections([])
    setComparisons([])

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, players, round, freeAgents }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setResult(data.content)
      setProjections(data.projections || [])
      setComparisons(data.comparisons || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button onClick={runAnalysis} disabled={loading || players.length === 0} className="shrink-0 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? 'Analysing…' : 'Analyse'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Asking the AI coach…
        </div>
      )}

      {type === 'projections' && projections.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {projections.map((projection, index) => (
              <div key={projection.id} className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    <div className="truncate text-sm font-semibold text-foreground">{projection.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{projection.projectedScore}</div>
                    <div className="text-xs text-muted-foreground">{projection.projectionLow}-{projection.projectionHigh}</div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{projection.projectionConfidence} confidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'freeagents' && comparisons.length > 0 && (
        <div className="border-t border-border pt-4">
          <FreeAgentComparisonTable comparisons={comparisons} />
        </div>
      )}

      {result && (
        <div className="analysis-content border-t border-border pt-4 text-sm leading-relaxed text-foreground">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
