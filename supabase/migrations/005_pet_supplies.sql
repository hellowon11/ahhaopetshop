-- Pet supplies catalogue (portfolio showcase + admin CRUD)
create table if not exists public.pet_supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('dog-food', 'cat-food', 'treats', 'toys', 'accessories')),
  description text not null default '',
  price numeric(10,2) not null,
  display_price text not null,
  image_url text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_supplies_category_idx on public.pet_supplies(category);
create index if not exists pet_supplies_active_idx on public.pet_supplies(active);

drop trigger if exists pet_supplies_updated_at on public.pet_supplies;
create trigger pet_supplies_updated_at before update on public.pet_supplies
  for each row execute function public.set_updated_at();

alter table public.pet_supplies enable row level security;

create policy "pet_supplies_public_read" on public.pet_supplies
  for select using (true);
create policy "pet_supplies_admin_insert" on public.pet_supplies
  for insert with check (public.is_admin());
create policy "pet_supplies_admin_update" on public.pet_supplies
  for update using (public.is_admin());
create policy "pet_supplies_admin_delete" on public.pet_supplies
  for delete using (public.is_admin());

grant select, insert, update, delete on table public.pet_supplies to anon, authenticated;

insert into public.pet_supplies (name, category, description, price, display_price, image_url, sort_order)
select v.name, v.category, v.description, v.price, v.display_price, v.image_url, v.sort_order
from (values
  ('Crunchy Dog Biscuits', 'treats', 'Oven-baked biscuits for everyday rewards and training.', 18::numeric, 'RM 18', '/imgs/supplies-dog-biscuits.jpg', 1),
  ('Pedigree Biscrok', 'dog-food', 'Crunchy dog biscuits for everyday snacks and training rewards.', 65::numeric, 'RM 65', '/imgs/supplies-dog-food.jpg', 2),
  ('Whiskas Adult', 'cat-food', 'Complete dry food with chicken — made for adult cats.', 55::numeric, 'RM 55', '/imgs/supplies-cat-food.jpg', 3),
  ('Soft Cat Treats', 'treats', 'Soft bite-sized snacks cats love between meals.', 15::numeric, 'RM 15', '/imgs/supplies-cat-treats.jpg', 4),
  ('Play Rope & Ball Set', 'toys', 'Durable rope toy and bounce ball for active playtime.', 28::numeric, 'RM 28', '/imgs/supplies-dog-toys.jpg', 5),
  ('Feather Wand & Mouse', 'toys', 'Interactive wand and plush mouse for curious cats.', 22::numeric, 'RM 22', '/imgs/supplies-cat-toys.jpg', 6)
) as v(name, category, description, price, display_price, image_url, sort_order)
where not exists (select 1 from public.pet_supplies limit 1);
