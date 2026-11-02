-- Count capacity for every hour a booking occupies (start + duration), not only start time.
-- Example: 3-hour Full Grooming at 11:00 uses 11:00, 12:00, and 13:00.

create or replace function public.get_slot_bookings(p_date text)
returns table(slot_time text, booked_count bigint)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    lpad(slot_h::text, 2, '0') || ':00' as slot_time,
    (
      select count(*)::bigint
      from public.appointments a
      where a.date = p_date
        and a.status = 'Booked'
        and slot_h >= split_part(a.time, ':', 1)::int
        and slot_h < split_part(a.time, ':', 1)::int
          + greatest(1, ceil(coalesce(a.duration, 1))::int)
    ) as booked_count
  from generate_series(10, 21) as slot_h;
$fn$;

grant execute on function public.get_slot_bookings(text) to anon, authenticated;
