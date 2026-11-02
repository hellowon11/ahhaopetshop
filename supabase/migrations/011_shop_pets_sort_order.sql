-- Display order for shop pets (independent of stable business pet_id)
alter table public.shop_pets
  add column if not exists sort_order integer;

-- Backfill from current pet_id catalogue order so existing pages keep the same sequence
with ordered as (
  select id, row_number() over (order by pet_id asc) as rn
  from public.shop_pets
)
update public.shop_pets sp
set sort_order = ordered.rn
from ordered
where sp.id = ordered.id
  and (sp.sort_order is null or sp.sort_order = 0);

alter table public.shop_pets
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists shop_pets_sort_order_idx on public.shop_pets(sort_order);
