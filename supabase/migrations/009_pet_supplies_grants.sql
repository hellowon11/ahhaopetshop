-- pet_supplies was created after the initial grants; API roles need explicit access.
-- Also nudge PostgREST to refresh its schema cache.

grant select, insert, update, delete on table public.pet_supplies to anon, authenticated;

notify pgrst, 'reload schema';
