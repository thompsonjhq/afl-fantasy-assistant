-- Run once in the Supabase SQL editor, after 005_player_advanced_stats.sql.
--
-- Snapshot of what the projection engine said *before* a round locked, so accuracy can be
-- measured against player_game_logs.fantasy_points once the round is final. Not retroactive:
-- historical factor inputs for already-completed rounds weren't recorded, so this only starts
-- building a track record from the round it's first deployed. model_version lets the heuristic
-- chain and the fitted OLS regression (lib/model.ts, projection_model_coefficients) be compared
-- side by side once the regression has enough training rows to activate.

create table if not exists projection_snapshots (
  id bigint generated always as identity primary key,
  season int not null,
  round int not null,
  player_name text not null,
  model_version text not null,
  projected_score numeric not null,
  projection_low numeric,
  projection_high numeric,
  factors jsonb,
  created_at timestamptz default now(),
  unique (season, round, player_name, model_version)
);

create index if not exists idx_projection_snapshots_season_round
  on projection_snapshots (season, round);
