-- Run once in the Supabase SQL editor, after 004_team_matchup_profiles.sql.
--
-- Advanced per-match stats scraped from footywire's ft_match_statistics?mid=<id>&advv=1 page
-- (see lib/scrapers/footywireAdvancedStats.ts). That page reports both teams' full match
-- rosters in one fetch, so this is keyed on (player_name, season, match_id) to match the
-- existing player_game_logs re-key from 002_fix_game_log_uniqueness.sql. Names on that page
-- are truncated ("S Coniglio") and resolved back to the full player_name used elsewhere
-- before insert - rows that can't be resolved to exactly one player are skipped, not guessed.
--
-- No literal centre-bounce-attendance count exists anywhere on footywire; centre_clearances
-- is the closest available proxy for centre-bounce trust/role.

create table if not exists player_advanced_stats (
  id bigint generated always as identity primary key,
  player_name text not null,
  team text,
  opponent text,
  season int not null,
  match_id int not null,
  tog_pct numeric,
  contested_possessions numeric,
  uncontested_possessions numeric,
  effective_disposals numeric,
  disposal_efficiency_pct numeric,
  contested_marks numeric,
  goal_assists numeric,
  marks_inside_50 numeric,
  one_percenters numeric,
  bounces numeric,
  centre_clearances numeric,
  stoppage_clearances numeric,
  score_involvements numeric,
  metres_gained numeric,
  turnovers numeric,
  intercepts numeric,
  tackles_inside_50 numeric,
  scraped_at timestamptz default now(),
  unique (player_name, season, match_id)
);

create index if not exists idx_player_advanced_stats_player on player_advanced_stats (player_name);
create index if not exists idx_player_advanced_stats_team on player_advanced_stats (team);
