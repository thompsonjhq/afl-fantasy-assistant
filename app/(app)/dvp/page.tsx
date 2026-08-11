'use client'

import { useEffect, useState } from 'react'
import type { TeamMatchupProfile } from '@/lib/matchups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const POSITIONS = ['DEF', 'MID', 'RUC', 'FWD'] as const
type Position = (typeof POSITIONS)[number]

export default function DvpStatsPage() {
  const [profiles, setProfiles] = useState<TeamMatchupProfile[]>([])
  const [position, setPosition] = useState<Position>('MID')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/dvp')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Failed to load DVP stats')
        setProfiles(data.profiles || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load DVP stats'))
      .finally(() => setLoading(false))
  }, [])

  const ranked = profiles
    .filter((profile) => profile.position === position)
    .sort((a, b) => b.pointsConcededVsExpected - a.pointsConcededVsExpected)

  if (loading) return <Skeleton className="h-96" />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Defense vs Position</h2>
        <p className="text-sm text-muted-foreground">
          How many fantasy points each team has conceded to a position versus what those opponents were expected to score.
          Positive = soft matchup, negative = tough matchup. This is the same profile the projection engine uses as its
          &quot;Matchup&quot; factor.
        </p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Ranked by matchup difficulty</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Tabs value={position} onValueChange={(value) => setPosition(value as Position)}>
            <TabsList>
              {POSITIONS.map((option) => (
                <TabsTrigger key={option} value={option}>{option}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matchup profiles for {position} yet - run the matchup builder for this season first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead className="text-right">Avg conceded</TableHead>
                  <TableHead className="text-right">Avg expected</TableHead>
                  <TableHead className="text-right">Vs expected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((profile, index) => (
                  <TableRow key={profile.team}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium text-foreground">{profile.team}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{profile.games}</TableCell>
                    <TableCell className="text-right">{profile.avgScoreConceded}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{profile.avgExpectedScore}</TableCell>
                    <TableCell className={`text-right font-semibold ${profile.pointsConcededVsExpected >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {profile.pointsConcededVsExpected >= 0 ? '+' : ''}{profile.pointsConcededVsExpected}
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
