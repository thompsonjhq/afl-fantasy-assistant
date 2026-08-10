'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Player } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ScoreLogModalProps {
  players: Player[]
  round: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function ScoreLogModal({ players, round, open, onOpenChange, onSaved }: ScoreLogModalProps) {
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(
    players.map((player) => {
      const roundIndex = player.scoreRounds?.findIndex((value) => value === round) ?? -1
      const existingScore = roundIndex >= 0 ? player.scores?.[roundIndex] : player.lastScore || ''
      return [player.id, existingScore ? String(existingScore) : '']
    })
  ))
  const [saving, setSaving] = useState(false)

  async function saveScores() {
    setSaving(true)

    const payload = Object.entries(scores)
      .map(([playerId, value]) => ({ playerId, round, score: Number(value) }))
      .filter((entry) => Number.isFinite(entry.score) && entry.score >= 0)

    try {
      const res = await fetch('/api/round-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: payload }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save scores')

      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Round {round} Scores</DialogTitle>
          <DialogDescription>Saved scores update last score, averages, form and projections.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border">
          {players.map((player) => (
            <label key={player.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{player.name}</div>
                <div className="text-xs text-muted-foreground">
                  {player.position}{player.position2 ? `/${player.position2}` : ''} · Avg {player.avgScore}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                value={scores[player.id] || ''}
                onChange={(e) => setScores((current) => ({ ...current, [player.id]: e.target.value }))}
                className="w-20 text-right"
                placeholder="0"
              />
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={saveScores} disabled={saving}>{saving ? 'Saving…' : 'Save Scores'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
