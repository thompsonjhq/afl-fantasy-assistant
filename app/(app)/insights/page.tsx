'use client'

import { Trophy, BarChart3, UserPlus, Repeat, Star } from 'lucide-react'
import { useSquad } from '@/lib/squad-context'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnalysisCard from '@/components/AnalysisCard'

const ANALYSIS_FEATURES = [
  {
    type: 'strengths' as const,
    title: 'Strengths & Weaknesses',
    description: 'Injury risks, team deficiencies and overall health of your squad',
    icon: Trophy,
  },
  {
    type: 'projections' as const,
    title: 'Projected Scores',
    description: 'Statistical projections explained by AI',
    icon: BarChart3,
  },
  {
    type: 'freeagents' as const,
    title: 'Free Agent Targets',
    description: 'Best available players compared against your squad',
    icon: UserPlus,
  },
  {
    type: 'trades' as const,
    title: 'Trade Recommendations',
    description: 'Smart trade options to improve your team value and scoring',
    icon: Repeat,
  },
  {
    type: 'captain' as const,
    title: 'Captain & Lineup',
    description: 'Optimal captain pick and starting side for this round',
    icon: Star,
  },
]

export default function InsightsPage() {
  const { players, round, loading } = useSquad()

  if (loading) return <Skeleton className="h-96" />

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Load your squad first to run AI analysis.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue={ANALYSIS_FEATURES[0].type}>
      <TabsList className="flex-wrap">
        {ANALYSIS_FEATURES.map((feature) => (
          <TabsTrigger key={feature.type} value={feature.type} className="gap-1.5">
            <feature.icon className="h-3.5 w-3.5" />
            {feature.title}
          </TabsTrigger>
        ))}
      </TabsList>

      {ANALYSIS_FEATURES.map((feature) => (
        <TabsContent key={feature.type} value={feature.type}>
          <Card>
            <CardContent className="pt-6">
              <AnalysisCard type={feature.type} description={feature.description} players={players} round={round} />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}
