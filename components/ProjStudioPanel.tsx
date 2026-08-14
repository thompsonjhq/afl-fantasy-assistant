'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_PROJECTION_SETTINGS, ProjectionSettings } from '@/lib/projections'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'

const SLIDERS: Array<{ key: keyof ProjectionSettings; label: string; description: string }> = [
  {
    key: 'formSensitivity',
    label: 'Form sensitivity',
    description: 'How much recent form can swing a projection away from season average. Higher = more reactive to hot/cold streaks.',
  },
  {
    key: 'opponentSensitivity',
    label: 'Opponent sensitivity',
    description: 'How much the specific opponent can swing a projection. Higher = matchup matters more.',
  },
  {
    key: 'matchupWeight',
    label: 'DVP / matchup weight',
    description: 'How much the Defense-vs-Position profile (see DVP Stats) nudges a projection.',
  },
  {
    key: 'roleSecurityWeight',
    label: 'Role security weight',
    description: 'How much a rising/falling TOG%/Centre-Clearance trend nudges a projection independent of scoring form.',
  },
  {
    key: 'injuryCaution',
    label: 'Injury caution',
    description: 'How hard an injury cuts a projection. Higher = more conservative on injured players.',
  },
]

export function ProjStudioPanel() {
  const [settings, setSettings] = useState<ProjectionSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/projection-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSettings(data.settings)
        else setSettings(DEFAULT_PROJECTION_SETTINGS)
      })
      .catch(() => setSettings(DEFAULT_PROJECTION_SETTINGS))
  }, [])

  async function save(next: ProjectionSettings) {
    setSaving(true)

    try {
      const res = await fetch('/api/projection-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save')

      toast.success('Projection settings saved - refresh Projections to see the effect.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return <Skeleton className="h-64" />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Proj Studio</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tune the weights behind the projection engine. Every slider defaults to 1.0 - today&apos;s exact behavior.
            Pair changes with Model Accuracy above: snapshot a round, wait for it to complete, then check if MAE improved.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => { setSettings(DEFAULT_PROJECTION_SETTINGS); save(DEFAULT_PROJECTION_SETTINGS) }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {SLIDERS.map((slider) => (
          <div key={slider.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{slider.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{settings[slider.key].toFixed(2)}x</span>
            </div>
            <Slider
              value={[settings[slider.key]]}
              min={0}
              max={2}
              step={0.05}
              onValueChange={([value]) => setSettings({ ...settings, [slider.key]: value })}
            />
            <p className="text-xs text-muted-foreground">{slider.description}</p>
          </div>
        ))}

        <Button onClick={() => save(settings)} disabled={saving} className="gap-1.5 self-start">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
