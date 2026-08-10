-- Run once in the Supabase SQL editor, after 002_fix_game_log_uniqueness.sql.
--
-- player_name alone isn't a safe uniqueness key for injuries: multiple real AFL players can
-- share a name (confirmed for real - Max King plays for both St Kilda and Sydney), which
-- crashed the upsert with "ON CONFLICT DO UPDATE command cannot affect row a second time"
-- during the first live sync-injuries run. Re-keying on (player_name, club) instead.

alter table injury_list drop constraint if exists injury_list_player_name_key;

alter table injury_list add constraint injury_list_player_name_club_key
  unique (player_name, club);
