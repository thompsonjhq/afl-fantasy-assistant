import { supabase } from '@/lib/supabase'
import { DEFAULT_PROJECTION_SETTINGS, ProjectionSettings } from '@/lib/projections'

/** Reads the singleton projection_settings row. Falls back to DEFAULT_PROJECTION_SETTINGS
 * (today's exact hardcoded behavior) if the row doesn't exist yet - e.g. migration 009 hasn't
 * been run, or its seed insert hasn't landed - so this never breaks projections, it just can't
 * be tuned yet. */
export async function getProjectionSettings(): Promise<ProjectionSettings> {
  const { data, error } = await supabase
    .from('projection_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle()

  if (error || !data) return DEFAULT_PROJECTION_SETTINGS

  return {
    formSensitivity: Number(data.form_sensitivity ?? 1),
    opponentSensitivity: Number(data.opponent_sensitivity ?? 1),
    matchupWeight: Number(data.matchup_weight ?? 1),
    roleSecurityWeight: Number(data.role_security_weight ?? 1),
    injuryCaution: Number(data.injury_caution ?? 1),
  }
}

export async function saveProjectionSettings(settings: ProjectionSettings): Promise<void> {
  const { error } = await supabase
    .from('projection_settings')
    .upsert(
      {
        singleton: true,
        form_sensitivity: settings.formSensitivity,
        opponent_sensitivity: settings.opponentSensitivity,
        matchup_weight: settings.matchupWeight,
        role_security_weight: settings.roleSecurityWeight,
        injury_caution: settings.injuryCaution,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'singleton' }
    )

  if (error) throw error
}
