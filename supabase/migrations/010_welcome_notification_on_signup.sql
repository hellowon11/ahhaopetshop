-- Create Welcome notification when a new auth user (profile) is created.
-- Security definer so it works before the user has a confirmed session.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  welcome_name text;
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;

  welcome_name := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'there');

  insert into public.notifications (user_id, title, message, type)
  select
    new.id,
    'Welcome to AH HAO PET SHOP!',
    format(
      'Hi %s! Thanks for joining. Book grooming, browse our pets, and enjoy member discounts anytime.',
      welcome_name
    ),
    'welcome'
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = new.id
      and n.type = 'welcome'
      and n.is_deleted = false
  );

  return new;
end;
$$;

-- Backfill existing members who never got a welcome
insert into public.notifications (user_id, title, message, type)
select
  p.id,
  'Welcome to AH HAO PET SHOP!',
  format(
    'Hi %s! Thanks for joining. Book grooming, browse our pets, and enjoy member discounts anytime.',
    coalesce(nullif(trim(p.name), ''), 'there')
  ),
  'welcome'
from public.profiles p
where p.role = 'user'
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = p.id
      and n.type = 'welcome'
      and n.is_deleted = false
  );
