-- Run once in the Supabase SQL editor, after 001_real_data_foundation.sql.
--
-- (player_name, season, round) turned out not to be a safe uniqueness key: AFL sometimes
-- schedules two fixtures under the same round label in one season (e.g. rescheduled/make-up
-- games - confirmed for real in 2025, Gold Coast played two "Round 24" fixtures). Re-keying
-- on footywire's own match id instead. Truncating first since the backfill run so far only
-- has partial data with no match_id on existing rows - safe to just re-run the backfill after this.

truncate table player_game_logs;

alter table player_game_logs add column if not exists match_id int;

alter table player_game_logs drop constraint if exists player_game_logs_player_name_season_round_key;

alter table player_game_logs add constraint player_game_logs_player_name_season_match_id_key
  unique (player_name, season, match_id);
