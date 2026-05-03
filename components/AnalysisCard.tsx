'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, players, round, freeAgents }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setResult(data.content)
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

      {result && (
        <div className="analysis-content border-t border-gray-100 pt-4 text-gray-700 text-sm leading-relaxed">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}