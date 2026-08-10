'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Player } from '@/types'

interface SquadContextValue {
  players: Player[]
  round: number
  syncing: boolean
  projecting: boolean
  loading: boolean
  reloadKey: number
  setRound: (round: number) => void
  syncFromAFL: () => Promise<void>
  handleSquadChange: (players: Player[]) => void
  handleScoresSaved: () => void
  refetchSquad: () => Promise<void>
}

const SquadContext = createContext<SquadContextValue | null>(null)

export interface PlayerRow {
  id: string
  name: string
  team: string
  position: string
  position2: string | null
  avg_score: number
  last_score: number
  total_points: number
  injured: boolean
  injury_note: string | null
  scores: number[] | null
  score_rounds: number[] | null
  lineup_position: string | null
  is_captain: boolean | null
  is_vice_captain: boolean | null
  last3_avg: number | null
  last5_avg: number | null
  high_score: number | null
  low_score: number | null
  games_played: number | null
}

export function mapRow(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    team: row.team,
    position: row.position,
    position2: row.position2 || '',
    avgScore: row.avg_score,
    lastScore: row.last_score,
    totalPoints: row.total_points,
    injured: row.injured,
    injuryNote: row.injury_note || '',
    scores: row.scores || [],
    scoreRounds: row.score_rounds || [],
    lineupPosition: row.lineup_position || 'BENCH',
    isCaptain: row.is_captain || false,
    isViceCaptain: row.is_vice_captain || false,
    last3Avg: row.last3_avg || undefined,
    last5Avg: row.last5_avg || undefined,
    highScore: row.high_score || undefined,
    lowScore: row.low_score || undefined,
    gamesPlayed: row.games_played || undefined,
  }
}

export function SquadProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [round, setRoundState] = useState(9)
  const [syncing, setSyncing] = useState(false)
  const [projecting, setProjecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const refreshProjections = useCallback(async (squad: Player[], selectedRound: number) => {
    if (squad.length === 0) {
      setPlayers([])
      return
    }

    setProjecting(true)

    try {
      const res = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: squad, round: selectedRound }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Projection failed')

      const projectedById = new Map<string, Player>((data.projections || []).map((p: Player) => [p.id, p]))
      setPlayers(squad.map((player) => projectedById.get(player.id) || player))
    } catch (error) {
      console.error('Projection refresh error:', error)
      setPlayers(squad)
    } finally {
      setProjecting(false)
    }
  }, [])

  const fetchAndProjectSquad = useCallback(async (selectedRound: number) => {
    const { data, error } = await supabase.from('players').select('*').order('position', { ascending: true })

    if (error) {
      console.error('Error loading squad:', error)
      return
    }

    const squad = ((data || []) as PlayerRow[]).map(mapRow)
    await refreshProjections(squad, selectedRound)
  }, [refreshProjections])

  const loadSquad = useCallback(async (selectedRound: number) => {
    setLoading(true)
    await fetchAndProjectSquad(selectedRound)
    setLoading(false)
  }, [fetchAndProjectSquad])

  useEffect(() => {
    // Standard fetch-on-mount - only run once, subsequent squad changes go through
    // handleSquadChange/reloadKey instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAndProjectSquad(round).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRound = useCallback((value: number) => {
    setRoundState(value)
    refreshProjections(players, value)
  }, [players, refreshProjections])

  const handleSquadChange = useCallback((nextPlayers: Player[]) => {
    refreshProjections(nextPlayers, round)
  }, [refreshProjections, round])

  async function syncFromAFL() {
    setSyncing(true)

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        toast.success(`Synced ${data.synced} players from AFL Fantasy`)
        setReloadKey((value) => value + 1)
        await loadSquad(round)
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync error:', err)
      toast.error('Network error during sync - see console for details')
    } finally {
      setSyncing(false)
    }
  }

  function handleScoresSaved() {
    setReloadKey((value) => value + 1)
    toast.success('Scores saved')
    loadSquad(round)
  }

  const refetchSquad = useCallback(() => loadSquad(round), [loadSquad, round])

  return (
    <SquadContext.Provider
      value={{ players, round, syncing, projecting, loading, reloadKey, setRound, syncFromAFL, handleSquadChange, handleScoresSaved, refetchSquad }}
    >
      {children}
    </SquadContext.Provider>
  )
}

export function useSquad() {
  const context = useContext(SquadContext)
  if (!context) throw new Error('useSquad must be used within a SquadProvider')
  return context
}
