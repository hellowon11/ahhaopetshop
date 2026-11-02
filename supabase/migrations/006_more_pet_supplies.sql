-- Allow accessories category + seed 6 more portfolio items
alter table public.pet_supplies drop constraint if exists pet_supplies_category_check;
alter table public.pet_supplies
  add constraint pet_supplies_category_check
  check (category in ('dog-food', 'cat-food', 'treats', 'toys', 'accessories'));

insert into public.pet_supplies (name, category, description, price, display_price, image_url, sort_order)
select v.name, v.category, v.description, v.price, v.display_price, v.image_url, v.sort_order
from (values
  ('Wet Dog Food Cans', 'dog-food', 'Savory wet meals — great as a topper or full serving.', 12::numeric, 'RM 12', '/imgs/supplies-wet-dog-food.jpg', 7),
  ('Dental Chew Sticks', 'treats', 'Crunchy chews that help keep teeth cleaner between brushings.', 24::numeric, 'RM 24', '/imgs/supplies-dental-chews.jpg', 8),
  ('Clumping Cat Litter', 'accessories', 'Low-dust clumping litter for a fresher litter box.', 32::numeric, 'RM 32', '/imgs/supplies-cat-litter.jpg', 9),
  ('Steel Bowl Set', 'accessories', 'Durable stainless food & water bowls for daily feeding.', 35::numeric, 'RM 35', '/imgs/supplies-bowls.jpg', 10),
  ('Collar & Leash Set', 'accessories', 'Soft adjustable collar with matching leash for walks.', 45::numeric, 'RM 45', '/imgs/supplies-collar-leash.jpg', 11),
  ('Gentle Pet Shampoo', 'accessories', 'Mild shampoo with soft brush — for a clean, calm bath time.', 38::numeric, 'RM 38', '/imgs/supplies-shampoo.jpg', 12)
) as v(name, category, description, price, display_price, image_url, sort_order)
where not exists (
  select 1 from public.pet_supplies s where s.name = v.name
);
