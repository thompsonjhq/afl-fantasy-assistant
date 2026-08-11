-- Run once in the Supabase SQL editor, after 006_projection_snapshots.sql.
--
-- lib/scrapers/footywireGameLog.ts already parses every column off footywire's per-player
-- games-log table (K/HB/M/G/B/T/HO/GA/I50/CL/CG/R50/FF/FA/BL) to compute fantasy_points, but
-- only fantasy_points/disposals/goals were ever persisted - the rest were discarded after the
-- formula ran. Widening the table so the score-source breakdown feature (lib/scoreBreakdown.ts)
-- can bucket a player's own real points by stat type instead of estimating. Existing rows will
-- have nulls here until re-backfilled via the existing /api/backfill-game-logs route.

alter table player_game_logs add column if not exists kicks numeric;
alter table player_game_logs add column if not exists handballs numeric;
alter table player_game_logs add column if not exists marks numeric;
alter table player_game_logs add column if not exists behinds numeric;
alter table player_game_logs add column if not exists tackles numeric;
alter table player_game_logs add column if not exists hitouts numeric;
alter table player_game_logs add column if not exists goal_assists numeric;
alter table player_game_logs add column if not exists inside_50s numeric;
alter table player_game_logs add column if not exists clearances numeric;
alter table player_game_logs add column if not exists clangers numeric;
alter table player_game_logs add column if not exists rebound_50s numeric;
alter table player_game_logs add column if not exists frees_for numeric;
alter table player_game_logs add column if not exists frees_against numeric;
alter table player_game_logs add column if not exists bounces numeric;
