-- Seed shop pets (local public/imgs paths). Run in SQL Editor once.
-- Images are served by Vite from /imgs/...

insert into public.shop_pets (pet_id, name, breed, age, gender, image_url, type, description, is_for_sale, status)
values
  ('D001', 'Milo', 'Pomeranian', '12 years', 'Male', '/imgs/Pomeranian_12 Years Old.jpg', 'dog', null, true, 'Listed'),
  ('D002', 'Cookie', 'Corgi', '1 month', 'Female', '/imgs/Corgi_Age_1 months.jpg', 'dog', null, true, 'Listed'),
  ('D003', 'Lucky', 'Golden Retriever', '2 months', 'Male', '/imgs/Golden Retriever_2 months.jpeg', 'dog', null, true, 'Listed'),
  ('D004', 'Max', 'Chihuahua', '2 months', 'Male', '/imgs/Chihuahua male.jpg', 'dog', null, true, 'Listed'),
  ('D005', 'Storm', 'Husky', '2 months', 'Female', '/imgs/Husky_2 Months.jpg', 'dog', null, true, 'Listed'),
  ('D006', 'Bella', 'Pomeranian', '2 months', 'Female', '/imgs/Pomeranian_2 Months.jpg', 'dog', null, true, 'Listed'),
  ('D007', 'Charlie', 'Pomeranian', '3 months', 'Male', '/imgs/Pomeranian_3 Months.jpg', 'dog', null, true, 'Listed'),
  ('D008', 'Coco', 'Shih Tzu', '3 months', 'Female', '/imgs/Shih Tzu_3 Months.jpg', 'dog', null, true, 'Listed'),
  ('C001', 'Luna', 'Persian Cat', '1 year', 'Female', '/imgs/Persian cat_1 years old.jpg', 'cat', null, true, 'Listed'),
  ('C002', 'Snow', 'British Shorthair', '2 months', 'Female', '/imgs/British Shorthair_2 Months.jpg', 'cat', null, true, 'Listed'),
  ('C003', 'Oliver', 'Scottish Fold', '3 months', 'Male', '/imgs/Scottish Fold.jpg', 'cat', null, true, 'Listed'),
  ('C004', 'Lily', 'Abyssinian', '2 years', 'Female', '/imgs/Abyssinian_2 Years old_Female.jpg', 'cat', null, true, 'Listed'),
  ('C005', 'Daisy', 'British Shorthair', '1 month', 'Female', '/imgs/golden British Shorthair_1 Months_Female.jpg', 'cat', null, true, 'Listed')
on conflict (pet_id) do nothing;
