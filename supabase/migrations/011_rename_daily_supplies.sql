-- Rename placeholder supply names to real-ish brand labels
update public.pet_supplies
set
  name = 'Pedigree Biscrok',
  description = 'Crunchy dog biscuits for everyday snacks and training rewards.'
where name = 'Daily Dog Food';

update public.pet_supplies
set
  name = 'Whiskas Adult',
  description = 'Complete dry food with chicken — made for adult cats.'
where name = 'Daily Cat Food';
