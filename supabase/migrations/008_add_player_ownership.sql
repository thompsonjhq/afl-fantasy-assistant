-- Run once in the Supabase SQL editor, after 007_widen_game_log_raw_stats.sql.
--
-- rosteredPercentage/startingPercentage already come back from the AFL Fantasy Draft API
-- (lib/aflFantasy.ts's AFLFantasyPlayer type) but were previously dropped before reaching the
-- players table or the Player type the UI renders - this makes the data actually reach the UI.

alter table players add column if not exists rostered_percentage numeric;
alter table players add column if not exists starting_percentage numeric;
