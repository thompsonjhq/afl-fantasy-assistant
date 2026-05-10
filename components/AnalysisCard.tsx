'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

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
  title: string
  description: string
  icon: string
  type: 'strengths' | 'projections' | 'freeagents' | 'trades' | 'captain'
  players: object[]
  round: number
  freeAgents?: object[]
}

export default function AnalysisCard({
  title,
  description,
  icon,
  type,
  players,
  round,
  freeAgents = [],
}: AnalysisCardProps) {
  const [result, setResult] = useState<string>('')
  const [projections, setProjections] = useState<ProjectionResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setResult('')
    setProjections([])

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || players.length === 0}
          className="shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Analysing...' : 'Analyse'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          Asking the AI coach...
        </div>
      )}

      {type === 'projections' && projections.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {projections.map((projection, index) => (
              <div key={projection.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">#{index + 1}</div>
                    <div className="truncate text-sm font-semibold text-gray-900">{projection.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">{projection.projectedScore}</div>
                    <div className="text-xs text-gray-500">{projection.projectionLow}-{projection.projectionHigh}</div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">{projection.projectionConfidence} confidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="analysis-content border-t border-gray-100 pt-4 text-gray-700 text-sm leading-relaxed">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}