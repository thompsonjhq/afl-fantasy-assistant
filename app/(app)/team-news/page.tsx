'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { InjuryEntry, TeamSelectionChange } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusBadgeClass(returning: string) {
  const note = returning.toLowerCase()
  if (note.includes('season')) return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (note.includes('test')) return 'border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400'
  return ''
}

export default function TeamNewsPage() {
  const [injuries, setInjuries] = useState<InjuryEntry[]>([])
  const [selectionChanges, setSelectionChanges] = useState<TeamSelectionChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/team-news')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Failed to load team news')
        setInjuries(data.injuries || [])
        setSelectionChanges(data.selectionChanges || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load team news'))
      .finally(() => setLoading(false))
  }, [])

  const filteredInjuries = injuries.filter((entry) => {
    if (!search.trim()) return true
    const needle = search.trim().toLowerCase()
    return entry.playerName.toLowerCase().includes(needle) || entry.club.toLowerCase().includes(needle)
  })

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Team news</h2>
        <p className="text-sm text-muted-foreground">League-wide injuries and team selection changes, scraped from footywire.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Injury list ({filteredInjuries.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player or club"
              className="h-8 w-56 pl-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredInjuries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No injuries found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Injury</TableHead>
                  <TableHead>Returning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInjuries.map((entry) => (
                  <TableRow key={`${entry.playerName}-${entry.club}`}>
                    <TableCell className="font-medium text-foreground">{entry.playerName}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.club}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.injuryType || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(entry.returning)}>
                        {entry.returning || 'Unknown'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent selection changes</CardTitle>
        </CardHeader>
        <CardContent>
          {selectionChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No selection changes found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead className="text-right">Round</TableHead>
                  <TableHead>Ins</TableHead>
                  <TableHead>Outs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectionChanges.map((change) => (
                  <TableRow key={`${change.club}-${change.season}-${change.round}`}>
                    <TableCell className="font-medium text-foreground">{change.club}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{change.round}</TableCell>
                    <TableCell className="text-emerald-600">{change.ins.join(', ') || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{change.outs.join(', ') || '-'}</TableCell>
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
