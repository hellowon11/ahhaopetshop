-- Milo → D001, Lucky → D003 (swap; use temp ids because pet_id is unique)

update public.favourites set pet_id = 'D001__tmp' where pet_id = 'D001';
update public.favourites set pet_id = 'D001' where pet_id = 'D003';
update public.favourites set pet_id = 'D003' where pet_id = 'D001__tmp';

update public.shop_pets set pet_id = 'D001__tmp' where pet_id = 'D001' and name = 'Lucky';
update public.shop_pets set pet_id = 'D001' where pet_id = 'D003' and name = 'Milo';
update public.shop_pets set pet_id = 'D003' where pet_id = 'D001__tmp' and name = 'Lucky';
